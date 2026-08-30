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
| `tripletex-session` | ⚠️ utdatert | `functions.invoke` | Se «Kjent avvik» |
| `tripletex-lookup` | ⚠️ utdatert | `functions.invoke` | Se «Kjent avvik» |
| `tripletex-customer-sync` | ⚠️ utdatert | — | Se «Kjent avvik» |
| `tripletex-hours-sync` | ⚠️ utdatert | — | Se «Kjent avvik» |
| `tripletex-project-sync` | ⚠️ utdatert | — | Se «Kjent avvik» |
| `anbud-uttrekk` | ❌ | `functions.invoke` | |
| `befaring-notify-assignment` | ❌ | `fetch /functions/v1/` | |
| `befaring-notify-resolver` | ❌ | `fetch /functions/v1/` | |
| `befaring-view-fetch` | ❌ | `fetch /functions/v1/` | |
| `befaring-view-resolve` | ❌ | `fetch /functions/v1/` | |
| `befaring-view-upload-url` | ❌ | `fetch /functions/v1/` | |
| `delete-user` | ❌ | `functions.invoke` | |
| `send-materialliste` | ❌ | `functions.invoke` | |
| `send-quote` | ❌ | `fetch /functions/v1/` (`sendEpost`) | All utgående e-post |
| `stripe-checkout-ts` | ❌ | `functions.invoke` | Navnet har `-ts`, se under |
| `stripe-portal` | ❌ | `functions.invoke` | |
| `stripe-sync-amount` | ❌ | `functions.invoke` | |
| `stripe-webhook` | ❌ | — | Kalles av Stripe, ikke av appen |
| `send-ue-fdv-invitation` | ❌ | — | Sto i dashbordlista, ikke funnet i koden |
| `ue-melding-notify` | ❌ | `functions.invoke` | |
| `ue-svar-notify` | ❌ | `functions.invoke` | |

## Kjent avvik: de fem Tripletex-filene er utdaterte

Kopiene her mangler autorisasjonsblokken (`hentAvsender`, `AvvistFeil`,
`krevSammeBedrift`, `lesRolleFraJwt`, `hentEgenRad`) som ligger i den deployede
versjonen i Utvikling. Blokken utleder bedriften fra kallerens JWT via
`auth_company_id()` i stedet for å stole på `companyId` i request-body, og avviser
service-role- og anon-nøkkelen som avsender.

Sist commit som rørte filene er `2b52c21` (CORS-fiks). Sikkerhetsarbeidet ble
aldri merget inn på main.

**Ikke lim disse inn i dashbordet.** De er eldre enn det som kjører.

## Navneavvik: `stripe-checkout-ts`

Frontend kaller `stripe-checkout-ts` (App.jsx, to steder: «Start abonnement» i
Min bedrift og betalingsknappen på låseskjermen). Dashbordlista oppgir
`stripe-checkout`. Enten er lista forkortet, eller så peker koden på et navn som
ikke finnes — og da feiler begge betalingsknappene. Må bekreftes mot dashbordet.

## Når du legger til en funksjon her

1. Kopier kilden fra Code-fanen i dashbordet, uendret.
2. Legg den i `supabase/functions/<slug>/index.ts` — samme slug som i dashbordet.
3. Oppdater tabellen over.

Én fil per funksjon. Dashbordets Code-fane kan ikke opprette flere filer
(«Add File» gir `file2.ts`, navnet lar seg ikke endre, og fila forsvinner ved
neste lagring), så alt som skal deployes må stå i `index.ts`. Det er grunnen til
at Tripletex-funksjonene har hjelpefunksjonene sine inline i stedet for i en
delt modul.
