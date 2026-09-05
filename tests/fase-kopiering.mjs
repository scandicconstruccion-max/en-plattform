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

// ── Strukturelle krav i confirmLink ──────────────────────────────────────────
console.log('\n── Kopigrenen må være trygg ──')
const cl = src.slice(src.indexOf('const confirmLink = async (fileId)'), src.indexOf('\n  const setActivePhase'))

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

console.log(`\n${antall - feil} av ${antall} OK`)
console.log(feil ? 'FEILET' : 'OK — kopiering og fase-filtrering er som avtalt')
process.exit(feil ? 1 : 0)
