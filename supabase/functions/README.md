# Edge Functions — arkivkopi

**Filene her er en KOPI, ikke kilden som deployes.**

Deploy skjer manuelt via Code-fanen i Supabase-dashbordet, per prosjekt. Ingenting
i dette repoet deployer noe automatisk, og det finnes ingen CI som pusher herfra.
Endrer du en fil her, skjer det ingenting i drift før noen limer den inn i
dashbordet. Endrer noen en funksjon i dashbordet, blir fila her stående utdatert
til noen oppdaterer den for hånd.

Hensikten med mappa er at koden skal kunne leses under feilsøking, og at det skal
finnes en kopi utenfor Supabase.

## Prosjekter

| Prosjekt | Ref | Rolle |
|---|---|---|
| En Plattform | `zffzvvtuycjbrdybajwu` | Produksjon |
| En Plattform – Utvikling | `actefthtojooqxkdhbkb` | Test |

## Status per funksjon

Kolonnen «I repo» sier om kildekoden finnes her. «Kalles fra» viser hvor i
frontend funksjonen brukes, slik at det er mulig å se hva som faktisk er i bruk.

| Funksjon | I repo | Kalles fra App.jsx | Merknad |
|---|---|---|---|
| `bim-sesjon-rydd` | ✅ | `functions.invoke` | Ikke deployet i Utvikling |
| `tripletex-session` | ✅ | `functions.invoke` | Fra prod. Har autorisasjonsblokken |
| `tripletex-lookup` | ✅ | `functions.invoke` | Fra prod. Har autorisasjonsblokken |
| `tripletex-customer-sync` | ✅ | — | Fra prod. Har autorisasjonsblokken |
| `tripletex-hours-sync` | ✅ | — | Fra prod. Har autorisasjonsblokken |
| `tripletex-project-sync` | ✅ | — | Fra prod. Har autorisasjonsblokken |
| `anbud-uttrekk` | ❌ | `functions.invoke` | |
| `befaring-notify-assignment` | ✅ | `fetch /functions/v1/` | Fra prod. Ingen avsenderkontroll, se under |
| `befaring-notify-resolver` | ✅ | `fetch /functions/v1/` | Fra prod. Ingen avsenderkontroll, se under |
| `befaring-view-fetch` | ✅ | `fetch /functions/v1/` | Fra prod. Token-autentisert, ingen JWT |
| `befaring-view-resolve` | ✅ | `fetch /functions/v1/` | Fra prod. Token-autentisert, ingen JWT |
| `befaring-view-upload-url` | ✅ | `fetch /functions/v1/` | Fra prod. Token-autentisert, ingen JWT |
| `delete-user` | ❌ | `functions.invoke` | |
| `send-materialliste` | ✅ | `functions.invoke` | Fra prod. Ingen kontroll i koden, kun «Verify JWT» |
| `send-quote` | ✅ | `fetch /functions/v1/` (`sendEpost`) | Fra prod. v5 krever innlogget bruker |
| `stripe-checkout-ts` | ✅ | `functions.invoke` | Slug har `-ts`, se under. Fra prod |
| `stripe-portal` | ✅ | `functions.invoke` | Fra prod |
| `stripe-sync-amount` | ✅ | `functions.invoke` | Fra prod. Se «Varsel som ikke når fram» |
| `stripe-webhook` | ✅ | — | Kalles av Stripe. «Verify JWT» må være AV |
| `send-ue-fdv-invitation` | ✅ | — | Fra prod. Ikke funnet kalt fra App.jsx. Se «origin fra body» |
| `ue-melding-notify` | ✅ | `functions.invoke` | Fra prod. Samme mønster som `ue-svar-notify` |
| `ue-svar-notify` | ✅ | `functions.invoke` | Fra prod. Mønsteret å kopiere, se under |

## Tripletex: autorisasjonsblokken

Alle fem Tripletex-funksjonene bærer den samme autorisasjonsblokken
(`hentAvsender`, `AvvistFeil`, `krevSammeBedrift`, `lesRolleFraJwt`,
`hentEgenRad`). Den utleder bedriften fra kallerens JWT via `auth_company_id()`
i stedet for å stole på `companyId` i request-body, og avviser service-role- og
anon-nøkkelen som avsender.

Blokken skal holdes **identisk** mellom filene — det står som et krav i
kommentaren øverst i hver av dem. Ved arkivering ble den maskindiffet: 155
linjer, samme sjekksum i alle fem. Gjør du noe med den, gjør det i alle fem.

Den ligger inline i hver fil fordi dashbordets Code-fane ikke kan opprette flere
filer (se nederst).

Historikk, for den som leser gammel git: fram til august 2026 lå det utdaterte
kopier her, uten blokken. Siste commit som rørte dem var `2b52c21` (CORS-fiks) —
sikkerhetsarbeidet ble deployet, men aldri merget inn på main. Repoet lå bak
drift, ikke omvendt. Filene her er nå hentet fra produksjon.

`kallFunksjon()` og `skrivEksternKobling()` er også felles, og ble diffet på
samme måte. `tripletex-session` har ingen av dem: den kaller ingen andre
funksjoner og skriver ingen ekstern kobling.

## Mønsteret som løser problemet: ue-svar-notify og ue-melding-notify

Flere av e-postfunksjonene sliter med det samme: en **uinnlogget** part skal
utløse en e-post, og da finnes det ingen bruker-JWT å kontrollere.
`ue-svar-notify` løser det, og kommentaren øverst i fila forklarer hvordan:

Klienten sender **kun et token**. Mottaker, emne og HTML bygges server-side fra
den lagrede raden. Da finnes det ingenting kalleren kan velge — ingen
åpen-relé-egenskap, uansett hvem som treffer endepunktet. Sikkerheten ligger i
at tokenet er hemmelig, og det er samme token som kreves for å se forespørselen
i utgangspunktet.

Mottakeradressen hentes fra `auth.admin.getUserById()` — autoritativt, ikke fra
en profiltabell som kan være utdatert.

`ue-melding-notify` gjør det samme, og legger til to ting: den sender bare hvis
siste melding er fra UE-en og er under 10 minutter gammel, slik at en gammel
melding ikke kan spilles av på nytt i en løkke. Kommentaren dokumenterer også
en mangel den ikke løser — funksjonen husker ikke om den alt har varslet om
meldingen, så den med et gyldig token kan kalle gjentatte ganger innenfor
vinduet. Det er notert i kilden som noe som tas sammen med historikk-saken.

At mangelen står skrevet i fila er verdt å merke seg: det er forskjell på en
kjent, avgrenset svakhet og en kommentar som påstår en kontroll som ikke finnes
(se `befaring-notify-resolver`).

Dette er malen for `send-ue-fdv-invitation`, der `origin` i dag kommer fra body
(se under). Samme problem, løst tre steder — to riktig.

## origin fra body: send-ue-fdv-invitation

Funksjonen bygger opplastingslenka slik (linje 60–61):

```
const base = (origin || "https://app.enplattform.no").replace(/\/$/, "")
const lenke = `${base}/#fdv_ue_levering?token=${r.token}`
```

`origin` kommer fra **request-body**, og `r.token` er UE-ens ekte
opplastingstoken. Funksjonen har ingen avsenderkontroll: den leser aldri
`req.headers`, kjører service_role og henter forespørselen på `.eq('id',
requestId)` alene.

Det betyr at et kall utenfra kan få systemet til å sende en ekte
En Plattform-e-post, fra vår avsenderadresse, til UE-ens registrerte adresse —
med en knapp som peker hvor som helst, og som bærer det ekte tokenet i URL-en.
`lenke` settes inn i `href` uten escaping, og `esc()` dekker uansett bare
`< > &`, ikke anførselstegn.

Dempende: mottakeradressen tas fra databasen (`r.ue_contact_email`), ikke fra
body, så e-posten kan ikke omdirigeres til en angriper. Tokenet returneres
heller ikke i svaret. Funksjonen er ikke funnet kalt fra App.jsx, så
endepunktet må treffes direkte.

Ikke rettet — arkivet skal speile det som kjører. Dette er den av de arkiverte
funksjonene jeg vil se på først hvis vi tar en sikkerhetsrunde.

## Tre ulike avsenderadresser

Standardverdien for `FROM_EMAIL` er ikke den samme i alle funksjonene:

| Funksjon | Default hvis `FROM_EMAIL` mangler |
|---|---|
| `send-quote` | `noreply@enplattform.no` |
| `send-materialliste` | `ikke.svar@enplattform.no` |
| `befaring-notify-resolver`, `befaring-notify-assignment` | `tilbud@enplattform.no` |

Er `FROM_EMAIL` satt som secret, brukes den overalt og forskjellen spiller ingen
rolle. Er den ikke satt, sender de samme systemet e-post fra tre adresser — noe
som betyr tre domener å holde SPF/DKIM i orden for, og tre avsendere kunden ser.

Ikke rettet. Sjekk om `FROM_EMAIL` faktisk er satt i begge prosjektene før du
konkluderer med at det er et problem.

## send-materialliste har ingen kontroll i koden

Funksjonen leser aldri `req.headers` og oppretter ingen Supabase-klient. Hele
beskyttelsen er «Verify JWT»-toggelen i dashbordet — som kommentaren øverst i
fila også sier at den stoler på.

Den toggelen slipper gjennom den **offentlige anon-nøkkelen**. Det er nøyaktig
det `send-quote` v5 og Tripletex-blokken beskriver som utilstrekkelig, hver for
seg og med samme begrunnelse. Funksjonen sender e-post med vedlegg til en
mottaker oppgitt i body.

Ikke rettet — arkivet skal speile det som kjører.

## Sannsynlig brutt varsel: befaring-view-resolve → send-quote

`send-quote` v5 avviser alle som ikke er en **innlogget bruker**: den kaller
`auth.getUser()` og svarer 401 hvis den ikke får en bruker tilbake.

`befaring-view-resolve` sender «punkt utbedret»-varselet til bygglederen ved å
kalle `send-quote` med **service-role-nøkkelen** som `Authorization`
(`befaring-view-resolve/index.ts` linje 173). Service-role-nøkkelen er ikke en
bruker — den har ingen `sub`-claim — så `getUser()` gir ingen bruker, og
`send-quote` svarer etter alt å dømme 401.

Kallstedet har `.catch()`, men en 401 er et gyldig HTTP-svar og ikke en
nettverksfeil, så `.catch()` utløses ikke. Svaret leses aldri. **Feiler dette,
feiler det stille** — UE-en får «lagret», og bygglederen får ingen e-post.

Dette er utledet fra kildekoden, ikke observert i drift. Verifiser før du
konkluderer: send en utbedring på en testbefaring og se om `sent_emails` får en
rad, eller les funksjonsloggen for `send-quote`.

Det er trolig grunnen til at `befaring-notify-resolver` og
`befaring-notify-assignment` går **direkte til Resend** i stedet. Kommentaren
deres sier akkurat det: funksjon-til-funksjon-kall krever JWT som er upraktisk å
håndtere. `befaring-view-resolve` ble tilsynelatende ikke lagt om.

Ikke rettet — arkivet skal speile det som kjører.

## De to befaring-notify-funksjonene har ingen avsenderkontroll

Gjelder `befaring-notify-resolver` og `befaring-notify-assignment`.

Ingen av dem leser `req.headers`. Begge oppretter en service-role-klient og
henter observasjonen på `.eq('id', observation_id)` alene — uten RLS og uten
noen kontroll av hvem som spør eller hvilken bedrift observasjonen hører til.
`observation_id` kommer fra request-body.

I `befaring-notify-resolver` sier kommentaren øverst i fila det motsatte:

> Bruker authenticated bruker (byggleder) sin JWT for å validere RLS.

Den setningen beskriver ikke koden.

Det er samme mønster som ble lukket i Tripletex-funksjonene. Konsekvensen er
mindre her — ingen skriving av forretningsdata — men et kall med en fremmed
`observation_id` gir e-postadressen til mottakeren tilbake i svaret (`sent_to`),
og sender en e-post til dem. `assignment` skriver i tillegg til `sent_log`, som
kan brukes til å undertrykke et framtidig varsel: `alreadyNotified` gjør at
neste ekte tildelingsvarsel til samme adresse hoppes over.

De tre `befaring-view-*`-funksjonene har derimot en reell kontroll: view_token,
utløpsdato, at observasjonen hører til befaringen, og at `assigned_email`
matcher.

Ikke rettet — arkivet skal speile det som kjører.

## Slug mot visningsnavn: `stripe-checkout-ts`

Dashbordet viser funksjonen som **`stripe-checkout`**, men slugen — den som
faktisk ligger i URL-en — er **`stripe-checkout-ts`**:

```
https://zffzvvtuycjbrdybajwu.supabase.co/functions/v1/stripe-checkout-ts
```

App.jsx kaller `stripe-checkout-ts` to steder («Start abonnement» i Min bedrift
og betalingsknappen på låseskjermen), og det er riktig. Bekreftet i drift:
Byggkompaniet AS trekkes månedlig gjennom denne flyten.

Står det her fordi visningsnavnet og slugen spriker, og det ser ut som en feil
neste gang noen leser lista. **Ikke «rett» kallstedene i App.jsx.**

Mappenavnet her følger slugen, ikke visningsnavnet — det er slugen som må stemme
for at kallet skal treffe.

## Varsel som ikke når fram: stripe-sync-amount

`meldFeil()` skal varsle plattformeier når en beløpssynk feiler, og henter
mottakerne med `.eq('role', 'platform_owner')`. Plattformeier ligger i kolonnen
`platform_role`, ikke `role` — `role` inneholder bare admin/leder/ansatt/les.
Spørringen treffer null rader, og løkka under sender ingenting.

Timeline-skrivingen på bedriften virker som den skal, så feilen er ikke usynlig —
men den må oppdages ved å åpne bedriften i Kontrollpanelet.

Samme forveksling står i rollesjekken øverst i alle tre Stripe-funksjonene
(`['admin', 'leder', 'platform_owner'].includes(profile.role)`). Der er den
harmløs: plattformeier har `role = 'admin'` og slipper gjennom uansett.

Ikke rettet — arkivet skal speile det som kjører.

## Når du legger til en funksjon her

1. Kopier kilden fra Code-fanen i dashbordet, uendret.
2. Legg den i `supabase/functions/<slug>/index.ts` — samme slug som i dashbordet.
3. Oppdater tabellen over.

Én fil per funksjon. Dashbordets Code-fane kan ikke opprette flere filer
(«Add File» gir `file2.ts`, navnet lar seg ikke endre, og fila forsvinner ved
neste lagring), så alt som skal deployes må stå i `index.ts`. Det er grunnen til
at Tripletex-funksjonene har hjelpefunksjonene sine inline i stedet for i en
delt modul.
