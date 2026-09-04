// Feiler hvis et felt på en UNDERLEVERANDØR-linje brukes i src/App.jsx uten å
// stå i UE_LINJE_FELT.
//
// Bakgrunn: bibliotekTilBygningsdel() bygger hver UE-linje fra en hviteliste.
// Sto den for hånd, ville et nytt felt bli skrevet til biblioteket uten å bli
// lest tilbake. Det skjedde med `paaslag`: entreprenørfortjenesten brukeren
// hadde satt på en post forsvant stille når bygningsdelen ble hentet fra
// biblioteket, og summen ble bare litt feil — samme symptom som `_omregning`
// ga på materiallinjer, og like vanskelig å oppdage.
//
// `u` brukes som variabelnavn for mange objekttyper i denne kodebasen
// (brukere, anbuds-UE-er, kalkyle-UE-linjer), så et skann etter «u.felt» ville
// gitt falske treff. Testen sjekker derfor STRUKTUREN i stedet: at hvert felt
// som faktisk settes på en UE-linje er gjort rede for, og at hvitelisten
// bygges fra listen i stedet for å være skrevet ut for hånd.
//
// Kjør:  node tests/ue-linje-felt.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const kilde = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

let feil = 0
const kritisk = (m) => { feil = 1; console.error('✗ ' + m) }

// ── 1) Les listene ut av koden ───────────────────────────────────────────────
const blokk = kilde.match(/const UE_LINJE_FELT = \{([\s\S]*?)\n\}/)
if (!blokk) {
  console.error('✗ Fant ikke UE_LINJE_FELT i src/App.jsx. Er den omdøpt?')
  process.exit(1)
}
// bevares: [{ felt: 'navn', standard: '' }, ...]
const bevares = [...blokk[1].matchAll(/felt:\s*'([a-zA-Z_][a-zA-Z0-9_]*)'/g)].map(m => m[1])
// bevaresIkke: ['email', 'telefon', ...]
const ikkeM = blokk[1].match(/bevaresIkke:\s*\[([^\]]*)\]/)
const bevaresIkke = ikkeM ? [...ikkeM[1].matchAll(/'([a-zA-Z_][a-zA-Z0-9_]*)'/g)].map(m => m[1]) : []
const kjente = new Set([...bevares, ...bevaresIkke, 'id'])   // id er struktur, ikke innhold

console.log('UE_LINJE_FELT.bevares     :', bevares.join(', ') || '(tom)')
console.log('UE_LINJE_FELT.bevaresIkke :', bevaresIkke.join(', ') || '(tom)')

// ── 2) Finn objektliteraler som ER en UE-linje ───────────────────────────────
// Signaturen er at literalen setter både `navn` og `kostnad` — det skiller den
// fra brukere, anbuds-UE-er og forespørsler.
const literaler = []
for (const m of kilde.matchAll(/\{[^{}]*\bnavn:[^{}]*\bkostnad:[^{}]*\}|\{[^{}]*\bkostnad:[^{}]*\bnavn:[^{}]*\}/g)) {
  literaler.push(m[0])
}
if (literaler.length === 0) {
  kritisk('Fant ingen UE-linje-literaler å sjekke. Har formen endret seg?')
}

const brukt = new Map()
for (const lit of literaler) {
  for (const f of lit.matchAll(/(?:^|[{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)) {
    brukt.set(f[1], (brukt.get(f[1]) || 0) + 1)
  }
  // Stenografi: `{ ..., paaslag }` uten kolon
  for (const f of lit.matchAll(/[{,]\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[,}]/g)) {
    brukt.set(f[1], (brukt.get(f[1]) || 0) + 1)
  }
}
console.log('felt satt på UE-linjer    :', [...brukt.keys()].sort().join(', ') || '(ingen)')
console.log('UE-linje-literaler funnet :', literaler.length)

// ── 3) Alle felt skal være gjort rede for ────────────────────────────────────
const ukjente = [...brukt.keys()].filter(f => !kjente.has(f)).sort()
if (ukjente.length) {
  kritisk('Disse feltene settes på en UE-linje uten å stå i UE_LINJE_FELT:')
  for (const f of ukjente) console.error(`    ${f}   (${brukt.get(f)} steder)`)
  console.error('\n  Før dem opp under `bevares` hvis de hører til malen og skal overleve')
  console.error('  lagring til biblioteket, eller under `bevaresIkke` hvis de gjelder ett')
  console.error('  prosjekt. Står de under `bevares`, blir de automatisk med i hvitelisten')
  console.error('  i bibliotekTilBygningsdel.')
}

// ── 4) Hvitelisten MÅ bygges fra listen, ellers er sperren verdiløs ──────────
if (!/UE_LINJE_FELT\.bevares/.test(kilde)) {
  kritisk('bibliotekTilBygningsdel bygger ikke UE-hvitelisten fra UE_LINJE_FELT.bevares.')
}

// ── 5) Regresjonen som ga opphav til listen ──────────────────────────────────
if (!bevares.includes('paaslag')) {
  kritisk('`paaslag` står ikke i `bevares`. Da forsvinner påslaget per post ved '
        + 'lagring til og henting fra biblioteket — det var nettopp denne feilen.')
}

// ── 6) Et felt kan ikke stå i begge lister ───────────────────────────────────
const begge = bevares.filter(f => bevaresIkke.includes(f))
if (begge.length) kritisk('Står i BÅDE bevares og bevaresIkke: ' + begge.join(', '))

// ── 7) Ført opp, men aldri satt ──────────────────────────────────────────────
const ubrukte = [...bevares, ...bevaresIkke].filter(f => !brukt.has(f)).sort()
if (ubrukte.length) console.warn('\n⚠ Ført opp, men ikke satt noe sted (kan ryddes):', ubrukte.join(', '))

console.log(feil ? '\nFEILET' : '\nOK — alle UE-linjefelt er gjort rede for')
process.exit(feil)
