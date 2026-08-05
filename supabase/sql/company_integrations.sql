-- ============================================================
-- Tripletex-integrasjon: sikret lagring av bedriftens nøkkel
-- ------------------------------------------------------------
-- Kjøres i Supabase SQL Editor (KUN staging zffzvvtuycjbrdybajwu først,
-- deretter prod når det er verifisert).
-- Alt her er ADDITIVT — det sletter eller endrer ingenting som finnes fra før.
-- ============================================================

-- 0) Krypterings-verktøyet pgcrypto (finnes normalt allerede på Supabase).
create extension if not exists pgcrypto with schema extensions;

-- 1) TABELL: én rad per bedrift per leverandør (foreløpig kun 'tripletex').
--    company_id peker på bedriften (company_settings.id = bedriftens id i dette systemet).
create table if not exists public.company_integrations (
  company_id            uuid not null references public.company_settings(id) on delete cascade,
  provider              text not null default 'tripletex',
  environment           text not null default 'test',          -- 'test' | 'prod'
  employee_token_enc    bytea,                                   -- KUNDENS employee-token (kryptert)
  session_token_enc     bytea,                                   -- cachet sesjonstoken (kryptert)
  session_token_expires timestamptz,                             -- når det cachede sesjonstokenet utløper
  is_connected          boolean not null default false,
  last_status           text,                                    -- 'ok' | 'failed' | null
  last_error            text,
  last_verified_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (company_id, provider)
);

-- 2) RLS PÅ, og fjern all tilgang for nettleser-rollene.
--    Ingen policy = ingen tilgang. Kun service_role (Edge Functions) slipper forbi RLS.
--    Dermed kan verken employee-token eller sesjonstoken leses fra nettleseren.
alter table public.company_integrations enable row level security;
revoke all on public.company_integrations from anon, authenticated;

-- 3) HJELPEFUNKSJONER som krypterer/dekrypterer med pgcrypto.
--    Hovednøkkelen (p_key) sendes inn av Edge Function fra en hemmelighet (Deno.env).
--    Nøkkelen lagres ALDRI i databasen. Alle funksjonene er låst til service_role (punkt 4).

-- 3a) Lagre/oppdatere bedriftens employee-token (kryptert).
create or replace function public.tripletex_set_employee_token(
  p_company_id uuid, p_environment text, p_token text, p_key text
) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  insert into public.company_integrations (company_id, provider, environment, employee_token_enc, updated_at)
  values (p_company_id, 'tripletex', coalesce(nullif(p_environment, ''), 'test'),
          pgp_sym_encrypt(p_token, p_key), now())
  on conflict (company_id, provider) do update
    set employee_token_enc = excluded.employee_token_enc,
        environment         = excluded.environment,
        updated_at          = now();
$$;

-- 3b) Hente (dekryptere) employee-token — KUN for serveren.
create or replace function public.tripletex_get_employee_token(
  p_company_id uuid, p_key text
) returns text
language sql security definer set search_path = public, extensions, pg_temp as $$
  select pgp_sym_decrypt(employee_token_enc, p_key)
  from public.company_integrations
  where company_id = p_company_id and provider = 'tripletex' and employee_token_enc is not null;
$$;

-- 3c) Hente cachet sesjonstoken HVIS det fortsatt er gyldig (5 min sikkerhetsmargin).
create or replace function public.tripletex_get_cached_session(
  p_company_id uuid, p_key text
) returns text
language sql security definer set search_path = public, extensions, pg_temp as $$
  select case
    when session_token_enc is not null
     and session_token_expires is not null
     and session_token_expires > now() + interval '5 minutes'
    then pgp_sym_decrypt(session_token_enc, p_key)
    else null
  end
  from public.company_integrations
  where company_id = p_company_id and provider = 'tripletex';
$$;

-- 3d) Lagre nytt sesjonstoken (kryptert) + utløp, og marker som tilkoblet.
create or replace function public.tripletex_store_session(
  p_company_id uuid, p_token text, p_expires timestamptz, p_key text
) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.company_integrations set
    session_token_enc     = pgp_sym_encrypt(p_token, p_key),
    session_token_expires = p_expires,
    is_connected          = true,
    last_status           = 'ok',
    last_error            = null,
    last_verified_at      = now(),
    updated_at            = now()
  where company_id = p_company_id and provider = 'tripletex';
$$;

-- 3e) Registrere en feil (for enkel sporbarhet på raden).
create or replace function public.tripletex_mark_failed(
  p_company_id uuid, p_error text
) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.company_integrations set
    last_status = 'failed', last_error = p_error, updated_at = now()
  where company_id = p_company_id and provider = 'tripletex';
$$;

-- 4) Lås alle funksjonene til KUN service_role (Edge Functions). Ingen andre kan kalle dem.
do $$
declare f text;
begin
  foreach f in array array[
    'public.tripletex_set_employee_token(uuid,text,text,text)',
    'public.tripletex_get_employee_token(uuid,text)',
    'public.tripletex_get_cached_session(uuid,text)',
    'public.tripletex_store_session(uuid,text,timestamptz,text)',
    'public.tripletex_mark_failed(uuid,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated;', f);
    execute format('grant execute on function %s to service_role;', f);
  end loop;
end $$;

-- Ferdig. Tabellen company_integrations + 5 låste hjelpefunksjoner er nå på plass.
