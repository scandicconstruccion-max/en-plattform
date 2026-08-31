-- ════════════════════════════════════════════════════════════════════════════
-- SIGNUP: PROFIL OPPRETTES AV DATABASEN, IKKE AV FRONTEND
-- ════════════════════════════════════════════════════════════════════════════
-- Bakgrunn: register_new_company ble kun kalt når signUp() ga en session.
-- Med e-postbekreftelse PÅ finnes ingen session på det tidspunktet, så verken
-- company_settings eller user_profiles ble opprettet — stille. To brukere
-- 12.08.2026 falt gjennom der.
--
-- Etter dette scriptet er auth.users-triggeren den som oppretter radene.
-- register_new_company beholdes som reserve og er gjort til en no-op når
-- triggeren allerede har gjort jobben.
--
-- Kjøres i BEGGE prosjekter: prod (zffzvvtuycjbrdybajwu) og dev
-- (actefthtojooqxkdhbkb). Rent additivt — ingen kolonner slettes eller endres.
-- ════════════════════════════════════════════════════════════════════════════


-- ── DEL A: LOGG- OG VARSELTABELLER ─────────────────────────────────────────

create table if not exists public.signup_feil (
  id            bigint generated always as identity primary key,
  user_id       uuid,
  email         text,
  feilmelding   text,
  sqlstate_kode text,
  kontekst      text,          -- 'trigger:handle_new_user' | 'rpc:register_new_company' | 'frontend:*'
  raw_meta      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists signup_feil_created_idx on public.signup_feil (created_at desc);

alter table public.signup_feil enable row level security;
drop policy if exists signup_feil_les on public.signup_feil;
create policy signup_feil_les on public.signup_feil
  for select to authenticated using (public.is_platform_owner());

-- Hvem er allerede varslet om? Uten denne sender 5-minutters-jobben samme
-- varsel hvert femte minutt til noen rydder opp.
create table if not exists public.signup_varsel_sendt (
  user_id   uuid primary key,
  email     text,
  sendt_at  timestamptz not null default now()
);

alter table public.signup_varsel_sendt enable row level security;
drop policy if exists signup_varsel_les on public.signup_varsel_sendt;
create policy signup_varsel_les on public.signup_varsel_sendt
  for select to authenticated using (public.is_platform_owner());


-- ── DEL B: TRIGGER PÅ auth.users ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $handle_new_user$
declare
  v_meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_epost   text  := lower(coalesce(new.email, ''));
  v_navn    text;
  v_bedrift text;
  v_cid     uuid;
  v_inv     public.user_invitations%rowtype;
begin
  -- GRUNNREGEL: denne triggeren skal ALDRI velte en registrering. Alt under
  -- kjører i en subtransaksjon; feiler noe, logges det i signup_feil og
  -- auth-brukeren opprettes likevel. En bruker uten profil kan repareres.
  -- En bruker som aldri fikk konto, kan den ikke.
  begin
    -- Allerede provisjonert (manuell opprydding, gjenkjøring)? Ikke rør noe.
    if exists (select 1 from public.user_profiles where id = new.id) then
      return new;
    end if;

    v_navn := coalesce(
      nullif(btrim(coalesce(v_meta->>'full_name', '')), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    );
    v_bedrift := nullif(btrim(coalesce(v_meta->>'company_name', '')), '');

    if v_bedrift is not null then
      ------------------------------------------------------------------
      -- A) SELVREGISTRERING — brukeren eier en ny bedrift.
      --    Samme felter og defaults som register_new_company setter:
      --    subscription_status='trial', 15 dagers prøveperiode, role='admin',
      --    module_access og num_users på kolonnedefault.
      ------------------------------------------------------------------
      select id into v_cid
        from public.company_settings
       where created_by = new.id
       order by created_at
       limit 1;

      if v_cid is null then
        insert into public.company_settings
          (name, org_number, email, phone, address,
           subscription_status, trial_start_date, trial_ends_at, created_by,
           hvor_fant_oss, active_modules)
        values
          (v_bedrift,
           nullif(btrim(coalesce(v_meta->>'org_number', '')), ''),
           new.email,
           nullif(btrim(coalesce(v_meta->>'phone', '')), ''),
           nullif(btrim(coalesce(v_meta->>'address', '')), ''),
           'trial', now(), now() + interval '15 days', new.id,
           nullif(btrim(coalesce(v_meta->>'hvor_fant_oss', '')), ''),
           -- Pakkevalget fra registreringsskjemaet. «Kun Kalkulasjon» ble før
           -- satt av frontend rett etter signUp; den koden nås ikke når det
           -- ikke finnes session, så valget leses fra metadata her.
           case when coalesce(v_meta->>'plan', '') = 'kalkyle'
                then '["kalkulator"]'::jsonb
                else '["grunnpakke"]'::jsonb
           end)
        returning id into v_cid;
      end if;

      insert into public.user_profiles
        (id, email, full_name, phone, role, status, company_id)
      values
        (new.id, new.email, v_navn,
         nullif(btrim(coalesce(v_meta->>'phone', '')), ''),
         'admin', 'aktiv', v_cid)
      on conflict (id) do update set
        company_id = coalesce(user_profiles.company_id, excluded.company_id),
        role       = 'admin',
        status     = 'aktiv';

    else
      ------------------------------------------------------------------
      -- B) INVITERT ANSATT — skal IKKE ha egen bedrift.
      --    Uten denne grenen ville hver inviterte kollega fått sin egen
      --    bedrift, som er en verre feil enn den vi retter.
      ------------------------------------------------------------------
      select * into v_inv
        from public.user_invitations
       where lower(email) = v_epost
         and accepted_at is null
         and (expires_at is null or expires_at > now())
       order by created_at desc
       limit 1;

      if found then
        insert into public.user_profiles
          (id, email, full_name, role, status, module_access, company_id, invited_by)
        values
          (new.id, new.email, v_navn,
           coalesce(v_inv.role, 'ansatt'), 'aktiv',
           coalesce(v_inv.module_access, '[]'::jsonb),
           v_inv.company_id, v_inv.invited_by)
        on conflict (id) do nothing;

        update public.user_invitations
           set accepted_at = now()
         where id = v_inv.id and accepted_at is null;
      end if;
      -- Verken bedriftsnavn eller gyldig invitasjon: vi oppretter INGENTING.
      -- Å gjette på en bedrift her ville vært verre enn å la den stå tom.
      -- Brukeren fanges i stedet av 5-minutters-varselet.
    end if;

  exception when others then
    -- Logg og gå videre. Loggraden overlever fordi vi IKKE kaster videre.
    begin
      insert into public.signup_feil
        (user_id, email, feilmelding, sqlstate_kode, kontekst, raw_meta)
      values
        (new.id, new.email, sqlerrm, sqlstate, 'trigger:handle_new_user', v_meta);
    exception when others then
      -- Siste utvei: Postgres-loggen. Aldri velt registreringen.
      raise warning '[handle_new_user] % (%) feilet og kunne ikke logges: %',
        new.id, new.email, sqlerrm;
    end;
  end;

  return new;
end;
$handle_new_user$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- GoTrue kjører som supabase_auth_admin. SECURITY DEFINER endrer hvem
-- funksjonen KJØRER som, ikke hvem som får lov å kalle den.
grant usage   on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;


-- ── DEL C: register_new_company SOM RESERVE, NÅ IDEMPOTENT ─────────────────

create or replace function public.register_new_company(
  p_company_name text,
  p_org_number   text default null,
  p_full_name    text default null,
  p_phone        text default null,
  p_address      text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $register_new_company$
declare
  v_uid      uuid := auth.uid();
  v_email    text;
  v_meta     jsonb;
  v_cid      uuid;
  v_existing uuid;
  v_name     text;
begin
  if v_uid is null then
    raise exception 'Ikke innlogget';
  end if;

  -- KAPPLØPSSPERRE. Triggeren og dette kallet kan treffe samme bruker
  -- samtidig (trigger i signUp-transaksjonen, RPC rett etterpå). Låsen
  -- slippes automatisk når transaksjonen er ferdig.
  perform pg_advisory_xact_lock(hashtext('register_new_company'), hashtext(v_uid::text));

  select company_id into v_existing from public.user_profiles where id = v_uid;
  if v_existing is not null then
    -- Triggeren rakk det først. Fyll bare inn telefon/adresse hvis de mangler
    -- — resten røres ikke.
    update public.company_settings
       set phone      = coalesce(phone,   nullif(btrim(p_phone), '')),
           address    = coalesce(address, nullif(btrim(p_address), '')),
           updated_at = now()
     where id = v_existing
       and (phone is null or address is null);
    return v_existing;                                  -- no-op, ikke dublettfeil
  end if;

  select email, raw_user_meta_data into v_email, v_meta from auth.users where id = v_uid;

  -- HULLET I FORRIGE VERSJON: fantes profilraden med company_id = NULL, lagde
  -- den en NY bedrift selv om triggeren allerede hadde laget én. Nå gjenbrukes
  -- bedriften brukeren står som eier av.
  select id into v_cid
    from public.company_settings
   where created_by = v_uid
   order by created_at
   limit 1;

  if v_cid is null then
    v_name := coalesce(nullif(btrim(p_company_name), ''), v_meta->>'company_name', 'Min bedrift');
    insert into public.company_settings
      (name, org_number, email, phone, address, created_by,
       subscription_status, trial_start_date, trial_ends_at)
    values
      (v_name,
       coalesce(nullif(btrim(p_org_number), ''), v_meta->>'org_number'),
       v_email,
       nullif(btrim(p_phone), ''),
       nullif(btrim(p_address), ''),
       v_uid, 'trial', now(), now() + interval '15 days')
    returning id into v_cid;
  end if;

  insert into public.user_profiles (id, email, full_name, role, status, company_id)
  values
    (v_uid, v_email,
     coalesce(nullif(btrim(p_full_name), ''), v_meta->>'full_name',
              split_part(coalesce(v_email, ''), '@', 1)),
     'admin', 'aktiv', v_cid)
  on conflict (id) do update set
    company_id = coalesce(user_profiles.company_id, excluded.company_id),
    role       = 'admin',
    status     = 'aktiv';

  return v_cid;

exception when others then
  -- MERK: en INSERT i signup_feil her ville blitt rullet tilbake av `raise`
  -- under, siden PostgREST kjører hvert RPC-kall som én transaksjon. Derfor
  -- går denne til Postgres-loggen, som overlever. Frontend logger i tillegg
  -- til signup_feil via logg_signup_feil() — se DEL D.
  raise warning '[register_new_company] bruker=% e-post=% sqlstate=% feil=%',
    v_uid, v_email, sqlstate, sqlerrm;
  raise;                                   -- feilen skal fortsatt nå brukeren
end;
$register_new_company$;


-- ── DEL D: FRONTEND-LOGGING ────────────────────────────────────────────────
-- Kalles fra App.jsx når RPC-en feiler, slik at feilen havner i signup_feil
-- og ikke bare i en rød boks brukeren lukker.

create or replace function public.logg_signup_feil(
  p_kontekst    text,
  p_feilmelding text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $logg_signup_feil$
declare
  v_uid   uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then return; end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.signup_feil (user_id, email, feilmelding, kontekst)
  values (v_uid, v_email,
          left(coalesce(p_feilmelding, ''), 4000),
          left(coalesce(p_kontekst, 'frontend'), 100));
exception when others then
  null;   -- logging skal aldri kunne velte det den logger for
end;
$logg_signup_feil$;

grant execute on function public.logg_signup_feil(text, text) to authenticated;


-- ── DEL E: FORELDRELØSE AUTH-BRUKERE (kilde for 5-minutters-varselet) ──────
-- Edge Function-en kaller denne med service_role. Ligger i databasen fordi
-- auth.admin.listUsers() må pagineres i klienten og ikke kan joine mot
-- user_profiles.

create or replace function public.foreldrelose_auth_brukere(
  p_minutter         int default 5,
  p_maks_alder_timer int default 48
)
returns table (
  id         uuid,
  email      text,
  created_at timestamptz,
  meta       jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $foreldrelose$
  select u.id, u.email, u.created_at, u.raw_user_meta_data
    from auth.users u
    left join public.user_profiles up on up.id = u.id
   where up.id is null
     and u.deleted_at is null
     and coalesce(u.is_anonymous, false) = false
     and u.created_at <  now() - make_interval(mins  => greatest(p_minutter, 0))
     and u.created_at >  now() - make_interval(hours => greatest(p_maks_alder_timer, 1))
   order by u.created_at
$foreldrelose$;

revoke execute on function public.foreldrelose_auth_brukere(int, int) from public, anon, authenticated;
grant  execute on function public.foreldrelose_auth_brukere(int, int) to service_role;
