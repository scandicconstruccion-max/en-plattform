// Verifiserer arkiveringen av tilbuds-PDF-en i Prosjektfiler.
//
// Når et tilbud sendes fra kalkylen, får kunden PDF-en som e-postvedlegg. Den
// PDF-en er dokumentet kunden faktisk mottok, og den skal arkiveres — ellers
// står kravet «Tilbudsbrev» i Prosjektfiler som en åpen mangel selv om
// tilbudet er sendt.
//
// Tre ting må stemme, og alle tre er lette å få feil:
//   · doc_type slås opp fra PROSJEKTETS krav. Kravet heter «tilbud» i noen
//     dokumentmaler og «tilbudsbrev» i andre. En fil har bare én doc_type.
//   · Nøkkelen er rotId (parent_calculation_id || id), ikke kalkylens egen id.
//     En revisjon skal bli Rev02 på samme dokument; en ANNEN kalkyle på samme
//     prosjekt skal bli sitt eget dokument.
//   · base64 → File må gi en fil med riktig størrelse og innhold.
//
// Testen kjører den EKTE arkiverTilbudsPdf mot en stubbet supabase, og
// inspiserer hva den ville skrevet.
//
// Kjør:  node tests/tilbudsarkiv.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rot = dirname(dirname(fileURLToPath(import.meta.url)))
const src = readFileSync(join(rot, 'src', 'App.jsx'), 'utf8')

const hent = (innledning, navn) => {
  const start = src.indexOf(innledning)
  if (start === -1) { console.error(`✗ Fant ikke «${navn}» i src/App.jsx.`); process.exit(1) }
  return src.slice(start, src.indexOf('\n}', start) + 2)
}

// ── Stubbet supabase som registrerer hva som skrives ─────────────────────────
const lag = () => {
  const logg = { upload: [], insert: [], revisjon: [] }
  let prosjektKrav = []
  let eksisterendeFil = null

  const kjede = (tabell) => {
    const q = {
      _tabell: tabell,
      select() { return q }, eq() { return q }, or() { return q },
      order() { return q },
      limit() {
        if (tabell === 'project_files') return Promise.resolve({ data: eksisterendeFil ? [eksisterendeFil] : [] })
        return Promise.resolve({ data: [] })
      },
      single() {
        if (tabell === 'projects') return Promise.resolve({ data: { required_docs: prosjektKrav } })
        return Promise.resolve({ data: null })
      },
      insert(rad) { logg.insert.push({ tabell, rad }); return Promise.resolve({ error: null }) },
      update() { return q },
    }
    // .eq() etter .update() må også kunne awaites (arkiveringen av gammel rad)
    q.then = undefined
    return q
  }

  const supabase = {
    from: (t) => kjede(t),
    storage: { from: () => ({ upload: (path, fil) => { logg.upload.push({ path, navn: fil.name, size: fil.size, type: fil.type }); return Promise.resolve({ error: null }) } }) },
  }
  return {
    supabase, logg,
    settKrav: (k) => { prosjektKrav = k },
    settEksisterende: (f) => { eksisterendeFil = f },
  }
}

let feil = 0, antall = 0
const sjekk = (navn, faktisk, ventet) => {
  antall++
  if (faktisk === ventet) console.log(`  ✓ ${navn.padEnd(54)} ${JSON.stringify(faktisk)}`)
  else { feil++; console.error(`  ✗ ${navn}\n      fikk ${JSON.stringify(faktisk)}, ventet ${JSON.stringify(ventet)}`) }
}

// Bygger en fersk kjøring med gitt oppsett.
const kjor = async ({ krav = [], eksisterende = null, projectId = 'p1', rotId = 'r1' } = {}) => {
  const m = lag()
  m.settKrav(krav); m.settEksisterende(eksisterende)
  const revisjonKall = []
  const ctx = {
    supabase: m.supabase,
    uploadRevisionRow: async (args) => { revisjonKall.push(args) },
    console: { warn: () => {} },
    atob, Uint8Array, File,
  }
  const fn = new Function(...Object.keys(ctx), hent('async function arkiverTilbudsPdf(', 'arkiverTilbudsPdf') + '\nreturn arkiverTilbudsPdf;')(...Object.values(ctx))
  const base64 = Buffer.from('%PDF-1.4 testinnhold').toString('base64')
  const res = await fn({ projectId, rotId, filename: 'Tilbud KALK-0001 – Bad.pdf', base64, user: { id: 'u1' } })
  return { res, logg: m.logg, revisjonKall }
}

const KRAV_TILBUDSBREV = [
  { phase: 'anbud', category: 'tegninger', doc_type: 'tegninger', label: 'Tegninger' },
  { phase: 'anbud', category: 'okonomi', doc_type: 'tilbudsbrev', label: 'Tilbudsbrev' },
]
const KRAV_TILBUD = [{ phase: 'anbud', category: 'okonomi', doc_type: 'tilbud', label: 'Tilbud' }]

console.log('\n── doc_type slås opp per prosjekt, ikke hardkodes ──')
{
  const { logg } = await kjor({ krav: KRAV_TILBUDSBREV })
  sjekk('mal med «tilbudsbrev»', logg.insert[0]?.rad?.doc_type, 'tilbudsbrev')
  sjekk('fase settes til anbud', logg.insert[0]?.rad?.fase, 'anbud')
}
{
  const { logg } = await kjor({ krav: KRAV_TILBUD })
  sjekk('mal med «tilbud»', logg.insert[0]?.rad?.doc_type, 'tilbud')
}
{
  const { logg } = await kjor({ krav: [] })
  sjekk('prosjekt uten krav → doc_type null', logg.insert[0]?.rad?.doc_type, null)
  sjekk('prosjekt uten krav → fase null', logg.insert[0]?.rad?.fase, null)
  sjekk('filen lagres likevel', logg.insert.length, 1)
}
{
  // Krav finnes i anbud, men i en annen kategori — skal ikke plukkes
  const { logg } = await kjor({ krav: [{ phase: 'anbud', category: 'tegninger', doc_type: 'tegninger' }] })
  sjekk('feil kategori plukkes ikke', logg.insert[0]?.rad?.doc_type, null)
}
{
  // Riktig kategori, men feil fase
  const { logg } = await kjor({ krav: [{ phase: 'utforelse', category: 'okonomi', doc_type: 'tilbud' }] })
  sjekk('feil fase plukkes ikke', logg.insert[0]?.rad?.doc_type, null)
}

console.log('\n── Første gang: ny fil ──')
{
  const { res, logg, revisjonKall } = await kjor({ krav: KRAV_TILBUD })
  sjekk('lastet opp én fil', logg.upload.length, 1)
  sjekk('filnavn bevart', logg.upload[0]?.navn, 'Tilbud KALK-0001 – Bad.pdf')
  sjekk('mime-type', logg.upload[0]?.type, 'application/pdf')
  sjekk('File har innhold', logg.upload[0]?.size, Buffer.from('%PDF-1.4 testinnhold').length)
  sjekk('path under prosjektet', logg.upload[0]?.path?.startsWith('projects/p1/'), true)
  sjekk('rad opprettet', logg.insert.length, 1)
  sjekk('source_calculation_id = rotId', logg.insert[0]?.rad?.source_calculation_id, 'r1')
  sjekk('kategori okonomi', logg.insert[0]?.rad?.category, 'okonomi')
  sjekk('Rev01', logg.insert[0]?.rad?.revision_label, 'Rev01')
  sjekk('ikke arkivert', logg.insert[0]?.rad?.archived, false)
  sjekk('ingen revisjon kalt', revisjonKall.length, 0)
  sjekk('rapporterer ny fil', res?.revisjon, false)
}

console.log('\n── Andre gang, SAMME kalkyle: revisjon ──')
{
  const tidligere = { id: 'f1', project_id: 'p1', source_calculation_id: 'r1', doc_type: 'tilbud', fase: 'anbud', name: 'Tilbud KALK-0001 – Bad.pdf' }
  const { res, logg, revisjonKall } = await kjor({ krav: KRAV_TILBUD, eksisterende: tidligere })
  sjekk('uploadRevisionRow kalt', revisjonKall.length, 1)
  sjekk('basefilen er den tidligere', revisjonKall[0]?.baseFile?.id, 'f1')
  sjekk('ingen direkte insert', logg.insert.length, 0)
  sjekk('ingen direkte upload', logg.upload.length, 0)
  sjekk('rapporterer revisjon', res?.revisjon, true)
}

console.log('\n── Manglende data stopper trygt ──')
{
  const { res, logg } = await kjor({ krav: KRAV_TILBUD, projectId: null })
  sjekk('uten prosjekt: ingen skriving', logg.insert.length + logg.upload.length, 0)
  sjekk('uten prosjekt: rapporterer ikke arkivert', res?.arkivert, false)
}

console.log('\n── Revisjonen må ARVE koblingen ──')
// uploadRevisionRow bygger den nye raden fra en håndskreven liste felter.
// Glemmes source_calculation_id der, mister revisjonen koblingen til kalkylen,
// og NESTE sending finner ikke basefilen: den lager en ny fil i stedet for
// Rev03. Samme fallgruve som `paaslag` og `_omregning` gikk i.
{
  antall++
  const start = src.indexOf('async function uploadRevisionRow(')
  const kropp = src.slice(start, src.indexOf('\n}', start))
  if (/source_calculation_id:\s*baseFile\.source_calculation_id/.test(kropp)) {
    console.log('  ✓ uploadRevisionRow arver source_calculation_id')
  } else {
    feil++
    console.error('  ✗ uploadRevisionRow arver IKKE source_calculation_id.')
    console.error('      Da mister revisjonen koblingen til kalkylen, og neste sending')
    console.error('      lager en ny fil i stedet for å legge seg som ny revisjon.')
  }
}

console.log(`\n${antall - feil} av ${antall} OK`)
console.log(feil ? 'FEILET' : 'OK — tilbudsarkiveringen skriver riktig')
process.exit(feil ? 1 : 0)
