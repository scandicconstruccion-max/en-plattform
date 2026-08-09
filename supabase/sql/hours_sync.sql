-- ============================================================
-- Tripletex fase 1(d): timer ut — kolonner
-- ------------------------------------------------------------
-- Kjøres i Supabase SQL Editor. KUN «En Plattform – Utvikling» først, ikke prod.
-- Alt er ADDITIVT — sletter/endrer ingenting eksisterende data.
-- Forutsetter at fase 1(a)–1(c) allerede er kjørt.
-- ============================================================

-- 1) Standard Tripletex-AKTIVITET per bedrift.
--    Tripletex krever en aktivitet på hver time. Vårt eget «activity»-felt er kun fritekst
--    og kan ikke mappes trygt, så bedriften velger én standardaktivitet som brukes på alle timer.
alter table public.company_integrations
  add column if not exists tripletex_default_activity_id bigint;

-- 2) Kobling ANSATT → Tripletex-ansatt. Eksplisitt og aldri gjettet.
--    Uten denne koblingen kan en time ikke synkes (feil ansatt = feil lønn).
alter table public.employees
  add column if not exists tripletex_employee_id bigint;

-- 3) Tripletex time-id + synk-status på selve timeraden.
--    tripletex_synced_hours = antall timer vi FAKTISK sendte — brukes til å oppdage
--    at en time er endret hos oss etter at den ble sendt.
alter table public.timesheet_entries
  add column if not exists tripletex_entry_id     bigint,
  add column if not exists tripletex_synced_hours numeric,
  add column if not exists tripletex_synced_at    timestamptz,
  add column if not exists tripletex_sync_error   text;

-- Ferdig. Ingen ny tabell — timer-synk bruker samme integration_sync_log.
