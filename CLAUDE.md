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

## Fast svarformat — «TIL WISSAM» (gjelder ALLE oppgaver)
Hvert svar skal avsluttes med ÉN kodeblokk merket «TIL WISSAM». Det skal være en
kodeblokk (```-fence), ikke vanlig tekst, slik at hele kan kopieres med ett klikk.
Alt Wissam skal ta stilling til skal ligge INNE i blokken — ingenting viktig utenfor.

Blokken har alltid disse fire delene, i denne rekkefølgen:

```
TIL WISSAM

UTFØRT
- Hva som faktisk er bygget/endret. Maks 5 punkter, vanlig norsk.

DU MÅ BESTEMME
- Nummererte spørsmål, maks 3. Hvert med din anbefaling formulert slik at Wissam
  kan svare «ja til alle» hvis han er enig. Skriv «Ingen» hvis det ikke er noe.

DU MÅ GJØRE
- Konkrete steg i rekkefølge: hvilken SQL, hvilken funksjon som skal deployes,
  hvilke tester. Klikkbare instruksjoner, ikke beskrivelser. «Ingenting» hvis tomt.

USIKKERT / RISIKO
- Ting du er usikker på, eller som kan gi problemer senere. «Ingenting» hvis tomt.
```

Regler for blokken:
- Vanlig norsk, ingen fagsjargong uten forklaring (Wissam er ikke utvikler).
- Ikke gjenta detaljer som allerede står i `docs/` — pek dit i stedet.
- Kode, SQL og testoppskrifter ligger UTENFOR blokken (som før), i chat/docs.
