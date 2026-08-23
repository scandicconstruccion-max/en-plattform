#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Skriver precache-lista inn i dist/sw.js etter `vite build`.
//
// Vite gir bundlen et innholdshash-navn ved hver build. public/sw.js er statisk
// og kopieres uendret til dist/, så den kan umulig kjenne navnet på forhånd.
// Uten dette skrittet står bundlen aldri i precache-lista, og offline kald start
// gir blank side — slik det har vært siden 7. juni.
//
// Kjøres av `npm run build`. Feiler den, skal HELE bygget feile: en precache-
// liste med en URL som ikke finnes er farligere enn ingen liste i det hele tatt.
// vercel.json har fang-alt-rewrite til «/», så en manglende fil svarer 200 med
// HTML. Da ville index.html blitt cachet under et JS-navn, og appen blitt hvit
// for alle — også online.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'
const SW = join(DIST, 'sw.js')
const UTELAT = new Set(['sw.js', '.gitkeep'])

function feil(melding) {
  console.error('\n[lag-sw] BYGGET STOPPET: ' + melding + '\n')
  process.exit(1)
}

function alleFiler(katalog) {
  const ut = []
  for (const e of readdirSync(katalog, { withFileTypes: true })) {
    const p = join(katalog, e.name)
    if (e.isDirectory()) ut.push(...alleFiler(p))
    else ut.push(p)
  }
  return ut
}

// ── Markørene må finnes, ellers har noen endret public/sw.js ────────────────
if (!existsSync(SW)) feil(`finner ikke ${SW}. Kjørte vite build?`)
let sw = readFileSync(SW, 'utf8')
const MARKOR_HJELP = ' Enten er public/sw.js endret, eller så er dist/sw.js allerede'
  + ' behandlet — dette skriptet skal kjøres én gang, rett etter vite build.'
if (!sw.includes("'EP_PRECACHE'")) feil("markøren 'EP_PRECACHE' finnes ikke i dist/sw.js." + MARKOR_HJELP)
if (!sw.includes("'EP_BUILD_ID'")) feil("markøren 'EP_BUILD_ID' finnes ikke i dist/sw.js." + MARKOR_HJELP)

// ── Lista bygges FRA filsystemet, så den kan aldri peke på noe som mangler ──
const filer = alleFiler(DIST)
  .map((p) => relative(DIST, p).split(sep).join('/'))
  .filter((r) => !UTELAT.has(r))
  .sort()

if (!filer.includes('index.html')) feil('dist/index.html mangler.')
if (!filer.some((r) => r.startsWith('assets/'))) feil('dist/assets/ er tom — ingen bundle å precache.')

const urler = ['/', ...filer.map((r) => '/' + r)]

// ── Alt index.html refererer til MÅ ligge i lista. Dette er vakta mot hvit skjerm ──
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const referert = [...html.matchAll(/(?:src|href)\s*=\s*["'](\/[^"']+)["']/g)].map((m) => m[1])
const mangler = referert.filter((u) => !urler.includes(u))
if (mangler.length) {
  feil('index.html refererer til filer som ikke finnes i dist/:\n  ' + mangler.join('\n  '))
}

// ── Build-id fra innholdet, ikke fra klokka ─────────────────────────────────
// Da endres den nøyaktig når assets endres, og ikke ved hver deploy uten grunn.
const storrelser = new Map(filer.map((r) => [r, statSync(join(DIST, r)).size]))
const fingeravtrykk = filer.map((r) => r + ':' + storrelser.get(r)).join('\n')
const buildId = createHash('sha256').update(fingeravtrykk).digest('hex').slice(0, 12)

// Funksjon som erstatter, ikke streng: en streng ville tolket $-sekvenser.
sw = sw
  .replace("'EP_PRECACHE'", () => JSON.stringify(JSON.stringify(urler)))
  .replace("'EP_BUILD_ID'", () => JSON.stringify(buildId))
writeFileSync(SW, sw)

const bytes = [...storrelser.values()].reduce((a, b) => a + b, 0)
console.log(`[lag-sw] build ${buildId} — ${urler.length} URL-er precaches (${(bytes / 1048576).toFixed(2)} MB)`)
for (const u of urler) console.log('  ' + u)
