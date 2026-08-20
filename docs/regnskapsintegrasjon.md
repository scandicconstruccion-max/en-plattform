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
> Kjør i **Utvikling** (`actefthtojooqxkdhbkb`), verifiser. Produksjon
> (`zffzvvtuycjbrdybajwu`) røres kun ved en bevisst, planlagt cutover.
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
   `POST /v2/token/session/:create`, få nytt sesjonstoken.
4. Lagre sesjonstokenet kryptert med utløp → returnér `{ cached: false }`.

Tokenet returneres **aldri** — svaret inneholder bare `ok`, `cached` og `expires`.

---

## (c) Slik tester du at den virker (steg for steg i Supabase-dashbordet)

Du trenger et **test-consumer-token** og et **test-employee-token** fra Tripletex
sitt testmiljø (`api-test.tripletex.tech`). Disse hentes i Tripletex sin
utviklerportal / testkonto.

**1. Kjør SQL-en**
- Åpne **Utvikling**-prosjektet (bekreft at URL-en inneholder `actefthtojooqxkdhbkb` = Utvikling — IKKE produksjon `zffzvvtuycjbrdybajwu`).
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

**Matchings- og opprettingsregler (styrt av kolonnen `customers.type`):**
- **`type='bedrift'` / `'ue'` MED org.nr (9 siffer):** søk i Tripletex på org.nr.
  Finnes kunden → koble til og lagre `tripletex_customer_id`. Finnes ikke → opprett, lagre ID.
- **`type='bedrift'` / `'ue'` UTEN org.nr:** **synkes ikke** — dette er en ufullstendig
  registrering, ikke en privatperson. Funksjonen returnerer HTTP 400 med en tydelig melding
  om at org.nr må fylles inn først (logges med `action='skipped'`, `reason='missing_orgnr'`).
- **`type='privat'`:** **opprett alltid ny** — vi navnematcher **ikke** (org.nr sendes aldri).
- **Allerede koblet** (`tripletex_customer_id` satt): verifiser at ID-en finnes i
  Tripletex → `noop`. Da blir **aldri** duplikat, uansett hvor mange ganger man synker.
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
`action` (`created`/`linked_existing`/`noop`/`skipped`/`failed`), **nøyaktig payload vi sendte**
(`request_payload`), kort svar-utdrag, `http_status` og `error`. RLS på — kun
serveren leser den nå; lese-tilgang for admin i UI kommer senere.

## SQL (fase 1b) — kjør selv i «En Plattform – Utvikling» (`actefthtojooqxkdhbkb`) først

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

**Test 4 — privatperson (`type='privat'`) → opprett, ingen navnematch**
```json
{ "companyId": "DIN-UUID", "customerId": "KUNDE-TYPE-PRIVAT" }
```
Forvent: `{ "ok": true, "action": "created", "tripletexCustomerId": <tall> }`.
Ny synk av samme → `noop`. (I loggen: `response_summary.matchBasis = 'privat'`.)

**Test 5 — bedrift uten org.nr (`type='bedrift'`, `orgnr` tom) → blokkeres**
```json
{ "companyId": "DIN-UUID", "customerId": "BEDRIFT-UTEN-ORGNR" }
```
Forvent: HTTP 400 `{ "error": "Kunden er registrert som «bedrift» men mangler org.nr. …", "action": "skipped", "reason": "missing_orgnr" }`.
I `integration_sync_log`: `action='skipped'`. Ingenting opprettes i Tripletex.

**Test 6 — negativ test (kunde finnes ikke)**
```json
{ "companyId": "DIN-UUID", "customerId": "00000000-0000-0000-0000-000000000000" }
```
Forvent: HTTP 404 `{ "error": "Fant ikke kunden" }`.

**Kontroller loggen etter hver test**
- **Table Editor → `integration_sync_log`**: se `action`, `external_id`,
  `request_payload` (hva som ble sendt), `http_status` og evt. `error`.
- **Table Editor → `customers`**: `tripletex_customer_id` er satt på de synkede kundene.

---

# Fase 1(c) — prosjektsynk

## `tripletex-project-sync` (Edge Function)

Synker **ett** prosjekt, **én vei** (En Plattform → Tripletex), per kall. Input: `{ companyId, projectId }`.

**Rekkefølge og regler:**
- **Underprosjekt** (`projects.parent_id` satt) → **ikke støttet ennå**: HTTP 400,
  `action='skipped'`, `reason='subproject_not_supported'`. Ingenting sendes til Tripletex.
- **Mangler prosjektnummer** → blokkeres (`skipped`, `missing_project_number`).
- **Mangler ekte kunde** (`projects.customer_id` er tom) → blokkeres med tydelig melding
  om at man må velge en kunde (`skipped`, `missing_customer`). Ingen dummy-kunde.
- **Kunden ikke synket ennå** → funksjonen kaller den deployede `tripletex-customer-sync`
  (samme logikk gjenbrukes — **ikke** kopiert kode). Feiler kundesynk (f.eks. bedrift uten
  org.nr) → prosjektsynk blokkeres med den samme meldingen (`reason='customer_sync_required'`).
  De to stegene logges hver for seg (`operation='customer_sync'` og `operation='project_sync'`).
- **Allerede koblet** (`tripletex_id` satt): verifiser at ID-en finnes i Tripletex → `noop`.
- **Match på prosjektnummer**: finnes nummeret i Tripletex → koble til og lagre `tripletex_id`.
  Aldri duplikat. Finnes ikke → opprett og lagre ID-en.
- **Aldri** slett i Tripletex. **Aldri** oppdater et prosjekt som finnes fra før (vi kobler bare til).

## Felter vi sender (minimalt — og hvorfor)

| Felt | Sendes | Begrunnelse |
|------|--------|-------------|
| `name` | alltid | Vi eier prosjektnavnet. Påkrevd i Tripletex. |
| `number` | alltid | **Prosjektnummeret er selve matchings­nøkkelen.** Vi eier det. |
| `customer.id` | alltid | Poenget med å synke kunden først — knytter prosjektet til riktig kunde. |
| `projectManager.id` | ved opprettelse | Tripletex **krever** en prosjektleder. Vi setter token-eierens egen ansatt (whoAmI). **Ingen fallback** — gir whoAmI ingen ansatt, blokkeres synk (400, `no_project_manager`) framfor å plukke en vilkårlig ansatt. Konfigurerbar PM per bedrift kommer med UI. Kun ved opprettelse, aldri overskrevet siden. |
| `startDate` / `endDate` | kun hvis vi har dem | Nyttig, vi eier datoene. Utelates hvis tomme — vi sender aldri en oppdiktet dato. |

Bevisst utelatt nå (kan utvides senere): adresse, beskrivelse, budsjett, avdeling. Grunn:
felter vi sender feil er vanskelige å rydde i regnskapet — vi starter minimalt.

## Underprosjekter (parent_id) — forslag, ikke bygget

Vi har hierarki via `parent_id`. **Nå:** et forsøk på å synke et underprosjekt blokkeres pent
(400, `subproject_not_supported`) — det havner **aldri** i Tripletex, så ingen rot oppstår.

**Forslag til senere:** Tripletex støtter underprosjekt via et `subProjects`/parent-felt.
Riktig rekkefølge blir: synk mor-prosjektet først (så det har en `tripletex_id`), deretter
opprett underprosjektet i Tripletex med referanse til morens `tripletex_id`. Det krever at vi
synker treet ovenfra og ned og håndterer at et mellomledd kan mangle synk. Tas som eget steg.

## Tripletex-retningslinjer vi følger

- **`fields` på alle GET-kall.** Tripletex ber eksplisitt om at vi begrenser datamengden
  med `fields`-parameteren. Alle GET-kall i integrasjonen bruker den:
  `/v2/customer?...&fields=id,name,organizationNumber`, `/v2/customer/{id}?fields=id`,
  `/v2/project?...&fields=id,name,number`, `/v2/project/{id}?fields=id`,
  `/v2/token/session/>whoAmI?fields=employeeId,employee`.
  (PUT/POST-kall — `:create`, opprett kunde/prosjekt — er ikke GET og påvirkes ikke.)

- **Webhooks framfor polling (fase 2).** Når vi i fase 2 skal hente **kostnader/tall
  tilbake** fra Tripletex (til budsjett-oppfølging o.l.), skal det bygges på **webhooks**
  (Tripletex varsler oss ved endring), **ikke** gjentatt polling. Vi lagrer siste kjente
  tilstand og reagerer på hendelser — færre kall, ferskere data, og i tråd med Tripletex'
  anbefaling om webhooks framfor gjentatte kall. Selve mottaket blir en egen Edge Function.
  - **Verifisering:** Tripletex bruker **ikke** kryptografiske signaturer på webhooks. Når vi
    oppretter webhook-abonnementet, setter vi **selv** navn og verdi på en egendefinert header
    (`authHeaderName` / `authHeaderValue`). Tripletex sender den headeren med hvert webhook-kall.
    Verifiseringen består altså i å sjekke at den innkommende headeren stemmer mot en
    **hemmelighet vi har lagret** (Edge-hemmelighet) — matcher den ikke, avvises kallet.

## SQL (fase 1c) — kjør selv i «En Plattform – Utvikling» (`actefthtojooqxkdhbkb`) først

Full SQL: `supabase/sql/project_sync.sql`. Den legger til `projects.tripletex_id`,
`projects.tripletex_synced_at` og `projects.tripletex_sync_error`. Ingen ny tabell —
prosjektsynk bruker samme `integration_sync_log`.

## Test — prosjektsynk (nøyaktig JSON)

**Forberedelse**
- Deploy funksjonen `tripletex-project-sync` (funksjonsnavn står på linje 2 i `index.ts`).
  Ingen nye hemmeligheter.
- Finn testprosjekter: `select id, name, project_number, parent_id, customer_id from projects limit 20;`
  Merk deg: ett **toppnivå**-prosjekt **med** `customer_id`, ett **uten** `customer_id`, og ett **underprosjekt** (`parent_id` satt).

**Test 1 — opprett (toppnivå, med kunde)**
```json
{ "companyId": "DIN-UUID", "projectId": "PROSJEKT-MED-KUNDE" }
```
Forvent: `{ "ok": true, "action": "created", "tripletexProjectId": <tall> }`.
(Er kunden ikke synket fra før, synkes den automatisk først — se egen `customer_sync`-rad i loggen.)

**Test 2 — synk igjen (ingen duplikat, via lagret ID)**
- Samme kall som Test 1.
Forvent: `{ "ok": true, "action": "noop", "tripletexProjectId": <samme tall> }`.

**Test 3 — nullstill koblingen og synk igjen (skal koble til eksisterende)**
- `update projects set tripletex_id = null where id = 'PROSJEKT-MED-KUNDE';`
- Samme kall igjen.
Forvent: `{ "ok": true, "action": "linked_existing", "tripletexProjectId": <samme tall som Test 1> }`.
Bekreft i Tripletex' prosjektliste: fortsatt **ett** prosjekt med det nummeret — ingen duplikat.

**Test 4 — prosjekt uten kunde (blokkeres)**
```json
{ "companyId": "DIN-UUID", "projectId": "PROSJEKT-UTEN-KUNDE" }
```
Forvent: HTTP 400 `{ "error": "Prosjektet mangler en ekte kunde. …", "action": "skipped", "reason": "missing_customer" }`.

**Test 5 — underprosjekt (blokkeres pent)**
```json
{ "companyId": "DIN-UUID", "projectId": "ET-UNDERPROSJEKT" }
```
Forvent: HTTP 400 `{ "error": "Dette er et underprosjekt …", "action": "skipped", "reason": "subproject_not_supported" }`.
Ingenting opprettes i Tripletex.

**Test 6 — ukjent prosjekt**
```json
{ "companyId": "DIN-UUID", "projectId": "00000000-0000-0000-0000-000000000000" }
```
Forvent: HTTP 404 `{ "error": "Fant ikke prosjektet" }`.

**Kontroller etter testene**
- **`integration_sync_log`**: to operasjoner ved første synk — `customer_sync` og `project_sync` — hver med sin `action` og `request_payload`.
- **`projects`**: `tripletex_id` satt, `tripletex_synced_at` fylt, `tripletex_sync_error` = null på de synkede.

---

# Fase 1(d) — timer ut

## `tripletex-hours-sync` (Edge Function)

Synker **én godkjent timerad** til Tripletex, én vei. Input: `{ companyId, entryId }`.
Denne runden sendes **kun normaltimer** på et prosjekt.

**Tabeller/kolonner brukt (lest fra koden):**
- `timesheet_entries`: `id, timesheet_id, date, project_id, absence_type, normal_hours,
  overtime_50, overtime_100, status, tripletex_entry_id*, tripletex_synced_hours*,
  tripletex_synced_at*, tripletex_sync_error*` (`*` = nye)
- `timesheets`: `id, employee_id` (eier av timelisten)
- `employees`: `id, first_name, last_name, tripletex_employee_id*`
- `company_integrations`: `tripletex_default_activity_id*`
- `projects`: `id, tripletex_id` (fra fase 1c)

**Blokkeringer (alt logges, ingenting sendes til Tripletex):**
| Situasjon | `reason` |
|---|---|
| Ikke godkjent (`status ≠ 'Godkjent'`) | `not_approved` |
| Fravær (`absence_type` satt) | `absence_not_supported` |
| Mangler prosjekt | `missing_project` |
| Har overtid | `overtime_not_supported` |
| Ansatt ikke koblet til Tripletex | `employee_not_linked` |
| Ingen standardaktivitet valgt | `missing_default_activity` |
| Endret etter synk | `changed_after_sync` |

## Ansatt-kobling — valg og risiko (rule 2)

En time må treffe **riktig** ansatt i Tripletex — feil kobling = feil lønn. To måter:
- **E-postmatch** (slå opp Tripletex-ansatt på `employees.email`): *risikabelt*. E-post kan
  mangle, være privat/jobb-forskjellig, eller endres. Et bomtreff er «stille» og gir feil lønn.
- **Egen koblings-ID (valgt):** kolonnen `employees.tripletex_employee_id` settes **eksplisitt**
  (nå manuelt/SQL, senere i UI). Ingen gjetting. Er den tom → synk **blokkeres** (400,
  `employee_not_linked`). **Aldri** fallback til «første ansatt».

Vi bruker den eksplisitte koblingen. Automatisk e-post-*forslag* i UI kan komme senere, men
skal alltid bekreftes av et menneske før det lagres.

## Aktivitet (rule 6)

Tripletex krever en aktivitet på hver time. Vårt `activity`-felt er kun fritekst og kan ikke
mappes trygt. Løsning: bedriften velger **én standardaktivitet**
(`company_integrations.tripletex_default_activity_id`) som brukes på alle timer. Er den ikke
satt → blokkeres (`missing_default_activity`). Per-linje-aktivitet kan komme senere.

## Endring og sletting etter synk (rule 5) — forslag, ikke bygget

- **Endret hos oss etter synk:** Vi lagrer antall timer vi sendte (`tripletex_synced_hours`).
  Endres timen senere, oppdager funksjonen avviket og **feiler pent** (`changed_after_sync`,
  409) i stedet for å overskrive. *(Merk: i praksis setter appen en endret time tilbake til
  «Til godkjenning», som uansett blokkeres av `not_approved` til den godkjennes på nytt.)*
  Forslag senere: en bevisst «oppdater i Tripletex»-handling som sender ny verdi (PUT).
- **Slettet hos oss etter synk:** Vi sletter **aldri** i Tripletex automatisk. Forslag senere:
  marker som «skal fjernes» og la et menneske ta det i Tripletex, eller en egen avstemming.
- **Låst periode i Tripletex:** Da avviser Tripletex opprettelsen; vi fanger feilen, lagrer
  den i `tripletex_sync_error` og logger `failed`. Ingen rot — timen forblir usendt.

## SQL (fase 1d) — kjør selv i «En Plattform – Utvikling» (`actefthtojooqxkdhbkb`) først

Full SQL: `supabase/sql/hours_sync.sql` (aktivitet på bedrift, `tripletex_employee_id` på
ansatt, Tripletex-time-id + synk-status på timeraden). Ingen ny tabell.

## Testdata du må opprette (SQL i egen kodeblokk i chatten)

> **Finn ID-ene enkelt:** deploy funksjonen `tripletex-lookup` og kall den med
> `{ "companyId": "DIN-UUID" }`. Den returnerer en kort liste med ansatte (id + navn)
> og aktiviteter (id + navn) fra Tripletex — skrivefritt oppslag. Er `activities` tom,
> forteller svaret hva du må gjøre i Tripletex først.

Du trenger: (a) en **Tripletex-ansatt-id** og en **Tripletex-aktivitet-id** fra testmiljøet,
(b) en ansatt hos oss koblet til den, (c) bedriftens standardaktivitet satt, (d) minst én
**godkjent** timerad med prosjekt og normaltimer, og (e) én **ikke-godkjent** rad.
Se testdata-SQL og hvordan du finner Tripletex-ID-ene i chat-svaret.

## Test — timer (nøyaktig JSON)

- **Test 1 — godkjent time sendes:** `{ "companyId": "DIN-UUID", "entryId": "GODKJENT-TIME" }`
  → `{ "ok": true, "action": "created", "tripletexEntryId": <tall> }`. (Er prosjektet ikke
  synket, synkes det først — egen `project_sync`-rad i loggen.)
- **Test 2 — samme time igjen (ingen dobbeltføring):** samme kall → `{ "action": "noop", ... }`.
- **Test 3 — ikke-godkjent time:** `{ "companyId": "DIN-UUID", "entryId": "IKKE-GODKJENT" }`
  → 400 `{ "reason": "not_approved" }`.
- **Test 4 — ansatt uten kobling:** fjern koblingen (`update employees set tripletex_employee_id = null where id = '…';`)
  og synk en godkjent time for den ansatte → 400 `{ "reason": "employee_not_linked" }`.
- **Test 5 — prosjekt ikke synket:** velg en godkjent time på et prosjekt uten `tripletex_id`
  → prosjektet synkes automatisk først, deretter timen (`created`). To rader i loggen.
- **Test 6 — ukjent time:** `{ "companyId": "DIN-UUID", "entryId": "00000000-0000-0000-0000-000000000000" }`
  → 404.

**Kontroller etter testene:** `integration_sync_log` (rader per steg, `action`,
`request_payload`), og `timesheet_entries` (`tripletex_entry_id`, `tripletex_synced_hours`,
`tripletex_synced_at` satt på de synkede).

---

## SAMMENDRAG TIL WISSAM

1. Første byggekloss mot Tripletex er ferdig: kun innlogging, ikke prosjektsynk ennå.
2. Tre nøkler: vår (consumer) på server, kundens (employee) kryptert i databasen, og et midlertidig sesjonstoken.
3. Ny tabell `company_integrations` lagrer kundens nøkkel — kryptert og utilgjengelig fra nettleseren.
4. En Edge Function bytter nøklene mot et sesjonstoken hos Tripletex, mellomlagrer det og fornyer automatisk.
5. Selve nøkkelen kan aldri leses tilbake til nettsiden — kun status vises (tilkoblet/ikke/feilet).
6. Du kjører SQL-en selv i Utvikling (`actefthtojooqxkdhbkb`); produksjon kun ved en bevisst cutover (den sletter ingenting).
7. Du setter to hemmeligheter i Supabase: vårt consumer-token og en krypteringsnøkkel du finner på.
8. Testoppskrift ligger i dette dokumentet — kun klikk i Supabase-dashbordet, ingen koding.
9. Alt kjører foreløpig mot Tripletex sitt TESTmiljø (api-test.tripletex.tech).
10. Neste steg: kunde- og prosjektsynk med logg — men først når dette er verifisert.
