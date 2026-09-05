// Kjører ProsjektfilerPage-komponentens kropp og feiler hvis den kaster —
// typisk «Cannot access X before initialization».
//
// Bakgrunn: 54c27c5 la kategoritellerne i en React.useMemo som leste
// `hasFaser`, en variabel som deklareres LENGER NED i komponenten. Både
// useMemo-kroppen og deps-arrayet evalueres med én gang, så komponenten kastet
// ved første render og hele Prosjektfiler falt til feilskjerm i produksjon.
// Commiten ble revertet.
//
// Hvorfor ingen av de andre kontrollene fanget det:
//   · esbuild ser bare syntaks. TDZ er en runtime-feil.
//   · Prosjektets lint har no-undef, men `hasFaser` ER definert — bare senere.
//     no-use-before-define ville fanget den, men gir 190 treff på denne fila,
//     nesten alle ufarlige (referanser inne i funksjonskropper som først kalles
//     etter at alt er initialisert). Signalet drukner i støy.
//   · De andre testene leste kildekoden som TEKST i stedet for å kjøre den.
//
// Denne kjører den. Stubbene er med vilje dumme: målet er ikke å teste hva
// komponenten gjør, bare at kroppen kommer seg gjennom uten å kaste.
//
// Kjør:  node tests/prosjektfiler-monterer.mjs
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const KOMPONENT = 'function ProsjektfilerPage()'
let feil = 0

// ── JSX bort først ───────────────────────────────────────────────────────────
// Node kan ikke kjøre JSX. esbuild transformerer den til createElement-kall,
// som stubben under svelger.
const utfil = join(tmpdir(), `pf-monter-${process.pid}.js`)
try {
  execFileSync('npx', ['esbuild', join(rot, 'src', 'App.jsx'),
    '--loader:.jsx=jsx', '--format=esm', `--outfile=${utfil}`, '--log-level=error'],
    { stdio: 'pipe', shell: process.platform === 'win32' })
} catch (e) {
  console.error('✗ Klarte ikke transpilere src/App.jsx:', String(e.message || e).slice(0, 200))
  process.exit(1)
}
const js = readFileSync(utfil, 'utf8')

// ── Hent komponentkroppen ────────────────────────────────────────────────────
const start = js.indexOf(KOMPONENT)
if (start === -1) {
  console.error(`✗ Fant ikke «${KOMPONENT}» i den transpilerte koden. Omdøpt?`)
  process.exit(1)
}
const etter = js.slice(start + KOMPONENT.length)
const sluttRel = etter.search(/\n(?:function |var |const |class )/)
const kropp = etter.slice(0, sluttRel > -1 ? sluttRel : etter.length)

// ── Stubber ──────────────────────────────────────────────────────────────────
// useMemo/useCallback KJØRER kroppen og evaluerer deps — nettopp det vi vil,
// siden det er der TDZ smeller.
const noop = () => {}
const useState = (init) => [typeof init === 'function' ? init() : init, noop]
const useMemo = (fn, deps) => { void deps; return fn() }
const useCallback = (fn, deps) => { void deps; return fn }
const useRef = (v) => ({ current: v === undefined ? null : v })

// Svelger alt: kjeding, kall, oppslag. Holder komponenten i gang forbi det som
// ikke er relevant for om den monterer.
// Må tåle alt komponenten gjør med en ukjent verdi: kalles, kjedes, brukes i
// strenginterpolasjon, spres, itereres. Kaster den, stopper kjøringen på noe
// som ikke er feilen vi leter etter.
const kjede = new Proxy(function () {}, {
  get: (_t, p) => {
    if (p === 'then') return undefined                    // ikke en Promise
    if (p === Symbol.toPrimitive) return () => ''
    if (p === 'toString' || p === Symbol.toStringTag) return () => ''
    if (p === 'valueOf') return () => 0
    if (p === Symbol.iterator) return function* () {}     // tom, for spredning
    if (p === 'length') return 0
    if (p === 'map' || p === 'filter' || p === 'forEach' || p === 'slice' || p === 'sort' || p === 'find' || p === 'reduce') {
      return () => kjede
    }
    return kjede
  },
  apply: () => kjede,
  construct: () => kjede,
  has: () => true,
})

const stubber = {
  React: { useState, useMemo, useCallback, useRef, useEffect: noop, createElement: () => null, Fragment: 'F', memo: (f) => f },
  useState, useMemo, useCallback, useRef, useEffect: noop,
  supabase: { from: () => kjede, rpc: () => kjede, storage: { from: () => kjede }, channel: () => kjede, removeChannel: noop, auth: kjede },
  useAuth: () => ({ user: { id: 'u1' }, companyId: 'c1' }),
  useAppAlert: () => async () => {},
  useConfirm: () => async () => false,
  useNotif: () => ({ load: noop, notifs: [], unread: 0 }),
  useModulTilgang: () => ({ innstillinger: {}, laster: false, ukjent: false }),
  idbHent: async () => null,
  idbSett: async () => {},
  console: { warn: noop, error: noop, log: noop, info: noop },
  navigator: { onLine: true },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
}

console.log('\n── ProsjektfilerPage: kjører komponentkroppen ──')
try {
  // `with` over en Proxy gjør at alt vi IKKE har stubbet — modulkonstanter som
  // FILE_CATEGORIES, hjelpefunksjoner, andre komponenter — blir svelget i
  // stedet for å kaste ReferenceError. Uten det stopper kjøringen på den
  // første ukjente identifikatoren og når aldri fram til koden vi tester.
  //
  // Lokale const/let i komponenten slås fortsatt opp lokalt, ikke i proxyen.
  // Det er nettopp derfor TDZ fortsatt smeller: `hasFaser` ER lokal.
  const globalProxy = new Proxy(stubber, {
    has: () => true,
    get: (t, p) => (p in t ? t[p] : (p === Symbol.unscopables ? undefined : kjede)),
  })
  const fn = new Function('__scope', `
    with (__scope) {
      const onNavigate = () => {}, initialProject = null;
      ${kropp}
      return true;
    }
  `)
  fn(globalProxy)
  console.log('  ✓ kroppen kjørte gjennom uten å kaste')
} catch (e) {
  const melding = String((e && e.message) || e)
  if (/before initialization/i.test(melding)) {
    feil = 1
    console.error(`  ✗ TEMPORAL DEAD ZONE: ${melding}`)
    console.error('      En variabel leses før den er deklarert. Skjer typisk når noe')
    console.error('      flyttes inn i et useMemo/useCallback: både kroppen og deps')
    console.error('      evalueres med én gang, mens en vanlig funksjon først leser')
    console.error('      når den kalles. Flytt deklarasjonen opp, eller gjør')
    console.error('      beregningen lat.')
  } else if (/is not defined/i.test(melding)) {
    console.warn(`  ⚠ mangler stubb: ${melding}`)
    console.warn('      Ikke TDZ. Legg til stubben i denne fila for full dekning.')
  } else {
    console.warn(`  ⚠ kastet av annen grunn: ${melding.slice(0, 120)}`)
    console.warn('      Ikke TDZ, men verdt et blikk.')
  }
}

// ── Sikkerhetsnett: deps-arrayer leser bare det som alt er deklarert ─────────
// Kjøringen over er hovedsjekken, men den kan stoppe tidlig på en manglende
// stubb og aldri nå fram til et useMemo lenger ned. Denne leser kilden direkte.
// Bare deps sjekkes — de er alltid umiddelbart evaluert.
console.log('\n── useMemo/useCallback leser bare det som alt er deklarert ──')
const jsx = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')
const kStart = jsx.indexOf(KOMPONENT)
const kEtter = jsx.slice(kStart + KOMPONENT.length)
const kSlutt = kEtter.search(/\n(?:function |const |class )/)
const komp = kEtter.slice(0, kSlutt > -1 ? kSlutt : kEtter.length)

const deklarertVed = new Map()
for (const m of komp.matchAll(/\n {2}(?:const|let) (?:\{([^}]*)\}|\[([^\]]*)\]|([A-Za-z_$][\w$]*))/g)) {
  const navn = (m[1] || m[2] || m[3] || '')
    .split(',').map(s => s.trim().split(':').pop().trim().replace(/^\.\.\./, '')).filter(Boolean)
  navn.forEach(n => { if (!deklarertVed.has(n)) deklarertVed.set(n, m.index) })
}

let sjekket = 0, funnet = 0
for (const m of komp.matchAll(/(?:React\.)?use(?:Memo|Callback)\s*\(/g)) {
  // Finn deps-arrayet som avslutter dette kallet.
  const rest = komp.slice(m.index)
  const dep = rest.match(/\}\s*,\s*\[([^\]]*)\]\s*\)/)
  if (!dep) continue
  funnet++
  for (const d of dep[1].split(',').map(s => s.trim()).filter(Boolean)) {
    const navn = d.split(/[.?[(]/)[0].trim()
    const dekl = deklarertVed.get(navn)
    sjekket++
    if (dekl !== undefined && dekl > m.index) {
      feil = 1
      console.error(`  ✗ «${navn}» brukes i deps på komponentlinje ${komp.slice(0, m.index).split('\n').length}, men deklareres først på ${komp.slice(0, dekl).split('\n').length}`)
    }
  }
}
if (!feil) console.log(`  ✓ ${funnet} hook-kall, ${sjekket} deps-referanser, alle deklarert før bruk`)

console.log(feil ? '\nFEILET' : '\nOK — komponenten monterer')
process.exit(feil)
