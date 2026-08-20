-- ============================================================
-- Tripletex fase 1(c): prosjektsynk — kolonner på projects
-- ------------------------------------------------------------
-- Kjøres i Supabase SQL Editor. KUN «En Plattform – Utvikling» først, ikke prod.
-- Alt er ADDITIVT — sletter/endrer ingenting eksisterende data.
-- Forutsetter at fase 1(a) og 1(b) allerede er kjørt (company_integrations,
-- integration_sync_log, customers.tripletex_customer_id).
-- ============================================================

-- Ekstern ID + synk-status direkte på prosjektet.
alter table public.projects
  add column if not exists tripletex_id         bigint,        -- Tripletex sin prosjekt-id
  add column if not exists tripletex_synced_at  timestamptz,   -- sist vellykket synk
  add column if not exists tripletex_sync_error text;          -- siste feilmelding (null = ok)

-- Ferdig. Ingen ny tabell: prosjektsynk bruker den eksisterende integration_sync_log.
