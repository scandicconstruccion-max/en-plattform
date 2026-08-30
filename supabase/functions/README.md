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
| `befaring-notify-assignment` | ❌ | `fetch /functions/v1/` | |
| `befaring-notify-resolver` | ❌ | `fetch /functions/v1/` | |
| `befaring-view-fetch` | ❌ | `fetch /functions/v1/` | |
| `befaring-view-resolve` | ✅ | `fetch /functions/v1/` | Fra prod. Token-autentisert, ingen JWT |
| `befaring-view-upload-url` | ✅ | `fetch /functions/v1/` | Fra prod. Token-autentisert, ingen JWT |
| `delete-user` | ❌ | `functions.invoke` | |
| `send-materialliste` | ❌ | `functions.invoke` | |
| `send-quote` | ❌ | `fetch /functions/v1/` (`sendEpost`) | All utgående e-post |
| `stripe-checkout-ts` | ✅ | `functions.invoke` | Slug har `-ts`, se under. Fra prod |
| `stripe-portal` | ✅ | `functions.invoke` | Fra prod |
| `stripe-sync-amount` | ✅ | `functions.invoke` | Fra prod. Se «Varsel som ikke når fram» |
| `stripe-webhook` | ✅ | — | Kalles av Stripe. «Verify JWT» må være AV |
| `send-ue-fdv-invitation` | ❌ | — | Ikke funnet kalt fra koden. Arkiveres likevel |
| `ue-melding-notify` | ❌ | `functions.invoke` | |
| `ue-svar-notify` | ❌ | `functions.invoke` | |

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
