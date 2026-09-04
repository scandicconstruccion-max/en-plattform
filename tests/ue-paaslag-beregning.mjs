// Verifiserer HOVEDGARANTIEN bak UE-påslag: ingen lagret kalkyle endrer sum.
//
// UE-påslag ble innført i b4d37b2 og skilte entreprenørfortjeneste på
// underleverandørpriser fra innkjøpsmargin på materiell. Hele endringen hviler
// på at en kalkyle som ikke har de nye feltene regner NØYAKTIG som før — ellers
// endrer signerte tilbud seg stille. Denne testen holder den garantien.
//
// Den kjører de EKTE funksjonene fra src/App.jsx, hentet ut av kilden og
// evaluert isolert. Den tester altså beregningen slik den faktisk står, ikke en
// kopi som kan gli fra hverandre.
//
// Kjør:  node tests/ue-paaslag-beregning.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const src = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

// ── Hent funksjonene ut av kilden ────────────────────────────────────────────
const hent = (innledning, navn) => {
  const start = src.indexOf(innledning)
  if (start === -1) {
    console.error(`✗ Fant ikke «${navn}» i src/App.jsx.`)
    console.error('  Er den omdøpt eller flyttet? Testen henter funksjonene ut av kilden,')
    console.error('  så den må oppdateres sammen med dem.')
    process.exit(1)
  }
  return src.slice(start, src.indexOf('\n}', start) + 2)
}
const fn = (navn) => hent(`function ${navn}(`, navn)
const ct = (navn) => hent(`const ${navn} = {`, navn)

// Minimal FAGGRUPPER — testen bryr seg om satsene den sender inn selv, ikke om
// hele fagregisteret. Verdiene her speiler 'tomrer' slik den står i App.jsx.
const stubb = `
  let _t = 0; const nyRadId = () => \`r\${++_t}\`;
  const FAGGRUPPER = [{ id:'tomrer', name:'Tømrer', defaultLonn:380, defaultSosiale:15,
    defaultFaste:25, defaultFortjenestLonn:25, defaultFortjenesteInnkjop:30,
    defaultMatJustering:5, defaultGrunntidJustering:1.0 }];
  const getFaggruppe = () => FAGGRUPPER[0];
  const GRUNNTID_POSTER = []; const tommeGrunntidPoster = () => ({});
`

const M = new Function([
  stubb,
  ct('MAT_INTERNE_FELT'), ct('UE_LINJE_FELT'),
  fn('satsEllerNull'), fn('uePaaslagFor'), fn('getDefaultFaktorer'),
  fn('beregnArbeidskostnad'), fn('beregnMaterialkostnad'),
  fn('beregnBygningsdel'), fn('beregnKalkyle'), fn('bibliotekTilBygningsdel'),
  'return { satsEllerNull, uePaaslagFor, getDefaultFaktorer, beregnBygningsdel, beregnKalkyle, bibliotekTilBygningsdel };',
].join('\n\n'))()

const { satsEllerNull, uePaaslagFor, getDefaultFaktorer, beregnBygningsdel, bibliotekTilBygningsdel } = M

// ── Testrammeverk ────────────────────────────────────────────────────────────
let feil = 0, antall = 0
const sjekk = (navn, faktisk, ventet) => {
  antall++
  const ok = (typeof faktisk === 'number' && typeof ventet === 'number')
    ? Math.abs(faktisk - ventet) < 0.005
    : faktisk === ventet
  if (!ok) { feil++; console.error(`  ✗ ${navn}\n      fikk ${faktisk}, ventet ${ventet}`) }
  else console.log(`  ✓ ${navn}`)
}
const gruppe = (t) => console.log(`\n── ${t} ──`)

// En bygningsdel med én UE-post til 100 000, uten arbeid eller materiell.
const bd = (ue) => ({ mengde: 1, arbeidsarter: [], materialer: [], underleverandorer: ue })
const enUE = bd([{ id: 'u', kostnad: 100000 }])

// Faktorer slik de faktisk ligger i basen. Merk at satser er lagret som TEKST
// hos noen bedrifter og som TALL hos andre — begge må tolkes likt.
const base = { produksjonslonn: 380, sosiale_prosent: 15, faste_prosent: 25,
  fortjeneste_lonn_prosent: 25, mat_justering_prosent: 5, grunntid_justering: 1 }
const innkjopTekst = { ...base, fortjeneste_innkjop_prosent: '20' }
const innkjopTall = { ...base, fortjeneste_innkjop_prosent: 30 }

// ── 1. HOVEDGARANTIEN ────────────────────────────────────────────────────────
gruppe('HOVEDGARANTI: kalkyle uten de nye feltene regner som før')
sjekk('feltet mangler helt, innkjøpsmargin "20"', beregnBygningsdel(enUE, innkjopTekst).totalUE, 120000)
sjekk('feltet mangler helt, innkjøpsmargin 30', beregnBygningsdel(enUE, innkjopTall).totalUE, 130000)
sjekk('manglende felt leses som null, ikke 0', satsEllerNull(innkjopTall.ue_paaslag_prosent), null)
sjekk('standarden er null, ikke et tall', getDefaultFaktorer('tomrer').ue_paaslag_prosent, null)

// ── 2. satsEllerNull tåler det basen faktisk inneholder ──────────────────────
gruppe('satsEllerNull: tekst, tall, komma, søppel')
sjekk('tall 30', satsEllerNull(30), 30)
sjekk('tekst "20"', satsEllerNull('20'), 20)
sjekk('komma "12,5"', satsEllerNull('12,5'), 12.5)
sjekk('punktum "1.2"', satsEllerNull('1.2'), 1.2)
sjekk('tom streng -> null', satsEllerNull(''), null)
sjekk('null -> null', satsEllerNull(null), null)
sjekk('undefined -> null', satsEllerNull(undefined), null)
sjekk('søppel -> null', satsEllerNull('abc'), null)
sjekk('0 -> 0, ikke null', satsEllerNull(0), 0)

// ── 3. Fallback-kjeden ───────────────────────────────────────────────────────
gruppe('Fallback: post -> fagets/prosjektets UE-sats -> innkjøpsmargin')
sjekk('ingen sats satt -> arver "20"', uePaaslagFor({}, innkjopTekst), 20)
sjekk('UE-sats 12 slår innkjøpsmargin', uePaaslagFor({}, { ...innkjopTall, ue_paaslag_prosent: 12 }), 12)
sjekk('UE-sats som tekst "12"', uePaaslagFor({}, { ...innkjopTall, ue_paaslag_prosent: '12' }), 12)
sjekk('postens egen sats slår alt', uePaaslagFor({ paaslag: 25 }, { ...innkjopTall, ue_paaslag_prosent: 12 }), 25)
sjekk('postens sats som tekst "25"', uePaaslagFor({ paaslag: '25' }, innkjopTall), 25)
sjekk('post med 0 % = ingen fortjeneste, IKKE arv', uePaaslagFor({ paaslag: 0 }, { ...innkjopTall, ue_paaslag_prosent: 12 }), 0)
sjekk('tom streng på posten arver videre', uePaaslagFor({ paaslag: '' }, { ...innkjopTall, ue_paaslag_prosent: 12 }), 12)
sjekk('søppel på posten arver videre', uePaaslagFor({ paaslag: 'abc' }, { ...innkjopTall, ue_paaslag_prosent: 12 }), 12)

// ── 4. Prosjektsatsen (kalkylens egne faktorer) ──────────────────────────────
gruppe('Prosjektsats: kalkylens faktorer er laget beregningen leser')
sjekk('prosjektsats 12 %', beregnBygningsdel(enUE, { ...innkjopTall, ue_paaslag_prosent: 12 }).totalUE, 112000)
sjekk('prosjektsats "12,5"', beregnBygningsdel(enUE, { ...innkjopTall, ue_paaslag_prosent: '12,5' }).totalUE, 112500)
sjekk('prosjektsats null -> arver', beregnBygningsdel(enUE, { ...innkjopTall, ue_paaslag_prosent: null }).totalUE, 130000)
sjekk('prosjektsats "" -> arver', beregnBygningsdel(enUE, { ...innkjopTall, ue_paaslag_prosent: '' }).totalUE, 130000)
sjekk('prosjektsats 0 -> 0 %, arver ikke', beregnBygningsdel(enUE, { ...innkjopTall, ue_paaslag_prosent: 0 }).totalUE, 100000)

// ── 5. UE-selvkost og påslag eksponeres eksakt ───────────────────────────────
gruppe('Sammendragets tall kommer fra beregningen, ikke fra et estimat')
const r5 = beregnBygningsdel(bd([{ id: 'u', kostnad: 100000, paaslag: 25 }]), innkjopTall)
sjekk('totalUESelvkost = innkjøp uten påslag', r5.totalUESelvkost, 100000)
sjekk('totalUE - selvkost = faktisk påslag', r5.totalUE - r5.totalUESelvkost, 25000)

// ── 6. Round-trip: lagre til bibliotek -> hent -> beregn ─────────────────────
gruppe('Round-trip: påslag per post overlever biblioteket')
const original = {
  name: 'Bad komplett', enhet: 'stk', mengde: 1, arbeidsarter: [], materialer: [],
  underleverandorer: [
    { id: 'a', navn: 'Rør AS', beskrivelse: 'Sanitær', kostnad: 100000, paaslag: 25,
      email: 'p@r.no', status: 'godkjent', foresporsel_id: 'f1', source: 'ue_foresporsel' },
    { id: 'b', navn: 'El AS', beskrivelse: 'Elektro', kostnad: 50000 },
    { id: 'c', navn: 'Flis AS', beskrivelse: 'Flis', kostnad: 30000, paaslag: 0 },
  ],
}
const fagMedUE = { ...innkjopTall, ue_paaslag_prosent: 12 }
const foer = beregnBygningsdel(original, fagMedUE)
const hentet = bibliotekTilBygningsdel(original, 1)
const etter = beregnBygningsdel(hentet, fagMedUE)
sjekk('sum før lagring', foer.totalUE, 100000 * 1.25 + 50000 * 1.12 + 30000 * 1.0)
sjekk('sum etter henting er uendret', etter.totalUE, foer.totalUE)
const u = hentet.underleverandorer
sjekk('egen sats 25 overlevde', u[0].paaslag, 25)
sjekk('arvende post beholdt null', u[1].paaslag, null)
sjekk('0 % overlevde som 0', u[2].paaslag, 0)
sjekk('prosjektspesifikke felt fulgte ikke med',
  ['email', 'status', 'foresporsel_id', 'source'].filter(f => u[0][f] !== undefined).length, 0)

// ── 7. «Tilpasset»-merket i Prosjektsatser ───────────────────────────────────
// Uttrykket i panelet for arvefelt: satsEllerNull(fakt[k]) !== satsEllerNull(defFakt[k])
gruppe('Tilpasset-merket for arvefelt')
const std = getDefaultFaktorer('tomrer').ue_paaslag_prosent
const erTilpasset = (v) => satsEllerNull(v) !== satsEllerNull(std)
sjekk('urørt felt (undefined) -> ikke tilpasset', erTilpasset(undefined), false)
sjekk('tomt felt (null) -> ikke tilpasset', erTilpasset(null), false)
sjekk('tom streng -> ikke tilpasset', erTilpasset(''), false)
sjekk('satt til 12 -> tilpasset', erTilpasset(12), true)
sjekk('satt til 0 -> tilpasset (0 er en beslutning)', erTilpasset(0), true)

// ── 8. Tilbakestill ──────────────────────────────────────────────────────────
gruppe('Tilbakestill fører tilbake til arv, ikke til 0')
sjekk('reset gir null', getDefaultFaktorer('tomrer').ue_paaslag_prosent, null)
sjekk('sum etter reset = som før',
  beregnBygningsdel(enUE, { ...innkjopTall, ...getDefaultFaktorer('tomrer'), fortjeneste_innkjop_prosent: 30 }).totalUE, 130000)
sjekk('gammelt bedriftsobjekt uten feltet -> arver 22',
  beregnBygningsdel(enUE, { produksjonslonn: 400, fortjeneste_innkjop_prosent: 22 }).totalUE, 122000)

console.log(`\n${antall - feil} av ${antall} OK`)
console.log(feil ? 'FEILET' : 'OK — ingen lagret kalkyle endrer sum')
process.exit(feil ? 1 : 0)
