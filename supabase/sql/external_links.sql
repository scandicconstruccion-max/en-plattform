-- ============================================================================
-- external_links — ÉN tabell for koblinger mot eksterne regnskapssystemer
-- ----------------------------------------------------------------------------
-- Erstatter kolonner per system. I dag har vi tripletex_customer_id på
-- customers, tripletex_id på projects, tripletex_entry_id på timesheet_entries
-- og tripletex_employee_id på employees — pluss synced_at og sync_error der det
-- finnes. Neste system (Fiken, PowerOffice, Visma) ville gitt tre nye
-- kolonnesett på hver tabell.
--
-- DEL 1 av 2. Denne filen oppretter tabellen, RLS, RPC-en og kopierer de
-- eksisterende radene. Edge Functions skriver etter dette BÅDE hit og til de
-- gamle kolonnene. Appen leser fortsatt de gamle kolonnene — lesingen flyttes
-- i DEL 2, etter at dobbeltskrivingen er verifisert.
--
-- De gamle kolonnene DROPPES IKKE nå. De står som sikkerhetsnett gjennom første
-- prod-utrulling og fjernes som egen migrering senere.
--
-- KJØRES I BEGGE PROSJEKTER:
--   En Plattform – Utvikling  actefthtojooqxkdhbkb   ← først, test her
--   En Plattform (produksjon) zffzvvtuycjbrdybajwu   ← etter verifisering
-- Verifiser prosjekt-id i URL-en før Run. Kjør HELE filen i ett stykke.
--
-- Additiv: ingenting slettes, ingenting endres. Kjøres den to ganger, skjer
-- ingenting den andre gangen.
-- ============================================================================


-- ── 0) FORUTSETNINGER ───────────────────────────────────────────────────────
-- Alt vi antar om skjemaet sjekkes her, én gang, med tydelig feilmelding.
-- Slår én av dem til, stopper HELE filen før noe er opprettet. Det er billigere
-- enn en halvveis migrering.
do $$
declare
  t     text;
  k     text;
  mangler text := '';
begin
  -- entity_id blir uuid. Da må alle fire tabellene ha uuid som primærnøkkel.
  foreach t in array array['customers', 'projects', 'employees', 'timesheet_entries'] loop
    select data_type into k
      from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name = 'id';
    if k is null then
      raise exception 'Tabellen public.% har ingen id-kolonne.', t;
    elsif k <> 'uuid' then
      raise exception 'external_links krever at public.%.id er uuid, men den er %. Stopper — entity_id ville fått feil type.', t, k;
    end if;
  end loop;

  -- Backfillen trenger company_id på hver kildetabell.
  foreach t in array array['customers', 'projects', 'employees', 'timesheet_entries'] loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t and column_name = 'company_id'
    ) then
      mangler := mangler || t || ' ';
    end if;
  end loop;
  if mangler <> '' then
    raise exception 'Disse tabellene mangler company_id og kan ikke backfilles direkte: %. Si fra — backfillen må da utlede bedriften via en annen vei.', mangler;
  end if;

  -- RPC-en under kaller disse. Finnes de ikke, vil den feile ved kjøretid.
  if to_regprocedure('public.auth_company_id()') is null then
    raise exception 'public.auth_company_id() finnes ikke. Kjør sak A-oppsettet først.';
  end if;
  if to_regprocedure('public.is_platform_owner()') is null then
    raise exception 'public.is_platform_owner() finnes ikke.';
  end if;
  if to_regprocedure('public.auth_role()') is null then
    raise exception 'public.auth_role() finnes ikke. RPC-en under bruker den til rollesjekken.';
  end if;
end $$;


-- ── 1) DUPLIKATSJEKK FØR BACKFILL ───────────────────────────────────────────
-- Den unike skranken på external_id finnes ikke i dag, så det er ingenting som
-- hindrer at to av våre rader peker på samme objekt i Tripletex. Har vi slike,
-- ville «on conflict do nothing» stilltiende hoppet over dem. Vi vil vite det.
do $$
declare r record; n int := 0;
begin
  for r in
        select 'customer'        as et, company_id, tripletex_customer_id::text as eid, count(*) as antall
          from public.customers          where tripletex_customer_id is not null
         group by 1, 2, 3 having count(*) > 1
    union all
        select 'project',        company_id, tripletex_id::text,          count(*)
          from public.projects           where tripletex_id is not null
         group by 1, 2, 3 having count(*) > 1
    union all
        select 'employee',       company_id, tripletex_employee_id::text, count(*)
          from public.employees          where tripletex_employee_id is not null
         group by 1, 2, 3 having count(*) > 1
    union all
        select 'timesheet_entry', company_id, tripletex_entry_id::text,   count(*)
          from public.timesheet_entries  where tripletex_entry_id is not null
         group by 1, 2, 3 having count(*) > 1
  loop
    raise warning 'DUPLIKAT: % med ekstern id % finnes på % rader i bedrift %', r.et, r.eid, r.antall, r.company_id;
    n := n + 1;
  end loop;
  if n > 0 then
    raise exception 'Fant % duplikat(er) — se advarslene over. Rett dem for hånd og kjør filen på nytt.', n;
  end if;
end $$;


-- ── 2) TABELLEN ─────────────────────────────────────────────────────────────
create table if not exists public.external_links (
  id           bigint generated always as identity primary key,
  company_id   uuid        not null references public.company_settings(id) on delete cascade,
  provider     text        not null,          -- 'tripletex' | 'fiken' | 'poweroffice' | 'visma'
  entity_type  text        not null,          -- 'customer' | 'project' | 'employee' | 'timesheet_entry'
  entity_id    uuid        not null,          -- vår rad
  -- text, ikke bigint: Tripletex, Fiken og PowerOffice bruker tall, men Visma
  -- bruker GUID-er. En migrering av typen senere er verre enn litt parsing nå.
  external_id  text,                          -- null = forsøkt, men ikke koblet (se sync_error)
  -- Alt et system trenger å huske utover selve koblingen. I dag:
  --   { "synced_hours": 7.5 }  for timesheet_entry — antall timer vi FAKTISK
  --   sendte, brukt til å oppdage at timen er endret hos oss etterpå.
  -- Uten dette ville hvert nye system gitt en ny kolonne.
  metadata     jsonb,
  synced_at    timestamptz,
  sync_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.external_links is
  'Koblinger mellom våre rader og objekter i eksterne regnskapssystemer. Erstatter kolonner per system.';

-- Én kobling per rad per system.
create unique index if not exists external_links_entitet_uniq
  on public.external_links (company_id, provider, entity_type, entity_id);

-- To av VÅRE rader skal ikke kunne peke på samme objekt hos leverandøren.
-- Partiell: rader uten external_id er mislykkede forsøk og skal kunne finnes flere av.
create unique index if not exists external_links_ekstern_uniq
  on public.external_links (company_id, provider, entity_type, external_id)
  where external_id is not null;

-- Appen henter alle koblinger for én bedrift og én type om gangen (DEL 2).
create index if not exists external_links_oppslag_idx
  on public.external_links (company_id, provider, entity_type);


-- ── 3) RLS ──────────────────────────────────────────────────────────────────
-- Nettleseren må LESE denne (synk-merkene i lister og skjemaer), i motsetning
-- til company_integrations som er helt stengt. Skriving går utelukkende gjennom
-- Edge Functions som service_role, og gjennom RPC-en i punkt 4.
alter table public.external_links enable row level security;

revoke all on public.external_links from anon, authenticated;
grant select on public.external_links to authenticated;

drop policy if exists external_links_sel on public.external_links;
create policy external_links_sel on public.external_links
  for select to authenticated
  using (company_id = public.auth_company_id());


-- ── 4) ANSATTKOBLINGEN ──────────────────────────────────────────────────────
-- Dette er den ENESTE koblingen som settes fra nettleseren i dag
-- (App.jsx: employees.tripletex_employee_id, nedtrekket i DEL 3-oppsettet).
-- Den flyttes hit i stedet for å åpne tabellen for skriving fra klienten.
-- Bedriften kommer ALDRI fra kalleren — alltid fra auth_company_id().
create or replace function public.sett_ekstern_kobling_ansatt(
  p_employee_id uuid,
  p_external_id text,
  p_provider    text default 'tripletex'
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_company uuid;
begin
  if not (public.is_platform_owner() or coalesce(public.auth_role(), '') in ('admin', 'leder')) then
    raise exception 'Ikke autorisert';
  end if;

  v_company := public.auth_company_id();
  if v_company is null then
    raise exception 'Fant ingen aktiv bedrift';
  end if;

  -- Ansatten må tilhøre bedriften vi står i. Ellers kunne en admin koblet en
  -- annen bedrifts ansatt ved å sende inn en fremmed id.
  if not exists (
    select 1 from public.employees
     where id = p_employee_id and company_id = v_company
  ) then
    raise exception 'Ansatt finnes ikke i denne bedriften';
  end if;

  if p_external_id is null or btrim(p_external_id) = '' then
    delete from public.external_links
     where company_id = v_company and provider = p_provider
       and entity_type = 'employee' and entity_id = p_employee_id;
    -- Speiles til den gamle kolonnen så lenge dobbeltskrivingen varer.
    update public.employees set tripletex_employee_id = null where id = p_employee_id;
    return;
  end if;

  insert into public.external_links (company_id, provider, entity_type, entity_id, external_id, synced_at)
  values (v_company, p_provider, 'employee', p_employee_id, btrim(p_external_id), now())
  on conflict (company_id, provider, entity_type, entity_id)
  do update set external_id = excluded.external_id,
                synced_at   = excluded.synced_at,
                sync_error  = null,
                updated_at  = now();

  if p_provider = 'tripletex' then
    update public.employees
       set tripletex_employee_id = nullif(btrim(p_external_id), '')::bigint
     where id = p_employee_id;
  end if;
end
$function$;

revoke all on function public.sett_ekstern_kobling_ansatt(uuid, text, text) from public, anon;
grant execute on function public.sett_ekstern_kobling_ansatt(uuid, text, text) to authenticated, service_role;


-- ── 5) BACKFILL ─────────────────────────────────────────────────────────────
-- Idempotent. Kjøres filen på nytt, gjør denne ingenting.
insert into public.external_links (company_id, provider, entity_type, entity_id, external_id, synced_at)
select company_id, 'tripletex', 'customer', id, tripletex_customer_id::text, null
  from public.customers
 where tripletex_customer_id is not null and company_id is not null
on conflict (company_id, provider, entity_type, entity_id) do nothing;

insert into public.external_links (company_id, provider, entity_type, entity_id, external_id, synced_at, sync_error)
select company_id, 'tripletex', 'project', id, tripletex_id::text, tripletex_synced_at, tripletex_sync_error
  from public.projects
 where tripletex_id is not null and company_id is not null
on conflict (company_id, provider, entity_type, entity_id) do nothing;

insert into public.external_links (company_id, provider, entity_type, entity_id, external_id, synced_at)
select company_id, 'tripletex', 'employee', id, tripletex_employee_id::text, null
  from public.employees
 where tripletex_employee_id is not null and company_id is not null
on conflict (company_id, provider, entity_type, entity_id) do nothing;

insert into public.external_links (company_id, provider, entity_type, entity_id, external_id, synced_at, sync_error, metadata)
select company_id, 'tripletex', 'timesheet_entry', id, tripletex_entry_id::text,
       tripletex_synced_at, tripletex_sync_error,
       case when tripletex_synced_hours is not null
            then jsonb_build_object('synced_hours', tripletex_synced_hours) end
  from public.timesheet_entries
 where tripletex_entry_id is not null and company_id is not null
on conflict (company_id, provider, entity_type, entity_id) do nothing;


-- ── 6) FASIT ────────────────────────────────────────────────────────────────
-- Sammenlikner antall koblinger i de gamle kolonnene med antall rader i den nye
-- tabellen. Er de ulike, har backfillen mistet noe, og da skal vi vite det nå.
do $$
declare v_gammelt int; v_nytt int;
begin
  select (select count(*) from public.customers         where tripletex_customer_id is not null)
       + (select count(*) from public.projects          where tripletex_id           is not null)
       + (select count(*) from public.employees         where tripletex_employee_id  is not null)
       + (select count(*) from public.timesheet_entries where tripletex_entry_id     is not null)
    into v_gammelt;
  select count(*) into v_nytt from public.external_links where provider = 'tripletex';

  raise notice 'external_links: % rader kopiert, % koblinger i gamle kolonner.', v_nytt, v_gammelt;
  if v_nytt <> v_gammelt then
    raise warning 'AVVIK: % mot %. Sannsynligvis rader uten company_id. Sjekk før DEL 2 rulles ut.', v_nytt, v_gammelt;
  end if;
end $$;


-- ── 7) LA POSTGREST SE DEN NYE TABELLEN OG FUNKSJONEN ───────────────────────
notify pgrst, 'reload schema';
