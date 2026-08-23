-- ═══════════════════════════════════════════════════════════════════════════
-- integration_status() og tripletex_integration_status()
--
-- KJØRES I BEGGE PROSJEKTER:
--   · «En Plattform – Utvikling»  (actefthtojooqxkdhbkb)   ← kjør her først
--   · «En Plattform»  (produksjon, zffzvvtuycjbrdybajwu)
-- Verifiser prosjekt-id i URL-en før du trykker Run.
--
-- HVA DENNE FILEN RETTER
-- ----------------------
-- Begge funksjonene slo opp bedriften slik:
--
--     ci.company_id = (select up.company_id from public.user_profiles up
--                      where up.id = auth.uid())
--
-- Det er FEIL kilde. Resten av plattformen — RLS-policyen tenant_isolation på
-- 19 av 20 tabeller, og default-verdien for company_id på ti tabeller — bruker
-- auth_company_id(), som tar hensyn til aktiv støtte-økt (support_sessions
-- .target_company_id) og ellers faller tilbake på user_profiles.company_id.
--
-- To konsekvenser av feil kilde:
--   1) Under støtte-økt svarte RPC-en med MIN bedrifts tilkoblingsstatus mens
--      jeg sto hos kunden. Kundens kort viste «Synk til Tripletex» selv om
--      kunden aldri har koblet til noe regnskapssystem.
--   2) Alvorligere, og uavhengig av støtte-økt: en bruker hvis
--      user_profiles.company_id av en eller annen grunn peker et annet sted enn
--      auth_company_id(), får en annen bedrifts tilkoblingsstatus i retur.
--      Funksjonene er SECURITY DEFINER, så RLS stopper det ikke.
--
-- Ingen nøkler har noen gang blitt returnert — kun has_token (boolsk) — så
-- lekkasjen gjelder status, ikke hemmeligheter. Den skal likevel være rettet
-- FØR integrasjonen rulles ut i prod.
--
-- ADDITIVT? Ja, i den forstand som gjelder for prod: ingen tabell, kolonne
-- eller rad røres. Returtypen (json) og feltnavnene er nøyaktig som før, så
-- create or replace går gjennom og App.jsx trenger ingen endring for å lese
-- svaret. Det eneste som endres er hvilken bedrift som slås opp.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Forutsetninger: stopp med en forståelig feil, ikke en kryptisk ──────────
do $$
begin
  if to_regprocedure('public.auth_company_id()') is null then
    raise exception 'auth_company_id() finnes ikke i dette prosjektet. Kjør den først — uten den blir scopingen feil igjen.';
  end if;
  if to_regclass('public.company_integrations') is null then
    raise exception 'Tabellen company_integrations finnes ikke. Kjør supabase/sql/company_integrations.sql først.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) tripletex_integration_status() — den gamle, Tripletex-spesifikke.
--
--    Brukes fortsatt av integrasjonssiden (TripletexIntegrasjonSeksjon), som
--    leser has_token, connection_status, last_verified_at og last_error.
--    Feltene beholdes uendret. provider er hardkodet i where-setningen og
--    returneres ikke — det er hele grunnen til at nr. 2 finnes.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.tripletex_integration_status()
returns json
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (
      select json_build_object(
        'connection_status',     coalesce(ci.connection_status, 'not_configured'),
        'has_token',             (ci.employee_token_enc is not null),
        'last_verified_at',      ci.last_verified_at,
        'last_error',            ci.last_error,
        'session_token_expires', ci.session_token_expires,
        'environment',           ci.environment
      )
      from public.company_integrations ci
      where ci.provider = 'tripletex'
        -- FØR: (select up.company_id from public.user_profiles up where up.id = auth.uid())
        and ci.company_id = public.auth_company_id()
    ),
    json_build_object('connection_status', 'not_configured', 'has_token', false)
  );
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) integration_status() — leverandør-nøytral. Returnerer provider i tillegg.
--
--    company_integrations har primærnøkkel (company_id, provider), så en bedrift
--    KAN ha flere rader. Vi returnerer én: den tilkoblede hvis den finnes,
--    ellers den sist oppdaterte. Sorteringen kjører INNENFOR company_id-
--    filteret og kan ikke i seg selv hente en annen bedrifts rad.
--
--    Returnerer ALDRI noe fra token-kolonnene, kun om et token finnes.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.integration_status()
returns json
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (
      select json_build_object(
        'provider',              ci.provider,
        'connection_status',     coalesce(ci.connection_status, 'not_configured'),
        'has_token',             (ci.employee_token_enc is not null),
        'last_verified_at',      ci.last_verified_at,
        'last_error',            ci.last_error,
        'session_token_expires', ci.session_token_expires,
        'environment',           ci.environment
      )
      from public.company_integrations ci
      -- FØR: (select up.company_id from public.user_profiles up where up.id = auth.uid())
      where ci.company_id = public.auth_company_id()
      order by (ci.connection_status = 'connected') desc, ci.updated_at desc nulls last
      limit 1
    ),
    json_build_object('provider', null, 'connection_status', 'not_configured', 'has_token', false)
  );
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Rettigheter. Begge er trygge for innloggede: de returnerer status, aldri
--    nøkler. anon skal ikke ha noe.
-- ═══════════════════════════════════════════════════════════════════════════
revoke all on function public.tripletex_integration_status() from public, anon;
revoke all on function public.integration_status()           from public, anon;
grant execute on function public.tripletex_integration_status() to authenticated, service_role;
grant execute on function public.integration_status()           to authenticated, service_role;

notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════
-- KONTROLL — kjør etterpå, i samme prosjekt.
-- ═══════════════════════════════════════════════════════════════════════════

-- A) Ingen av funksjonene skal lenger nevne user_profiles.
--    Forventet: to rader, begge med bruker_auth_company_id = true og
--    bruker_user_profiles = false.
-- select p.proname,
--        pg_get_functiondef(p.oid) like '%auth_company_id%'  as bruker_auth_company_id,
--        pg_get_functiondef(p.oid) like '%user_profiles%'    as bruker_user_profiles
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('integration_status', 'tripletex_integration_status');

-- B) Rettigheter. Forventet: anon = false, authenticated = true for begge.
-- select p.proname,
--        has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('integration_status', 'tripletex_integration_status');

-- C) Selve testen, som innlogget bruker i appen (ikke i SQL-editoren —
--    editoren kjører som postgres og har ingen auth.uid()):
--      · Uten støtte-økt hos en bedrift MED kobling  → connection_status = 'connected'
--      · Støtte-økt hos bedrift UTEN kobling         → 'not_configured', provider = null
--    Kjør i nettleserkonsollen:
--      await supabase.rpc('integration_status')
