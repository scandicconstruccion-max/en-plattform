-- ─────────────────────────────────────────────────────────────────────────────
-- CRM: ett samlet oppgavebilde på tvers av de TO oppgavekildene
-- ─────────────────────────────────────────────────────────────────────────────
-- CRM har to uavhengige begreper for «en oppgave»:
--   1. customers.neste_oppfolging  — en avtalt oppfølging på kunden
--   2. crm_activities              — type='task', completed=false, due_date satt
--
-- «Mine oppgaver» og forfalt-banneret må dekke begge. Sammenslåingen MÅ skje
-- her i basen: med ~15 300 kunder kan vi ikke hente to lister til frontend og
-- slå dem sammen der — da er vi tilbake til klientside-filtrering og
-- PostgREST sin grense på 1000 rader per spørring.
--
-- ADDITIVT. Oppretter kun ett view og to indekser. Ingen tabell, kolonne eller
-- rad endres eller slettes.
--
-- KJØRES I BEGGE PROSJEKTER:
--   «En Plattform»            (produksjon, zffzvvtuycjbrdybajwu)
--   «En Plattform – Utvikling»
--
-- security_invoker = true er ikke valgfritt: uten den kjører viewet med
-- eierens rettigheter og omgår RLS på begge underliggende tabeller. Begge har
-- tenant_isolation (company_id = auth_company_id()) pluss RBAC-policyer, og de
-- skal gjelde nøyaktig som før. Krever PostgreSQL 15+.

create or replace view public.crm_oppgaver_samlet
with (security_invoker = true) as

  -- Kilde 1: avtalt oppfølging på kunden.
  select
    'kunde'::text            as kilde,
    c.id                     as oppgave_id,     -- for denne kilden ER kunden oppgaven
    c.id                     as customer_id,
    c.company_id             as company_id,
    c.neste_oppfolging       as forfaller,
    c.oppfolging_tid         as forfaller_tid,
    c.oppfolging_type        as oppfolging_type,
    c.oppfolging_notat       as notat,
    null::text               as tittel,
    c.name                   as name,
    c.email                  as email,
    c.phone                  as phone,
    c.city                   as city,
    c.score                  as score
  from public.customers c
  where c.neste_oppfolging is not null

  union all

  -- Kilde 2: åpen oppgave i aktivitetsloggen.
  -- Inner join mot customers: en oppgave uten gyldig customer_id kan ikke vises
  -- meningsfullt her (raden åpner kundekortet). Appen setter alltid customer_id
  -- ved innsetting, så dette er et teoretisk tilfelle.
  select
    'aktivitet'::text        as kilde,
    a.id                     as oppgave_id,
    a.customer_id            as customer_id,
    a.company_id             as company_id,
    a.due_date               as forfaller,
    null::time               as forfaller_tid,  -- aktiviteter har ingen klokkeslett
    null::text               as oppfolging_type,
    a.description            as notat,
    a.title                  as tittel,
    c.name                   as name,
    c.email                  as email,
    c.phone                  as phone,
    c.city                   as city,
    c.score                  as score
  from public.crm_activities a
  join public.customers c on c.id = a.customer_id
  where a.type = 'task'
    and a.completed is not true
    and a.due_date is not null;

comment on view public.crm_oppgaver_samlet is
  'Samlet oppgavebilde for CRM: customers.neste_oppfolging + åpne crm_activities-oppgaver. '
  'Én rad per OPPGAVE, ikke per kunde — en kunde med både avtalt oppfølging og en åpen '
  'oppgave gir to rader, fordi det er to ting som skal gjøres. security_invoker, så RLS '
  'på begge underliggende tabeller gjelder.';

-- Uten eksplisitt grant har ikke innloggede brukere lesetilgang til et nytt view.
grant select on public.crm_oppgaver_samlet to authenticated;

-- Partielle indekser som treffer nøyaktig radene viewet bruker. Uten dem blir
-- hver telling en full scan av customers (~15 300) og crm_activities.
create index if not exists idx_customers_oppfolging
  on public.customers (company_id, neste_oppfolging)
  where neste_oppfolging is not null;

create index if not exists idx_crm_activities_apen_task
  on public.crm_activities (company_id, due_date)
  where type = 'task' and completed is not true and due_date is not null;
