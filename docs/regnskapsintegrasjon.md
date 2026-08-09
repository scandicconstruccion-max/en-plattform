# Regnskapsintegrasjon — Tripletex (steg 1: autentisering)

Kort forklaring av det første byggeklossen i koblingen mellom **En Plattform**
og **Tripletex** (norsk skytjeneste for regnskap). Dette steget gjør **kun**
autentisering — altså å bevise for Tripletex hvem vi er, slik at vi senere kan
sende prosjekter. Ingen prosjektsynk og ingen brukergrensesnitt er bygget ennå.

---

## Hvordan Tripletex-innlogging fungerer (uten fagsjargong)

Tripletex bruker tre «nøkler»:

- **Consumer-token** = *vår* nøkkel (En Plattform sin). Én for hele
  integrasjonen. Ligger som en serverhemmelighet — aldri i databasen, aldri i
  nettleseren.
- **Employee-token** = *kundens* nøkkel. Én per bedrift. Kunden limer den inn
  hos oss. Lagres **kryptert** i databasen.
- **Sesjonstoken** = et **midlertidig** «adgangskort» som Tripletex lager når vi
  sender inn consumer- + employee-token sammen. Det har en utløpsdato og må
  fornyes. Cachen (mellomlagringen) sparer oss for å be om et nytt kort ved hvert
  kall.

Vår Edge Function bytter altså (consumer + employee) → sesjonstoken, lagrer
kortet kryptert med utløpsdato, og henter et nytt automatisk når det gamle er
utløpt.

---

## Sikkerhet (hvorfor nøkkelen aldri lekker)

To lag beskytter nøklene:

1. **RLS** (databasens regel for hvem som får lese hvilke rader) nekter
   nettleseren *all* tilgang til tabellen `company_integrations`. Kun serveren
   (Edge Functions, som kjører med `service_role`) kommer forbi.
2. **Kryptering** (pgcrypto): selve tokenteksten er kryptert. Hovednøkkelen
   ligger kun som en Edge-hemmelighet (`TRIPLETEX_ENC_KEY`), aldri i databasen.
   Uten den kan ingen dekryptere — selv med full databasetilgang.

Frontend får derfor **aldri** se tokenet. Den kan senere bare vise status:
*tilkoblet / ikke tilkoblet / feilet*.

---

## (a) SQL — kjør denne i Supabase SQL Editor

> Ligger også som egen fil: `supabase/sql/company_integrations.sql`.
> Kjør **først** i staging (`zffzvvtuycjbrdybajwu`), verifiser, deretter prod.
> Alt er additivt — ingenting eksisterende slettes eller endres.

Se den fullstendige, kommenterte SQL-en i `supabase/sql/company_integrations.sql`.
Den oppretter:

- Tabellen **`company_integrations`** (én rad per bedrift): kryptert
  employee-token, kryptert cachet sesjonstoken, utløp, samt status-/feilfelt.
- **RLS på** + all tilgang fjernet for nettleser-rollene (`anon`, `authenticated`).
- Fem **hjelpefunksjoner** (kryptér/dekryptér med pgcrypto), alle låst til
  `service_role`.

---

## (b) Edge Function: `tripletex-session`

Fil: `supabase/functions/tripletex-session/index.ts`.

Den gjør, i rekkefølge:

1. (valgfritt) Hvis `employeeToken` sendes med i kallet → lagre det kryptert.
   Praktisk for testing, så hovednøkkelen bare finnes ett sted.
2. Har vi et gyldig cachet sesjonstoken? → returnér `{ cached: true }`.
3. Ellers: dekryptér employee-token, kall Tripletex
   `PUT /v2/token/session/:create`, få nytt sesjonstoken.
4. Lagre sesjonstokenet kryptert med utløp → returnér `{ cached: false }`.

Tokenet returneres **aldri** — svaret inneholder bare `ok`, `cached` og `expires`.

---

## (c) Slik tester du at den virker (steg for steg i Supabase-dashbordet)

Du trenger et **test-consumer-token** og et **test-employee-token** fra Tripletex
sitt testmiljø (`api-test.tripletex.tech`). Disse hentes i Tripletex sin
utviklerportal / testkonto.

**1. Kjør SQL-en**
- Åpne Supabase-prosjektet (bekreft at URL-en inneholder `zffzvvtuycjbrdybajwu` = staging).
- Meny: **SQL Editor** → lim inn innholdet fra `supabase/sql/company_integrations.sql` → **Run**.
- Forvent: «Success. No rows returned».

**2. Finn en bedrifts-ID å teste med**
- **SQL Editor** → kjør: `select id, company_name from company_settings limit 5;`
- Kopiér én `id` (en lang UUID). Dette er `companyId` i testen.

**3. Legg inn Edge-hemmelighetene**
- Meny: **Edge Functions** → **Secrets** (Manage secrets) → legg til:
  - `TRIPLETEX_CONSUMER_TOKEN` = ditt test-consumer-token
  - `TRIPLETEX_ENC_KEY` = en lang, tilfeldig streng du finner på selv (f.eks.
    40+ tegn). **Skriv den ned** — mister du den, må employee-tokenene legges
    inn på nytt.
  - (`TRIPLETEX_API_BASE` trengs ikke — default er allerede test-miljøet.)
- `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` settes **automatisk** av Supabase.

**4. Publiser funksjonen**
- Meny: **Edge Functions** → **Deploy a new function** (eller «Create function»).
- Navn: `tripletex-session`. Lim inn innholdet fra
  `supabase/functions/tripletex-session/index.ts` → **Deploy**.

**5. Første kall — lag et sesjonstoken**
- Åpne funksjonen → fanen for testing/«Invoke».
- Sett **Body** til (bytt inn din UUID og ditt test-employee-token):
  ```json
  { "companyId": "DIN-UUID-HER", "employeeToken": "DITT-TEST-EMPLOYEE-TOKEN" }
  ```
- Kjør. **Forvent:** `{ "ok": true, "cached": false, "expires": "…" }`.

**6. Andre kall — bevis at cachen virker**
- Body denne gangen (uten employeeToken):
  ```json
  { "companyId": "DIN-UUID-HER" }
  ```
- **Forvent:** `{ "ok": true, "cached": true, "expires": "…" }` (samme utløp).

**7. Tving fornying — bevis at den lager nytt**
- Body:
  ```json
  { "companyId": "DIN-UUID-HER", "force": true }
  ```
- **Forvent:** `{ "ok": true, "cached": false, "expires": "…" }` (nytt/oppdatert utløp).

**8. Sjekk at nøklene IKKE er lesbare**
- Meny: **Table Editor** → tabell `company_integrations`.
- Se raden: `is_connected` = true, `session_token_expires` er satt.
  `employee_token_enc` og `session_token_enc` vises som **bytea/hex** — ikke
  lesbar tekst. Det er hele poenget: tokenene er kryptert.

**9. Negativ test — bevis at feil fanges**
- Body med et tullete token og `force`:
  ```json
  { "companyId": "DIN-UUID-HER", "employeeToken": "feil-token", "force": true }
  ```
- **Forvent:** feilsvar (status 502) med en `detail` fra Tripletex, og i
  `company_integrations` blir `last_status` = `failed` med en `last_error`.

Hvis 5–9 stemmer, virker autentiseringen og fornyingen som den skal.

---

## Bevisste avgrensninger (fase 1a)

- **UI** (bedriften limer inn nøkkel, ser status) kommer senere. Foreløpig
  legges employee-token inn via kallet i testen over.
- **Innloggingssjekk i funksjonen** (at kalleren tilhører `companyId`) legges på
  når UI-et bygges. Nå returneres uansett aldri noe hemmelig.

---

# Fase 1(b) — tre fikser + kundesynk

## Tre fikser i `tripletex-session`

1. **Cache-forkasting.** Sendes det inn et `employeeToken` som **avviker** fra det
   lagrede, forkastes cachen og et nytt sesjonstoken hentes med én gang. Før
   ignorerte funksjonen et nytt token så lenge det gamle sesjonstokenet var
   gyldig (til midnatt). (`supabase/functions/tripletex-session/index.ts`)
2. **Status.** `company_integrations` har nå en tredelt status som gjenspeiler
   **siste** resultat:
   - `not_configured` — bedriften har ikke fullført oppsett (ingen vellykket sesjon ennå)
   - `connected` — siste sesjon lyktes
   - `failed` — siste forsøk feilet (og `is_connected` settes da til `false`)
   Settes i databasefunksjonene `tripletex_store_session` (→ connected) og
   `tripletex_mark_failed` (→ failed). (`supabase/sql/customer_sync.sql`)
3. **Trimming.** Alt som kommer inn som `employeeToken` renses for mellomrom,
   tabulator og linjeskift før bruk — kunden skal ikke straffes for et usynlig
   linjeskift fra e-post/PDF.

## Kundesynk: `tripletex-customer-sync`

Synker **én** kunde, **én vei** (En Plattform → Tripletex), per kall.

**Matchings- og opprettingsregler:**
- **Har org.nr (9 siffer):** søk i Tripletex på org.nr. Finnes kunden → koble til
  og lagre `tripletex_customer_id` på vår kunde. Finnes ikke → opprett, lagre ID.
- **Allerede koblet** (`tripletex_customer_id` satt): verifiser at ID-en finnes i
  Tripletex → `noop`. Da blir **aldri** duplikat, uansett hvor mange ganger man synker.
- **Uten org.nr (privatperson):** **opprett alltid ny** — vi navnematcher **ikke**.
- **Aldri** slett i Tripletex. **Aldri** oppdater felter på en kunde som finnes fra
  før (vi bare kobler til).

**Hvorfor ikke navnematch for privatpersoner (risiko):** to ulike personer kan hete
det samme («Ola Nordmann»), og et feiltreff ville koblet fakturaer til feil person i
regnskapet — juridisk alvorlig. Å opprette ny er tryggere: verste utfall er en
dublett vi kan rydde manuelt, ikke sammenblanding av to personers økonomi.

**Endrer kunden navn/adresse hos oss senere?** Bygges **ikke** nå. Forslag: en egen,
bevisst «oppdater i Tripletex»-handling som kun rører felt **vi** eier (navn,
kontaktinfo) og aldri felt regnskapsføreren styrer. Tas i eget steg.

## Synk-logg: `integration_sync_log`

Hvert forsøk logges med tidspunkt, kunde (`entity_id`), Tripletex-ID (`external_id`),
`action` (`created`/`linked_existing`/`noop`/`failed`), **nøyaktig payload vi sendte**
(`request_payload`), kort svar-utdrag, `http_status` og `error`. RLS på — kun
serveren leser den nå; lese-tilgang for admin i UI kommer senere.

## SQL (fase 1b) — kjør selv i «En Plattform – Utvikling» først

Full, kommentert SQL: `supabase/sql/customer_sync.sql`. Den:
- legger til `customers.tripletex_customer_id`,
- legger til `company_integrations.connection_status` (tredelt status),
- oppdaterer funksjonene `tripletex_store_session` / `tripletex_mark_failed`,
- oppretter `integration_sync_log`.

## Test — kundesynk (nøyaktig JSON i testpanelet)

**Forberedelse**
- Deploy funksjonen `tripletex-customer-sync` (lim inn `index.ts`). Ingen nye
  hemmeligheter trengs — `TRIPLETEX_ENC_KEY` deles på prosjektnivå.
- Bruk en `companyId` som allerede er `connected` fra fase 1a.
- Finn testkunder: `select id, name, orgnr from customers limit 20;` — merk deg
  én kunde **med** org.nr og én **uten** (privatperson).

**Test 1 — opprett (kunde med org.nr, ikke i Tripletex fra før)**
```json
{ "companyId": "DIN-UUID", "customerId": "KUNDE-MED-ORGNR" }
```
Forvent: `{ "ok": true, "action": "created", "tripletexCustomerId": <tall> }`.

**Test 2 — ingen duplikat ved ny synk (via lagret ID)**
- Kjør nøyaktig samme kall som Test 1 en gang til.
Forvent: `{ "ok": true, "action": "noop", "tripletexCustomerId": <samme tall> }`.

**Test 3 — ingen duplikat selv om koblingen «glemmes» (match på org.nr)**
- Nullstill koblingen: `update customers set tripletex_customer_id = null where id = 'KUNDE-MED-ORGNR';`
- Kjør samme kall som Test 1 igjen.
Forvent: `{ "ok": true, "action": "linked_existing", "tripletexCustomerId": <samme tall som Test 1> }`.
Dette beviser at samme kunde synket to ganger IKKE gir duplikat i Tripletex.

**Test 4 — privatperson uten org.nr (opprett, ingen navnematch)**
```json
{ "companyId": "DIN-UUID", "customerId": "KUNDE-UTEN-ORGNR" }
```
Forvent: `{ "ok": true, "action": "created", "tripletexCustomerId": <tall> }`.
Ny synk av samme → `noop`.

**Test 5 — negativ test (kunde finnes ikke)**
```json
{ "companyId": "DIN-UUID", "customerId": "00000000-0000-0000-0000-000000000000" }
```
Forvent: HTTP 404 `{ "error": "Fant ikke kunden" }`.

**Kontroller loggen etter hver test**
- **Table Editor → `integration_sync_log`**: se `action`, `external_id`,
  `request_payload` (hva som ble sendt), `http_status` og evt. `error`.
- **Table Editor → `customers`**: `tripletex_customer_id` er satt på de synkede kundene.

---

## SAMMENDRAG TIL WISSAM

1. Første byggekloss mot Tripletex er ferdig: kun innlogging, ikke prosjektsynk ennå.
2. Tre nøkler: vår (consumer) på server, kundens (employee) kryptert i databasen, og et midlertidig sesjonstoken.
3. Ny tabell `company_integrations` lagrer kundens nøkkel — kryptert og utilgjengelig fra nettleseren.
4. En Edge Function bytter nøklene mot et sesjonstoken hos Tripletex, mellomlagrer det og fornyer automatisk.
5. Selve nøkkelen kan aldri leses tilbake til nettsiden — kun status vises (tilkoblet/ikke/feilet).
6. Du kjører SQL-en selv i både staging og prod (den sletter ingenting).
7. Du setter to hemmeligheter i Supabase: vårt consumer-token og en krypteringsnøkkel du finner på.
8. Testoppskrift ligger i dette dokumentet — kun klikk i Supabase-dashbordet, ingen koding.
9. Alt kjører foreløpig mot Tripletex sitt TESTmiljø (api-test.tripletex.tech).
10. Neste steg: kunde- og prosjektsynk med logg — men først når dette er verifisert.
