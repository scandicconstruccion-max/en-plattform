// Feiler hvis detaljlinjene under en bygningsdel ikke SUMMERER til
// bygningsdelens egen sum.
//
// Bakgrunn: tilbuds-PDF-en, utskriftsvisningen og den interne kalkylen listet
// alle tre bare arbeid og materiell under hver bygningsdel — mens summen over
// dem er
//
//   totalMedFortjeneste = arbeid + materiell + UE + flatetillegg + åpningstillegg
//
// Detaljene gikk derfor ikke opp mot summen. På et tilbud er det kundens
// regnestykke som ikke stemmer. I tillegg ganget materiallinjene med full
// mengde, mens beregningen bruker materialMengde (etter åpningsfradrag), så
// feilene gikk i begge retninger og kunne maskere hverandre.
//
// Testen kjører den EKTE bygningsdelDetaljer mot beregnBygningsdel og krever at
// de stemmer på krona.
//
// Kjør:  node tests/bygningsdel-detaljer.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const src = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

const hent = (innledning, navn) => {
  const start = src.indexOf(innledning)
  if (start === -1) {
    console.error(`✗ Fant ikke «${navn}» i src/App.jsx. Omdøpt eller flyttet?`)
    process.exit(1)
  }
  return src.slice(start, src.indexOf('\n}', start) + 2)
}
const fn = (navn) => hent(`function ${navn}(`, navn)

const stubb = `
  const FAGGRUPPER = [{ id:'tomrer', name:'Tømrer', defaultLonn:380, defaultSosiale:15,
    defaultFaste:25, defaultFortjenestLonn:25, defaultFortjenesteInnkjop:30,
    defaultMatJustering:5, defaultGrunntidJustering:1.0 }];
  const getFaggruppe = () => FAGGRUPPER[0];
  const GRUNNTID_POSTER = []; const tommeGrunntidPoster = () => ({});
`

const { bygningsdelDetaljer, beregnBygningsdel } = new Function([
  stubb,
  fn('satsEllerNull'), fn('uePaaslagFor'), fn('getDefaultFaktorer'),
  fn('beregnArbeidskostnad'), fn('beregnMaterialkostnad'),
  fn('beregnBygningsdel'), fn('bygningsdelDetaljer'),
  'return { bygningsdelDetaljer, beregnBygningsdel };',
].join('\n\n'))()

let feil = 0, antall = 0
const fakt = {
  produksjonslonn: 380, sosiale_prosent: 15, faste_prosent: 25,
  fortjeneste_lonn_prosent: 25, fortjeneste_innkjop_prosent: 30,
  mat_justering_prosent: 5, grunntid_justering: 1,
}

// Summen av detaljlinjene skal være lik bygningsdelens egen sum.
const sjekkSummerer = (navn, bd, faktorer = fakt) => {
  antall++
  const bdt = beregnBygningsdel(bd, faktorer)
  const rader = bygningsdelDetaljer(bd, faktorer)
  const sum = rader.reduce((s, r) => s + (r.amount || 0), 0)
  const diff = Math.abs(sum - bdt.totalMedFortjeneste)
  const ok = diff < 0.01
  if (!ok) {
    feil++
    console.error(`  ✗ ${navn}`)
    console.error(`      detaljer: ${sum.toFixed(2)}   bygningsdel: ${bdt.totalMedFortjeneste.toFixed(2)}   avvik: ${(sum - bdt.totalMedFortjeneste).toFixed(2)}`)
    rader.forEach(r => console.error(`         ${String(r.text).padEnd(30)} ${r.amount.toFixed(2)}`))
  } else {
    console.log(`  ✓ ${navn.padEnd(52)} ${rader.length} linjer, ${sum.toFixed(2)}`)
  }
}

const arb = [{ id: 'a1', beskrivelse: 'Montering', grunntid: 0.5 }]
const mat = [{ id: 'm1', varenavn: 'Gips', mengde: 1.05, enhet: 'm²', enhetspris: 40 }]

console.log('\n── Detaljlinjene skal summere til bygningsdelens sum ──')
sjekkSummerer('kun arbeid', { mengde: 10, arbeidsarter: arb, materialer: [], underleverandorer: [] })
sjekkSummerer('kun materiell', { mengde: 10, arbeidsarter: [], materialer: mat, underleverandorer: [] })
sjekkSummerer('arbeid + materiell', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [] })

console.log('\n── UE (avvik 1) ──')
sjekkSummerer('med UE, arvet sats', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [{ id: 'u1', navn: 'Rør AS', kostnad: 500 }] })
sjekkSummerer('med UE, egen sats 12 %', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [{ id: 'u1', navn: 'Rør AS', kostnad: 500, paaslag: 12 }] })
sjekkSummerer('med UE, 0 % påslag', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [{ id: 'u1', navn: 'Rør AS', kostnad: 500, paaslag: 0 }] })
sjekkSummerer('flere UE-linjer', { mengde: 10, arbeidsarter: [], materialer: [], underleverandorer: [{ id: 'u1', navn: 'A', kostnad: 300 }, { id: 'u2', navn: 'B', kostnad: 700, paaslag: 15 }] })
sjekkSummerer('fagets UE-sats slår innkjøpsmargin',
  { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [{ id: 'u1', navn: 'Rør AS', kostnad: 500 }] },
  { ...fakt, ue_paaslag_prosent: 12 })

console.log('\n── Flatetillegg og åpningstillegg (avvik 2 og 3) ──')
sjekkSummerer('med flatetillegg', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [], flatetillegg: [{ id: 'f1', antall: 4, timer_per_flate: 0.3 }] })
sjekkSummerer('med åpningstillegg', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [], apningstillegg: [{ id: 'o1', antall: 2, areal: 2.0, timer_per_tillegg: 0.5 }] })
sjekkSummerer('begge tillegg', { mengde: 10, arbeidsarter: arb, materialer: mat, underleverandorer: [], flatetillegg: [{ id: 'f1', antall: 4, timer_per_flate: 0.3 }], apningstillegg: [{ id: 'o1', antall: 2, areal: 3.0, timer_per_tillegg: 0.5 }] })

console.log('\n── Åpningsfradrag på materialer (avvik 4) ──')
sjekkSummerer('åpningsfradrag aktivt (default)', { mengde: 100, arbeidsarter: arb, materialer: mat, underleverandorer: [], apningstillegg: [{ id: 'o1', antall: 4, areal: 2.0, timer_per_tillegg: 0.5 }] })
sjekkSummerer('åpningsfradrag avslått', { mengde: 100, fradrag_apninger: false, arbeidsarter: arb, materialer: mat, underleverandorer: [], apningstillegg: [{ id: 'o1', antall: 4, areal: 2.0, timer_per_tillegg: 0.5 }] })

console.log('\n── Alt samtidig — den realistiske bygningsdelen ──')
sjekkSummerer('arbeid + materiell + UE + begge tillegg + fradrag', {
  mengde: 120, arbeidsarter: arb, materialer: mat,
  underleverandorer: [{ id: 'u1', navn: 'Rør AS', beskrivelse: 'Sanitær', kostnad: 250, paaslag: 12 }],
  flatetillegg: [{ id: 'f1', antall: 6, timer_per_flate: 0.3 }],
  apningstillegg: [{ id: 'o1', antall: 5, areal: 2.4, timer_per_tillegg: 0.5, baerende: true }],
})

console.log('\n── Anonymisering: kundevendt vs intern ──')
const medUe = { mengde: 10, arbeidsarter: [], materialer: [], underleverandorer: [{ id: 'u1', navn: 'Rør AS', beskrivelse: 'Sanitær', kostnad: 500 }] }
const kunde = bygningsdelDetaljer(medUe, fakt)
const intern = bygningsdelDetaljer(medUe, fakt, { visUeNavn: true })
const sjekkTekst = (navn, faktisk, ventet) => {
  antall++
  if (faktisk === ventet) console.log(`  ✓ ${navn.padEnd(52)} «${faktisk}»`)
  else { feil++; console.error(`  ✗ ${navn}\n      fikk «${faktisk}», ventet «${ventet}»`) }
}
sjekkTekst('kundevendt skjuler firmanavn', kunde[0].text, 'Underentreprise — Sanitær')
sjekkTekst('intern viser firmanavn', intern[0].text, 'Rør AS — Sanitær')
antall++
if (kunde[0].text.includes('Rør AS')) { feil++; console.error('  ✗ FIRMANAVN LEKKER til kundevendt dokument') }
else console.log('  ✓ ingen firmanavn i kundevendt tekst')

console.log(`\n${antall - feil} av ${antall} OK`)
console.log(feil ? 'FEILET' : 'OK — detaljlinjene summerer til bygningsdelens sum')
process.exit(feil ? 1 : 0)
