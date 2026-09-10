-- ─────────────────────────────────────────────────────────────────────────────
-- CRM: mapper på dokumenter i kundekortet
-- ─────────────────────────────────────────────────────────────────────────────
-- Dokumentlista på et kundekort er én flat liste. På en kunde med flere tilbud
-- over år blir den uleselig. Dette gir ETT nivå med mapper, opprettet av
-- brukeren selv — ingen standardmapper, ingen mapper i mapper.
--
-- HVORFOR EGEN TABELL, og ikke bare en tekstkolonne på crm_documents:
-- en tekstkolonne gir bare mapper som «finnes» fordi et dokument peker på dem.
-- Da kan man ikke opprette en tom mappe og fylle den etterpå, og en mappe
-- forsvinner i det siste dokumentet flyttes ut. Begge deler er krav her.
--
-- STORAGE RØRES IKKE. Mappen er utelukkende en rad-egenskap: å flytte et
-- dokument mellom mapper er én UPDATE av folder_id. Objektnøkkelen i
-- plattform-files er den samme før og etter, så ingen filer kopieres eller
-- får ny URL.
--
-- ADDITIVT. Oppretter én ny tabell, én ny nullbar kolonne og to indekser.
-- Ingen eksisterende kolonne eller rad endres eller slettes.
--
-- KJØRES I BEGGE PROSJEKTER:
--   «En Plattform»             (produksjon, zffzvvtuycjbrdybajwu)
--   «En Plattform – Utvikling» (actefthtojooqxkdhbkb)

-- ── 1. Tabellen ──────────────────────────────────────────────────────────────
create table if not exists public.crm_document_folders (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  company_id   uuid,
  name         text not null,
  created_by   uuid,
  created_at   timestamptz default now()
);

comment on table public.crm_document_folders is
  'Brukeropprettede mapper for dokumenter på ett CRM-kundekort. Ett nivå, ingen nesting.';

-- Mapper hører til én kunde, så navnet trenger bare være unikt der. lower()
-- gjør at «Tilbud» og «tilbud» regnes som samme mappe — frontend sier fra før
-- man rekker å opprette den andre, men basen er siste skanse.
create unique index if not exists crm_document_folders_kunde_navn_uniq
  on public.crm_document_folders (customer_id, lower(name));

-- ── 2. Koblingen fra dokument til mappe ──────────────────────────────────────
-- ON DELETE SET NULL: sletter du mappen, blir dokumentene liggende og havner
-- tilbake i «Ingen mappe». Filene skal ALDRI følge mappen i graven.
alter table public.crm_documents
  add column if not exists folder_id uuid references public.crm_document_folders(id) on delete set null;

comment on column public.crm_documents.folder_id is
  'Mappe på kundekortet. NULL = ingen mappe. Påvirker ikke storage-nøkkelen.';

create index if not exists crm_documents_folder_idx
  on public.crm_documents (folder_id) where folder_id is not null;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
-- crm_documents har ATTE policyer: én PERMISSIVE tenant_isolation, pluss sju
-- RESTRICTIVE rbac_*. Restrictive AND-es inn, så alle må være oppfylt.
--
-- Mappene MÅ ha samme lag. Uten rbac_* ville en mappe vært en bakvei rundt
-- rollestyringen: en «les»-bruker kunne slettet en mappe full av dokumenter
-- vedkommende ikke selv har lov til å slette.
alter table public.crm_document_folders enable row level security;

-- 3a. Tenant-isolasjon — samme uttrykk som crm_documents.
drop policy if exists crm_document_folders_tenant_isolation on public.crm_document_folders;
create policy crm_document_folders_tenant_isolation
  on public.crm_document_folders
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- 3b. RBAC — KOPIERES fra crm_documents i stedet for å skrives av for hånd.
-- Uttrykkene inneholder auth_role() og is_platform_owner, og de skal være
-- IDENTISKE med dokumentenes. Skriver man dem av, driver de fra hverandre ved
-- neste endring; her hentes de fra kilden hver gang scriptet kjøres.
-- Kjør på nytt etter enhver endring i crm_documents sine rbac-policyer.
do $$
declare p record;
begin
  for p in
    select polname, polcmd,
           pg_get_expr(polqual, polrelid)      as q,
           pg_get_expr(polwithcheck, polrelid) as wc
      from pg_policy
     where polrelid = 'public.crm_documents'::regclass
       and polname like 'rbac\_%'
  loop
    execute format('drop policy if exists %I on public.crm_document_folders', p.polname);
    execute format(
      'create policy %I on public.crm_document_folders as restrictive for %s %s %s',
      p.polname,
      case p.polcmd
        when 'r' then 'select' when 'a' then 'insert'
        when 'w' then 'update' when 'd' then 'delete' else 'all' end,
      case when p.q  is not null then 'using ('      || p.q  || ')' else '' end,
      case when p.wc is not null then 'with check (' || p.wc || ')' else '' end
    );
    raise notice 'crm_document_folders: speilet %', p.polname;
  end loop;
end $$;

-- ── Kontroll etterpå ─────────────────────────────────────────────────────────
-- Denne skal gi ÅTTE rader for crm_document_folders, med nøyaktig samme
-- type/polcmd/uttrykk som crm_documents. Avviker noe, har 3b ikke kjørt:
--
--   select polrelid::regclass as tabell, polname,
--          case when polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end as type,
--          polcmd,
--          pg_get_expr(polqual, polrelid)      as using_uttrykk,
--          pg_get_expr(polwithcheck, polrelid) as with_check_uttrykk
--     from pg_policy
--    where polrelid in ('public.crm_documents'::regclass,
--                       'public.crm_document_folders'::regclass)
--    order by polname, tabell;
--
-- Tabellen og kolonnen:
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_schema='public' and table_name='crm_documents' and column_name='folder_id';
