# CLAUDE.md — En Plattform

## Om prosjektet
Norsk SaaS KS-system (kvalitetsstyring) for SMB-byggebedrifter.
Stack: React + Supabase + Vercel. Hele appen ligger i ÉN fil: src/App.jsx (~75 000 linjer).

## Status: LANSERT (11. juli 2026)
- main-branchen ER produksjon (app.enplattform.no via Vercel). Jeg jobber bevisst direkte mot main.
- Ekte testbrukere (eksterne bedrifter) er inne i produksjon. Fellesfunksjoner — registrering, innlogging, dashbord, opplæringstur — treffer ALLE brukere, så vær ekstra forsiktig med dem og test i inkognito. CRM er egen sandkasse.
- staging-branchen er utdatert og ikke i bruk som testmiljø.

## Absolutte regler
- **IKKE splitt src/App.jsx** i flere filer uten at det er avtalt eksplisitt.
- **SQL kjøres i BEGGE Supabase-prosjekter**: produksjon «En Plattform» (zffzvvtuycjbrdybajwu) OG «En Plattform – Utvikling» (dev). Verifiser prosjekt-URL før du kjører SQL.
- **Databaseendringer på prod skal være ADDITIVE** — kun nye kolonner, aldri slette eller endre eksisterende.
- **Aldri** native `alert()`, `confirm()` eller `prompt()`. Bruk alltid `useAppAlert()` / `useConfirm({ message, subMessage, danger, confirmLabel })`.

## Før levering
- Valider med esbuild — koden skal gi EXIT 0, 0 errors, før endringer regnes som ferdige.
- Kartlegg først og rapporter funn før du bygger større endringer; vent på godkjenning.
- Vis alltid en diff av hva som endres.
- **Sjekk at det fungerer responsivt på mobil** — flertallet av brukerne er på telefon.

## Konvensjoner å kjenne til
- React hooks må deklareres FØR eventuelle `return` i modal-komponenter.
- Ansatt-spørringer bruker `first_name` / `last_name` (ikke `name`), uten status-filter.
- Ikke-brytende mellomrom (`\u00A0`) finnes inne i JSX-strenger — ta høyde for det i regex-erstatninger.
- Tabellnavn: `endringsmeldinger` (ikke `change_orders`).
- Valuta via `fmtI()`; fakturalinjer via `calcLines(lines)`; PDF via `createBrandedPdf()`.
- EmployeeNameSelect-dropdowns må bruke React.createPortal til document.body med position: fixed (unngår clipping i modaler med overflow).
- Lister med mange rader: filtrer/sorter i DB-spørringen (.range/.order/count), ikke i frontend — Supabase returnerer maks 1000 rader per spørring.

## Arbeidsspråk
Svar på norsk (bokmål). Kort og teknisk presist.
