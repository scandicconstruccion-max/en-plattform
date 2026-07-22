# CLAUDE.md — En Plattform

## Om prosjektet
Norsk SaaS KS-system (kvalitetsstyring) for SMB-byggebedrifter.
Stack: React + Supabase + Vercel. Hele appen ligger i ÉN fil: src/App.jsx (~75 000 linjer).

## Absolutte regler
- **IKKE splitt src/App.jsx** i flere filer uten at det er avtalt eksplisitt.
- **SQL kjøres KUN mot staging** (Supabase-prosjekt `zffzvvtuycjbrdybajwu`).
  Verifiser ALLTID at URL-en inneholder `zffzvvtuycjbrdybajwu` før SQL kjøres.
- **Produksjon røres ALDRI** uten en bevisst, planlagt cutover.
  Prod = Supabase `yrrhjbhqwakatghxwqwr` / app.enplattform.no (main-branch).
- **Aldri** native `alert()`, `confirm()` eller `prompt()`.
  Bruk alltid `useAppAlert()` / `useConfirm({ message, subMessage, danger, confirmLabel })`.
- Databaseendringer på prod skal være ADDITIVE (aldri slette/endre eksisterende kolonner på prod).

## Før levering
- Valider med esbuild — koden skal gi EXIT 0, 0 errors, før endringer regnes som ferdige.
- Vis meg alltid en diff av hva som endres, og vent på godkjenning før noe pushes.

## Konvensjoner å kjenne til
- React hooks må deklareres FØR eventuelle `return` i modal-komponenter.
- Ansatt-spørringer bruker `first_name`/`last_name` (ikke `name`), uten status-filter.
- Ikke-brytende mellomrom (`\u00A0`) finnes inne i JSX-strenger — ta høyde for det i regex-erstatninger.
- Tabellnavn: `endringsmeldinger` (ikke `change_orders`).
- Valuta via `fmtI()`; fakturalinjer via `calcLines(lines)`; PDF via `createBrandedPdf()`.
- EmployeeNameSelect-dropdowns må bruke React.createPortal til document.body med position: fixed (unngår clipping i modaler med overflow).

## Arbeidsspråk
Svar på norsk (bokmål). Kort og teknisk presist.
