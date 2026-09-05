// Verifiserer beslutningen «kopier eller koble» i Prosjektfiler, og at
// fase-filteret i fillista er formulert riktig.
//
// Bakgrunn: «Velg eksisterende fil» gjorde tidligere UPDATE på fase+doc_type.
// Knyttet man en anbudstegning til et utførelseskrav, FLYTTET filen seg —
// anbudskravet ble stående åpent etterpå, og anbudsfasen mistet dokumentet som
// lå til grunn for prisen. Det er en datatapsvei i et KS-system.
//
// Nå kopieres filen når den hører hjemme i en annen fase. Beslutningen er én
// linje, og en feil i den er stille: brukeren ser ikke at originalen forsvant.
//
// Kjør:  node tests/fase-kopiering.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const src = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

let feil = 0, antall = 0
const sjekk = (navn, faktisk, ventet) => {
  antall++
  if (faktisk === ventet) console.log(`  ✓ ${navn.padEnd(56)} ${faktisk}`)
  else { feil++; console.error(`  ✗ ${navn}\n      fikk ${JSON.stringify(faktisk)}, ventet ${JSON.stringify(ventet)}`) }
}
const kritisk = (m) => { feil++; console.error('  ✗ ' + m) }

// ── Hent den EKTE beslutningsfunksjonen ut av kilden ─────────────────────────
const start = src.indexOf('const linkHandling = (fil) =>')
if (start === -1) {
  console.error('✗ Fant ikke linkHandling i src/App.jsx. Omdøpt eller flyttet?')
  process.exit(1)
}
const slutt = src.indexOf('\n  }', start)
const kilde = src.slice(start, slutt + 4)
const linkHandling = new Function('linkTarget', kilde + '\nreturn linkHandling;')

console.log('\n── Kopier eller koble ──')
{
  const mot = linkHandling({ phase: 'utforelse', doc_type: 'arbeidstegninger' })
  sjekk('fil i anbud → utførelseskrav: KOPIER', mot({ fase: 'anbud' }), 'kopierer')
  sjekk('fil i kontrakt → utførelseskrav: KOPIER', mot({ fase: 'kontrakt' }), 'kopierer')
  sjekk('fil i SAMME fase: koble', mot({ fase: 'utforelse' }), 'kobler')
  sjekk('fil UTEN fase (null): koble', mot({ fase: null }), 'kobler')
  sjekk('fil uten fase (undefined): koble', mot({}), 'kobler')
  sjekk('fil med tom fase: koble', mot({ fase: '' }), 'kobler')
}
{
  const mot = linkHandling({ phase: 'anbud', doc_type: 'tegninger_byggherre' })
  sjekk('fil i utførelse → anbudskrav: KOPIER', mot({ fase: 'utforelse' }), 'kopierer')
  sjekk('fil i anbud → anbudskrav: koble', mot({ fase: 'anbud' }), 'kobler')
}
{
  // Uten linkTarget skal den ikke påstå at noe kopieres
  const mot = linkHandling(null)
  sjekk('uten mål: koble (trygg default)', mot({ fase: 'anbud' }), 'kobler')
  sjekk('uten fil: koble (trygg default)', mot(null), 'kobler')
}

// ── Strukturelle krav i selve kopieringen ────────────────────────────────────
// Logikken ligger i kopierFilTilFase, som begge veiene inn deler.
console.log('\n── Kopigrenen må være trygg ──')
const cl = src.slice(src.indexOf('const kopierFilTilFase = async'), src.indexOf('const confirmLink = async (fileId)'))

antall++
if (/storage\.from\('plattform-files'\)\.copy\(/.test(cl)) console.log('  ✓ bruker storage.copy (ingen ned-/opplasting)')
else kritisk('kopigrenen bruker ikke storage.copy')

antall++
// Mønsteret «if (error) brukSti = sti» finnes for bilder. Her ville det gitt to
// rader på samme file_url, og confirmDelete fjerner objektet ubetinget.
if (/if \(copyErr\) throw/.test(cl)) console.log('  ✓ feilet copy AVBRYTER (ingen fallback til delt sti)')
else kritisk('kopigrenen faller tilbake på originalens sti ved feil — det gir delt file_url')

antall++
if (/kopiert_fra_id:\s*fil\.id/.test(cl)) console.log('  ✓ setter kopiert_fra_id')
else kritisk('kopien får ikke kopiert_fra_id')

antall++
if (!/document_group:/.test(cl)) console.log('  ✓ arver IKKE document_group (egen revisjonshistorikk)')
else kritisk('kopien arver document_group — en revisjon i én fase ville arkivert den andre')

antall++
if (/revision_label:\s*'Rev01'/.test(cl)) console.log('  ✓ kopien starter på Rev01')
else kritisk('kopien får ikke revision_label Rev01')

// ── Fase-filteret i fillista ─────────────────────────────────────────────────
console.log('\n── Fillista filtreres på fase, men slipper gjennom fase=null ──')
const lp = src.slice(src.indexOf('const loadPanel = async (reset)'), src.indexOf('const loadArchived'))

antall++
if (/fase\.is\.null,fase\.eq\.\$\{viewedPhase\}/.test(lp)) console.log('  ✓ filteret er «fase is null OR fase = viewedPhase»')
else kritisk('fase-filteret mangler eller slipper ikke gjennom filer uten fase')

antall++
if (/if \(hasFaser && viewedPhase\)/.test(lp)) console.log('  ✓ filtrerer kun når prosjektet HAR faser')
else kritisk('filteret er ikke betinget av hasFaser — prosjekter uten mal ville mistet filer')

antall++
if (/viewedPhase \? viewedPhase : '_'|viewedPhase \|\| '_'/.test(lp)) console.log('  ✓ fasen er med i cache-nøkkelen')
else kritisk('cache-nøkkelen mangler fasen — offline ville vist én fases filer i en annen')

// ── Defaulten ved opplasting ─────────────────────────────────────────────────
console.log('\n── Opplasting havner i fasen brukeren ser på ──')
antall++
if (/fase: viewedPhase \|\| projectMeta\?\.active_phase/.test(src)) {
  console.log('  ✓ defaulten er viewedPhase, ikke prosjektets active_phase')
} else {
  kritisk('opplastingens fase-default bruker ikke viewedPhase først')
}

// ── «Send til fase» — den andre veien inn ────────────────────────────────────
// Kopieringen skal ikke være skrevet to ganger. Det var nettopp slik
// detaljlinjene i tilbuds-PDF-en endte opp med fire ulike feil: samme logikk
// håndskrevet tre steder, som drev fra hverandre.
console.log('\n── Send til fase gjenbruker kopieringen ──')

antall++
if (/const kopierFilTilFase = async \(fil, maalfase, docType\)/.test(src)) {
  console.log('  ✓ kopieringen ligger i én delt hjelper')
} else {
  kritisk('kopierFilTilFase finnes ikke — er logikken skrevet på nytt?')
}

// Begge veiene må gå gjennom hjelperen.
const antallKall = (src.match(/await kopierFilTilFase\(/g) || []).length
antall++
if (antallKall >= 2) console.log(`  ✓ begge veiene kaller hjelperen (${antallKall} kallsteder)`)
else kritisk(`bare ${antallKall} kallsted til kopierFilTilFase — én av veiene kopierer på egen hånd`)

// Storage-kopieringen skal finnes NØYAKTIG ett sted.
const antallCopy = (src.match(/storage\.from\('plattform-files'\)\.copy\(/g) || []).length
const antallIProsjektfiler = (src.slice(src.indexOf('const kopierFilTilFase'), src.indexOf('const confirmLink')).match(/\.copy\(/g) || []).length
antall++
if (antallIProsjektfiler === 1) console.log('  ✓ storage.copy står ett sted i Prosjektfiler')
else kritisk(`storage.copy står ${antallIProsjektfiler} steder i kopihjelperen — skal være nøyaktig ett`)

const sf = src.slice(src.indexOf('const confirmSendTilFase'), src.indexOf('const setActivePhase'))

antall++
if (/kopierFilTilFase\(t\.fil, maalfase, null\)/.test(sf)) {
  console.log('  ✓ doc_type = null: kopien lukker ikke et krav av seg selv')
} else {
  kritisk('confirmSendTilFase setter doc_type — filen sendes til en FASE, ikke til et krav')
}

antall++
if (/setSendFaseLagrer\(true\)/.test(sf) && /sendFaseLagrer\) return/.test(sf)) {
  console.log('  ✓ dobbeltklikk gir ikke to kopier')
} else {
  kritisk('confirmSendTilFase har ingen sperre mot dobbeltklikk')
}

// «Finnes allerede her» må dekke både originalen og kopiene av den.
const os = src.slice(src.indexOf('const openSendTilFase'), src.indexOf('const confirmSendTilFase'))
antall++
if (/kopiert_fra_id === fil\.id/.test(os) && /r\.id === fil\.id/.test(os)) {
  console.log('  ✓ finner både originalen og dens kopier')
} else {
  kritisk('openSendTilFase sporer ikke slektskapet — samme fil kunne kopieres dit den alt er')
}

antall++
if (/onSendTilFase\?/.test(src) || /onSendTilFase &&/.test(src)) {
  console.log('  ✓ knappen vises kun når den er sendt inn (prosjekt med faser)')
} else {
  kritisk('FileRow sjekker ikke om onSendTilFase finnes')
}

antall++
if (/onSendTilFase=\{hasFaser \? openSendTilFase : undefined\}/.test(src)) {
  console.log('  ✓ knappen kobles kun inn når prosjektet har faser')
} else {
  kritisk('onSendTilFase sendes inn uten hasFaser-sjekk')
}

// ── Kategoritellerne følger samme filter som lista ───────────────────────────
// Tellerne har en EGEN kilde (RPC-en), ikke fillistas spørring. Da fase-
// filteret kom i lista, ble tellerne stående igjen og summerte alle faser: én
// tegning kopiert til tre faser ga «3 filer» over en liste med én, i hver av
// de tre fanene.
//
// Merk at summeringen er en vanlig funksjon, ikke useMemo. Første forsøk brukte
// useMemo og leste `hasFaser`, som deklareres lenger ned i komponenten — det ga
// «Cannot access before initialization» og feilskjerm i produksjon.
// tests/prosjektfiler-monterer.mjs vokter den grensen; her sjekkes regnestykket.
console.log('\n── Kategoritellerne ──')

const trStart = src.indexOf('const tellerRader = (catId, sub) =>')
if (trStart === -1) {
  kritisk('Fant ikke tellerRader — er summeringen flyttet eller omdøpt?')
} else {
  const kropp = src.slice(src.indexOf('{', trStart) + 1, src.indexOf('\n  }', trStart))
  const teller = new Function('countRows', 'hasFaser', 'viewedPhase', 'catId', 'sub', kropp)

  // Det observerte tilfellet: samme tegning kopiert til tre faser, pluss én
  // fil uten fase (som skal vises overalt).
  const rader = [
    { phase: 'anbud',     category: 'tegninger', sub_folder: 'Arkitekttegninger', antall: 1 },
    { phase: 'kontrakt',  category: 'tegninger', sub_folder: 'Arkitekttegninger', antall: 1 },
    { phase: 'utforelse', category: 'tegninger', sub_folder: 'Arkitekttegninger', antall: 1 },
    { phase: null,        category: 'tegninger', sub_folder: 'Arkitekttegninger', antall: 1 },
    { phase: 'anbud',     category: 'okonomi',   sub_folder: null,                antall: 1 },
  ]
  const iFase = (f, cat, sub) => teller(rader, true, f, cat, sub)

  sjekk('Utførelse: egen fase + uten fase', iFase('utforelse', 'tegninger'), 2)
  sjekk('Utførelse: undermappe teller likt', iFase('utforelse', 'tegninger', 'Arkitekttegninger'), 2)
  sjekk('Utførelse: økonomi hører til anbud', iFase('utforelse', 'okonomi'), 0)
  sjekk('Anbud: tegninger', iFase('anbud', 'tegninger'), 2)
  sjekk('Anbud: økonomi', iFase('anbud', 'okonomi'), 1)
  sjekk('FDV: bare fila uten fase', iFase('fdv', 'tegninger'), 1)
  sjekk('uten faser: teller alle rader', teller(rader, false, null, 'tegninger'), 4)

  // Før fiksen viste alle fanene 4. Det var hele feilen.
  antall++
  if (iFase('utforelse', 'tegninger') !== 4 && iFase('anbud', 'tegninger') !== 4) {
    console.log('  ✓ ingen fane viser summen av alle faser')
  } else { feil++; console.error('  ✗ telleren summerer fortsatt på tvers av faser') }
}

antall++
if (/const \[countRows, setCountRows\] = useState\(\[\]\)/.test(src)) {
  console.log('  ✓ rådataene fra RPC beholdes (summen utledes ved behov)')
} else {
  kritisk('countRows finnes ikke — er tellerne lagret ferdig summert igjen?')
}

// Summeringen MÅ være lat. Et useMemo her leser hasFaser før den er deklarert.
antall++
if (!/const \{ catCounts, subCounts \} = React\.useMemo/.test(src)) {
  console.log('  ✓ summeringen er lat (ikke useMemo over en senere deklarasjon)')
} else {
  kritisk('catCounts/subCounts er tilbake i et useMemo — det krasjet produksjon en gang')
}

console.log(`\n${antall - feil} av ${antall} OK`)
console.log(feil ? 'FEILET' : 'OK — kopiering og fase-filtrering er som avtalt')
process.exit(feil ? 1 : 0)
