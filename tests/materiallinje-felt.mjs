// Feiler hvis et INTERNT felt på en materiallinje (et navn som starter med _)
// brukes i src/App.jsx uten å stå i MAT_INTERNE_FELT.
//
// Bakgrunn: bibliotekTilBygningsdel() bygger hver materiallinje fra en
// hviteliste. Da _omregning ble innført, ble det skrevet til biblioteket men
// ikke lest tilbake — og linjer brukeren alt hadde rettet fikk et falskt
// enhetsvarsel. Kommentarer er svakere enn en sperre, så dette er sperren.
//
// Kjør:  node tests/materiallinje-felt.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const kilde = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

// 1) Les listene ut av koden.
const listeRe = /const MAT_INTERNE_FELT = \{([\s\S]*?)\n\}/
const treff = kilde.match(listeRe)
if (!treff) {
  console.error('✗ Fant ikke MAT_INTERNE_FELT i src/App.jsx. Er den omdøpt?')
  process.exit(1)
}
const lesFelt = (navn) => {
  const m = treff[1].match(new RegExp(navn + ':\\s*\\[([^\\]]*)\\]'))
  if (!m) return []
  return [...m[1].matchAll(/'(_[A-Za-zÆØÅæøå0-9]+)'/g)].map(x => x[1])
}
const lagres = lesFelt('lagres')
const lagresIkke = lesFelt('lagresIkke')
const kjente = new Set([...lagres, ...lagresIkke])

// 2) Finn alle _-felt som brukes PÅ en materiallinje. Variabelnavnene under er
//    de som brukes for en materiallinje i denne kodebasen.
const linjeNavn = ['m', 'mat', 'mt', 'linje', 'material', 'mm2']
const brukt = new Map()
for (const v of linjeNavn) {
  const re = new RegExp('\\b' + v + '\\.(_[A-Za-zÆØÅæøå0-9]+)', 'g')
  for (const t of kilde.matchAll(re)) {
    const felt = t[1]
    brukt.set(felt, (brukt.get(felt) || 0) + 1)
  }
}
// Felt satt som objektnøkkel sammen med et kjent materialfelt i samme objekt
// (f.eks. «{ ...m, _prisEnhet: x }») fanges av linjen over via lesing andre
// steder. Objektnøkler alene er for utsatt for falske treff til å skannes.

// 3) Sammenlign.
const ukjente = [...brukt.keys()].filter(f => !kjente.has(f)).sort()
const ubrukte = [...kjente].filter(f => !brukt.has(f)).sort()

console.log('MAT_INTERNE_FELT.lagres     :', lagres.join(', ') || '(tom)')
console.log('MAT_INTERNE_FELT.lagresIkke :', lagresIkke.join(', ') || '(tom)')
console.log('brukt på materiallinjer     :', [...brukt.keys()].sort().join(', ') || '(ingen)')

let feil = 0
if (ukjente.length) {
  feil = 1
  console.error('\n✗ Disse feltene brukes på en materiallinje uten å stå i MAT_INTERNE_FELT:')
  for (const f of ukjente) console.error(`    ${f}   (${brukt.get(f)} steder)`)
  console.error('\n  Før dem opp under `lagres` hvis de skal overleve lagring til biblioteket,')
  console.error('  eller under `lagresIkke` hvis de bare gjelder i økten. Står de under')
  console.error('  `lagres`, blir de automatisk med i hvitelisten i bibliotekTilBygningsdel.')
}
if (ubrukte.length) {
  console.warn('\n⚠ Ført opp, men ikke i bruk (kan ryddes):', ubrukte.join(', '))
}
// 4) Hvitelisten MÅ bygges fra listen, ellers er sperren verdiløs.
if (!/MAT_INTERNE_FELT\.lagres/.test(kilde)) {
  feil = 1
  console.error('\n✗ bibliotekTilBygningsdel bygger ikke hvitelisten fra MAT_INTERNE_FELT.lagres.')
}
console.log(feil ? '\nFEILET' : '\nOK — alle interne felt er gjort rede for')
process.exit(feil)
