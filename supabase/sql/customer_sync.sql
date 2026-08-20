-- ============================================================
-- Tripletex fase 1(b): kundesynk + statusfiks + synk-logg
-- ------------------------------------------------------------
-- Kjøres i Supabase SQL Editor. KUN «En Plattform – Utvikling» først, ikke prod.
-- Alt er ADDITIVT — sletter/endrer ingenting eksisterende data.
-- Forutsetter at fase 1(a) (company_integrations.sql) allerede er kjørt.
-- ============================================================

-- 1) Ekstern ID på kunde: Tripletex sin kunde-id lagres på vår kunde.
alter table public.customers
  add column if not exists tripletex_customer_id bigint;

-- 2) Tredelt status på integrasjonen (fiks #2): 'not_configured' | 'connected' | 'failed'
alter table public.company_integrations
  add column if not exists connection_status text not null default 'not_configured';

-- 3) Oppdater hjelpefunksjonene så status følger SISTE resultat.
--    (Erstatter kroppene fra fase 1a. Grants bevares av CREATE OR REPLACE,
--     men vi låser dem eksplisitt igjen for sikkerhets skyld.)
create or replace function public.tripletex_store_session(
  p_company_id uuid, p_token text, p_expires timestamptz, p_key text
) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.company_integrations set
    session_token_enc     = pgp_sym_encrypt(p_token, p_key),
    session_token_expires = p_expires,
    is_connected          = true,
    connection_status     = 'connected',
    last_status           = 'ok',
    last_error            = null,
    last_verified_at      = now(),
    updated_at            = now()
  where company_id = p_company_id and provider = 'tripletex';
$$;

create or replace function public.tripletex_mark_failed(
  p_company_id uuid, p_error text
) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.company_integrations set
    is_connected      = false,
    connection_status = 'failed',
    last_status       = 'failed',
    last_error        = p_error,
    updated_at        = now()
  where company_id = p_company_id and provider = 'tripletex';
$$;

revoke all on function public.tripletex_store_session(uuid,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.tripletex_mark_failed(uuid,text) from public, anon, authenticated;
grant execute on function public.tripletex_store_session(uuid,text,timestamptz,text) to service_role;
grant execute on function public.tripletex_mark_failed(uuid,text) to service_role;

-- 4) SYNK-LOGG: hvert forsøk logges — hva som ble sendt, resultat og evt. feil.
--    Juridisk viktig: vi må i ettertid kunne se nøyaktig hva som ble sendt til regnskapet.
create table if not exists public.integration_sync_log (
  id               bigint generated always as identity primary key,
  company_id       uuid not null references public.company_settings(id) on delete cascade,
  provider         text not null default 'tripletex',
  operation        text not null,             -- f.eks. 'customer_sync'
  entity_type      text,                      -- f.eks. 'customer'
  entity_id        uuid,                      -- vår kunde-id
  external_id      bigint,                    -- Tripletex-id (når kjent)
  action           text,                      -- 'created' | 'linked_existing' | 'noop' | 'failed'
  request_payload  jsonb,                     -- NØYAKTIG hva vi sendte til Tripletex
  response_summary jsonb,                     -- kort utdrag av svaret
  http_status      int,
  error            text,
  created_at       timestamptz not null default now()
);

-- Logg-tabellen er kun for serveren nå (RLS på, ingen nettleser-tilgang).
-- Lese-policy for admin i UI legges til senere sammen med grensesnittet.
alter table public.integration_sync_log enable row level security;
revoke all on public.integration_sync_log from anon, authenticated;

create index if not exists integration_sync_log_company_created_idx
  on public.integration_sync_log (company_id, created_at desc);
create index if not exists integration_sync_log_entity_idx
  on public.integration_sync_log (entity_type, entity_id);

-- Ferdig: tripletex_customer_id på kunde, tredelt status, oppdaterte funksjoner, synk-logg.
