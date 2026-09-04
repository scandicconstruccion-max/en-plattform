// Feiler hvis feltlisten i Prosjektsatser-panelet og getDefaultFaktorer driver
// fra hverandre.
//
// Bakgrunn: panelet har en HÅNDSKREVET liste over hvilke faktorer som kan
// justeres for én kalkyle. getDefaultFaktorer definerer hvilke faktorer som
// finnes. Legges et nytt felt til der uten å føres opp i panelet, blir det
// stille uredigerbart per prosjekt — det kan settes for bedriften, men ikke for
// den ene kalkylen, og ingenting sier fra. Det har allerede skjedd med
// mat_justering_prosent.
//
// Kjør:  node tests/prosjektsats-felt.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const kilde = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

let feil = 0
const kritisk = (m) => { feil = 1; console.error('✗ ' + m) }

// ── 1) Feltene som FINNES ────────────────────────────────────────────────────
const gdfStart = kilde.indexOf('function getDefaultFaktorer(')
if (gdfStart === -1) { console.error('✗ Fant ikke getDefaultFaktorer.'); process.exit(1) }
const gdfBlokk = kilde.slice(gdfStart, kilde.indexOf('\n}', gdfStart))
const alle = [...gdfBlokk.matchAll(/^\s{4}([a-z_]+):/gm)].map(m => m[1])
if (alle.length === 0) { console.error('✗ Leste ingen felt ut av getDefaultFaktorer.'); process.exit(1) }

// ── 2) Feltene som er REDIGERBARE per prosjekt ───────────────────────────────
const markor = 'PROSJEKTSATS-FELT'
const mStart = kilde.indexOf(markor)
if (mStart === -1) {
  console.error(`✗ Fant ikke markøren «${markor}» i src/App.jsx.`)
  console.error('  Panelets feltliste må ha den for at denne testen skal finne riktig liste.')
  process.exit(1)
}
const listeStart = kilde.indexOf('{[', mStart)
const listeSlutt = kilde.indexOf('].map(', listeStart)
const panel = [...kilde.slice(listeStart, listeSlutt).matchAll(/key:\s*'([a-z_]+)'/g)].map(m => m[1])

// ── 3) Feltene som bevisst er UTELATT ────────────────────────────────────────
const utStart = kilde.indexOf('const PROSJEKTSATS_UTELATT = {')
if (utStart === -1) { console.error('✗ Fant ikke PROSJEKTSATS_UTELATT.'); process.exit(1) }
const utBlokk = kilde.slice(utStart, kilde.indexOf('\n}', utStart))
const utelatt = [...utBlokk.matchAll(/^\s{2}([a-z_]+):\s*'([^']*)'/gm)].map(m => ({ felt: m[1], grunn: m[2] }))
const utelattNavn = utelatt.map(u => u.felt)

console.log('felt i getDefaultFaktorer :', alle.join(', '))
console.log('redigerbare i panelet     :', panel.join(', '))
console.log('bevisst utelatt           :', utelattNavn.join(', ') || '(ingen)')

// ── 4) Hvert felt må være gjort rede for ─────────────────────────────────────
const glemt = alle.filter(f => !panel.includes(f) && !utelattNavn.includes(f))
if (glemt.length) {
  kritisk('Disse feltene finnes i getDefaultFaktorer, men er verken redigerbare')
  console.error('  i Prosjektsatser eller ført opp som bevisst utelatt:')
  for (const f of glemt) console.error(`    ${f}`)
  console.error('\n  Legg feltet inn i panelets liste (bak markøren PROSJEKTSATS-FELT),')
  console.error('  eller før det opp i PROSJEKTSATS_UTELATT med en grunn.')
}

// ── 5) Motsatt drift: panelet redigerer noe som ikke finnes ──────────────────
const spokelse = panel.filter(f => !alle.includes(f))
if (spokelse.length) {
  kritisk('Panelet redigerer felt som ikke finnes i getDefaultFaktorer: ' + spokelse.join(', '))
  console.error('  Da skriver det en verdi ingen leser, eller navnet er skrevet feil.')
}

// ── 6) Et felt kan ikke både være redigerbart og utelatt ─────────────────────
const begge = panel.filter(f => utelattNavn.includes(f))
if (begge.length) kritisk('Står BÅDE i panelet og i PROSJEKTSATS_UTELATT: ' + begge.join(', '))

// ── 7) Utelatt-listen må ikke inneholde felt som er fjernet ──────────────────
const foreldet = utelattNavn.filter(f => !alle.includes(f))
if (foreldet.length) console.warn('\n⚠ Ført opp som utelatt, men finnes ikke lenger (kan ryddes):', foreldet.join(', '))

// ── 8) Vis de dokumenterte avvikene, så de ikke glemmes ──────────────────────
if (utelatt.length) {
  console.log('\nDokumenterte avvik:')
  for (const u of utelatt) console.log(`  ${u.felt.padEnd(26)} ${u.grunn}`)
}

console.log(feil ? '\nFEILET' : '\nOK — alle faktorfelt er gjort rede for')
process.exit(feil)
