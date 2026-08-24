// ============================================================
// FUNKSJON: tripletex-project-sync
// ------------------------------------------------------------
// Synker ÉN prosjekt fra En Plattform til Tripletex. Én vei, ett kall, ett prosjekt.
// Ingen bulk, ingen automatikk, ingen tidsstyring. Ingen timer/faktura/UI.
//
// Rekkefølge og regler:
//   - Prosjektet må ha en EKTE kunde (projects.customer_id). Mangler den → blokker
//     med tydelig melding (ingen dummy-kunde).
//   - Er kunden ikke synket til Tripletex ennå: kall den DEPLOYEDE funksjonen
//     tripletex-customer-sync (samme logikk gjenbrukes — ikke kopiert). Logges separat.
//   - Underprosjekt (projects.parent_id satt) → IKKE støttet ennå: blokker pent.
//   - Matching på prosjektnummer. Finnes nummeret i Tripletex → koble til og lagre
//     tripletex_id på vårt prosjekt. Aldri duplikat.
//   - Aldri slett i Tripletex. Aldri overskriv felter der på et prosjekt som finnes fra før.
//   - Hvert forsøk logges i integration_sync_log (sanitert — ingen tokens).
//
// Hemmeligheter (delt på prosjektnivå): TRIPLETEX_ENC_KEY, TRIPLETEX_API_BASE (valgfri).
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY og SUPABASE_ANON_KEY leveres
// automatisk av Supabase.
//
// ÉN FIL, MED VILJE. Autorisasjonsblokken under hører logisk hjemme i en egen
// fil, men Supabase-dashbordets Code-fane er vår eneste deployvei, og den kan
// ikke opprette nye filer. Alt som skal deployes må stå i index.ts. Blokken er
// derfor kopiert inn i hver funksjon, og skal holdes identisk mellom dem.
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

// ── HVEM SPØR, OG HVILKEN BEDRIFT GJELDER KALLET? ──────────────────────────
// ------------------------------------------------------------
// Bakgrunnen, kort: alle Tripletex-funksjonene tok imot companyId i request-
// body og kjørte med service_role. Da bestemmer kalleren selv hvilken bedrift
// han opererer i, og RLS gjelder ikke. tripletex-session kunne på den måten
// skrive en annen bedrifts Tripletex-nøkkel.
//
// «Verify JWT»-bryteren i dashbordet stopper ikke dette. Den er «verify with
// legacy secret», og den OFFENTLIGE anon-nøkkelen tilfredsstiller den. Hele
// kontrollen må derfor ligge her, i koden.
//
// TO ULIKE TING, HOLDT FRA HVERANDRE:
//   · HVEM SPØR      → alltid kallerens bruker-JWT. Aldri body, aldri en
//                       delt hemmelighet, aldri service-role-nøkkelen.
//   · HVILKE RETTIGHETER spørringen kjører med → service_role, men FØRST
//                       etter at kontrollen har passert.
//
// STØTTEØKT TRENGER INGEN UNNTAK. auth_company_id() er en coalesce som
// returnerer target_company_id fra en aktiv support_sessions-rad. Under en
// støtteøkt svarer den derfor med KUNDENS bedrift helt av seg selv, og en
// riktig kontroll slipper plattformeieren inn uten en eneste særregel.
// Trenger noen et unntak for støtteøkt her, er kontrollen bygget feil.

type Avsender = {
  userId: string
  companyId: string
  jwt: string
}

// Kastes av kontrollene under. Bæreren av en HTTP-status og en tekst som er
// trygg å vise til kalleren — aldri noe om hva som finnes på innsiden.
class AvvistFeil extends Error {
  status: number
  constructor(melding: string, status: number) {
    super(melding)
    this.name = 'AvvistFeil'
    this.status = status
  }
}

// Sikkerhetshendelser logges til funksjonsloggen med nok til å etterforske,
// og ingenting av det kalleren ikke allerede kjenner. Aldri tokens.
function loggSikkerhet(hendelse: string, detaljer: Record<string, unknown>): void {
  try {
    console.warn('[SIKKERHET] ' + hendelse + ' ' + JSON.stringify(detaljer))
  } catch (_) {
    console.warn('[SIKKERHET] ' + hendelse)
  }
}

// Leser rollen ut av JWT-ens payload UTEN å verifisere signaturen. Det er
// trygt her fordi verdien kun brukes til å AVVISE og til å skrive en
// loggmelding — aldri til å slippe noen inn. Et forfalsket token med
// role=authenticated kommer ikke lenger enn til getUser under.
//
// Grunnen til at den finnes: sammenligning mot nøkkelstrengen alene er ikke
// nok. Roteres service-role-nøkkelen, eller kommer den fra et annet prosjekt,
// treffer ikke strengsammenligningen — og da ville avvisningen sett ut som et
// helt vanlig utløpt token i loggen. Rollen står i tokenet uansett.
function lesRolleFraJwt(jwt: string): string {
  try {
    const del = jwt.split('.')[1]
    if (!del) return ''
    const b64 = del.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(pad))
    return String(payload?.role ?? '')
  } catch (_) {
    return ''
  }
}

/**
 * Fastslår hvem som spør, og hvilken bedrift kallet gjelder.
 *
 * Rekkefølgen er bevisst: de billige avvisningene først, oppslaget sist.
 */
async function hentAvsender(req: Request): Promise<Avsender> {
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) throw new AvvistFeil('Mangler Authorization', 401)

  let sti = ''
  try { sti = new URL(req.url).pathname } catch (_) { /* url skal aldri velte en avvisning */ }
  const rolle = lesRolleFraJwt(jwt)

  // Service-role-nøkkelen er IKKE en avsender. Den identifiserer ingen, og en
  // funksjon som godtar den kan kalles på vegne av hvem som helst. Interne
  // kall mellom funksjoner skal videresende brukerens JWT i stedet.
  //
  // BEGGE sjekkene står med vilje: strengen fanger vår egen nøkkel, rollen
  // fanger en rotert eller fremmed. Uten den andre ville avvisningen blitt
  // liggende i loggen som et hvilket som helst utløpt token.
  if ((SERVICE_ROLE && jwt === SERVICE_ROLE) || rolle === 'service_role') {
    loggSikkerhet('service_role brukt som avsender', { sti, rolle })
    throw new AvvistFeil('Ugyldig sesjon', 401)
  }
  // Anon-nøkkelen er offentlig og identifiserer heller ingen. Den er nøkkelen
  // «Verify JWT»-bryteren slipper gjennom, så den skal ikke komme lenger — og
  // den skal være synlig i loggen når noen prøver.
  if ((ANON_KEY && jwt === ANON_KEY) || rolle === 'anon') {
    loggSikkerhet('anon-nøkkel brukt som avsender', { sti, rolle })
    throw new AvvistFeil('Ugyldig sesjon', 401)
  }

  // Uten anon-nøkkelen kan vi ikke kalle auth_company_id() SOM brukeren, og da
  // ville vi stått igjen med body-verdien — altså hullet vi lukker. Da er det
  // riktigere å svare 500 enn å slippe kallet gjennom.
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    throw new AvvistFeil('Server mangler oppsett for autorisasjon', 500)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) throw new AvvistFeil('Ugyldig sesjon', 401)
  const userId = userData.user.id

  // auth_company_id() MÅ kalles som brukeren, ikke som service_role: den leser
  // auth.uid(). Kalt med admin-klienten ville den svart null for alle.
  const somBruker = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + jwt } },
  })
  const { data: companyId, error: cErr } = await somBruker.rpc('auth_company_id')
  if (cErr) throw new AvvistFeil('Kunne ikke avgjøre bedrift', 500)
  if (!companyId) throw new AvvistFeil('Brukeren hører ikke til en bedrift', 403)

  return { userId, companyId: String(companyId), jwt }
}

/**
 * Godtar en companyId fra request-body BARE hvis den er identisk med den
 * utledede. Feltet skal fjernes fra body i en senere runde; til da er dette
 * det som hindrer at en gammel klient stille opererer i feil bedrift.
 */
function krevSammeBedrift(avsender: Avsender, oppgitt: unknown, sti: string): void {
  if (oppgitt == null || oppgitt === '') return
  if (String(oppgitt) === avsender.companyId) return
  loggSikkerhet('companyId i body avvek fra auth_company_id()', {
    sti,
    userId: avsender.userId,
    oppgitt: String(oppgitt),
    utledet: avsender.companyId,
  })
  throw new AvvistFeil('Ikke tilgang', 403)
}

/**
 * Henter én rad på id og krever at den hører til avsenderens bedrift.
 *
 * SVARET ER LIKT i begge feilretninger — «finnes ikke» og «hører til en annen
 * bedrift» gir samme tekst og samme status. Ulike svar ville gjort endepunktet
 * til et oppslagsverk: en angriper kunne prøvd uuid-er og fått bekreftet
 * hvilke som finnes hos andre. Skillet finnes kun i loggen.
 */
async function hentEgenRad<T extends Record<string, unknown>>(
  admin: SupabaseClient,
  avsender: Avsender,
  tabell: string,
  kolonner: string,
  id: string,
  ikkeFunnetTekst: string,
): Promise<T> {
  const felter = kolonner.includes('company_id') ? kolonner : kolonner + ', company_id'
  const { data, error } = await admin.from(tabell).select(felter).eq('id', id).maybeSingle()
  if (error || !data) throw new AvvistFeil(ikkeFunnetTekst, 404)
  const rad = data as unknown as T & { company_id?: string | null }
  if (String(rad.company_id ?? '') !== avsender.companyId) {
    loggSikkerhet('rad tilhører en annen bedrift', {
      tabell,
      radId: id,
      userId: avsender.userId,
      radBedrift: String(rad.company_id ?? ''),
      avsenderBedrift: avsender.companyId,
    })
    throw new AvvistFeil(ikkeFunnetTekst, 404)   // samme svar som «finnes ikke»
  }
  return rad as T
}

// Interne kall mellom funksjoner. Brukerens JWT videresendes — mottakeren
// avviser service-role-nøkkelen med vilje, så supabase.functions.invoke() kan
// ikke brukes: den ville sendt admin-klientens nøkkel. Derfor rå fetch, så vi
// styrer Authorization selv.
//
// MERK for den som sammenligner blokkene: tripletex-session har IKKE denne
// funksjonen, fordi den ikke kaller noen andre. Alt over dette punktet skal
// være identisk i alle fem filene.
async function kallFunksjon(navn: string, kropp: unknown, avsender: Avsender): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${navn}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + avsender.jwt,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(kropp ?? {}),
  })
  const tekst = await res.text()
  let data: any = null
  try { data = JSON.parse(tekst) } catch (_) { data = { error: tekst.slice(0, 300) } }
  return { ok: res.ok, status: res.status, data }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// ─── DOBBELTSKRIVING TIL external_links (overgangen) ────────────────────────
// Vi skriver BÅDE den nye tabellen og den gamle kolonnen mens lesingen fortsatt
// går mot kolonnene. Da kan app og database ikke komme i utakt underveis:
// leser appen gammelt, finner den det; leser den nytt, finner den det også.
// Lesingen flyttes i DEL 2, og kolonnene droppes først etter det.
//
// Feiler ALDRI kallet. Er tabellen ikke opprettet ennå — rekkefølgen i
// utrullingen er funksjon før SQL i verste fall — logges det og synken går
// videre nøyaktig som før.
async function skrivEksternKobling(o: {
  companyId: string
  entityType: string
  entityId: string
  externalId?: string | number | null
  syncedAt?: string | null
  syncError?: string | null
  metadata?: Record<string, unknown> | null
  provider?: string
}) {
  try {
    await admin.from('external_links').upsert({
      company_id:  o.companyId,
      provider:    o.provider ?? 'tripletex',
      entity_type: o.entityType,
      entity_id:   o.entityId,
      external_id: o.externalId === undefined || o.externalId === null ? null : String(o.externalId),
      synced_at:   o.syncedAt ?? null,
      sync_error:  o.syncError ?? null,
      metadata:    o.metadata ?? null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'company_id,provider,entity_type,entity_id' })
  } catch (e) {
    console.error('[external_links] skriving feilet (synken fortsetter):', e)
  }
}

// CORS. Uten disse kan funksjonen ikke kalles fra nettleseren i det hele tatt:
// supabase.functions.invoke() sender authorization, x-client-info, apikey og
// content-type, og alle fire må stå i Allow-Headers. Samme mønster som
// supabase/functions/bim-sesjon-rydd/index.ts og tripletex-session.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

function safeJson(text: string): any {
  try { return JSON.parse(text) } catch { return null }
}

// ── Sanitering: ingen hemmeligheter i loggen (samme prinsipp som kundesynk) ──
function redactStr(input: string, secrets: string[]): string {
  let s = input
  for (const sec of secrets) {
    if (sec && sec.length >= 6) s = s.split(sec).join('[REDACTED]')
  }
  s = s.replace(/Basic\s+[A-Za-z0-9+/=_-]+/gi, 'Basic [REDACTED]')
  s = s.replace(/(consumerToken|employeeToken|sessionToken|token|password)=[^&\s"']+/gi, '$1=[REDACTED]')
  return s
}
function deepRedact(value: unknown, secrets: string[]): unknown {
  if (value == null) return value
  if (typeof value === 'string') return redactStr(value, secrets)
  if (Array.isArray(value)) return value.map((v) => deepRedact(v, secrets))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepRedact(v, secrets)
    return out
  }
  return value
}
async function logSync(row: Record<string, unknown>, secrets: string[] = []): Promise<void> {
  const safe: Record<string, unknown> = { ...row }
  if (safe.error !== undefined) safe.error = deepRedact(safe.error, secrets)
  if (safe.request_payload !== undefined) safe.request_payload = deepRedact(safe.request_payload, secrets)
  if (safe.response_summary !== undefined) safe.response_summary = deepRedact(safe.response_summary, secrets)
  try { await admin.from('integration_sync_log').insert(safe) } catch (_) { /* logging skal aldri velte kallet */ }
}

// Tripletex autentiserer med HTTP Basic: brukernavn '0' (token-eierens firma), passord = sesjonstoken.
function basicAuth(sessionToken: string): string {
  return 'Basic ' + btoa('0:' + sessionToken)
}

// Gyldig sesjonstoken for AVSENDERENS EGEN bedrift: bruk cachet hvis mulig,
// ellers be tripletex-session lage ett.
//
// Det cachede tokenet leses FØR tripletex-session kalles. Det er derfor
// kontrollen må stå i denne fila også, og ikke bare i tripletex-session: med et
// gyldig cachet token ville det kallet aldri skjedd.
async function getSession(avsender: Avsender): Promise<string> {
  const companyId = avsender.companyId
  const first = await admin.rpc('tripletex_get_cached_session', { p_company_id: companyId, p_key: ENC_KEY })
  if (first.error) throw new Error(`DB-feil (les sesjon): ${first.error.message}`)
  if (first.data) return first.data as string

  const inv = await kallFunksjon('tripletex-session', { companyId }, avsender)
  if (!inv.ok) {
    const detalj = (inv.data && inv.data.error) ? String(inv.data.error) : `HTTP ${inv.status}`
    throw new Error(`Kunne ikke opprette sesjon (er bedriften satt opp med employee-token?): ${detalj}`)
  }

  const second = await admin.rpc('tripletex_get_cached_session', { p_company_id: companyId, p_key: ENC_KEY })
  if (second.error) throw new Error(`DB-feil (les sesjon): ${second.error.message}`)
  if (!second.data) throw new Error('Fikk ingen gyldig Tripletex-sesjon')
  return second.data as string
}

// Tripletex krever en prosjektleder ved opprettelse. Vi bruker token-eierens egen
// ansatt (whoAmI) — og INGEN fallback: å plukke en vilkårlig ansatt som prosjektleder
// i kundens Tripletex er verre enn å feile. Settes KUN ved opprettelse. Null → kaller blokkerer.
async function resolveProjectManagerId(authHeader: string): Promise<number | null> {
  try {
    // fields: hent kun det vi bruker for prosjektleder (dekker begge mulige svar-former).
    const r = await fetch(`${TRIPLETEX_BASE}/v2/token/session/>whoAmI?fields=employeeId,employee`, { headers: { Authorization: authHeader } })
    if (r.ok) {
      const v = safeJson(await r.text())?.value
      const id = v?.employeeId ?? v?.employee?.id
      if (id) return id
    }
  } catch (_) { /* returner null → kaller stopper pent */ }
  return null
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight. MÅ ligge først — før metode-sjekken lenger nede, ellers avvises
  // OPTIONS med 405 og nettleseren sender aldri den ekte POST-en.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  let logBase: Record<string, unknown> = {}
  const secrets: string[] = []
  const log = (row: Record<string, unknown>) => logSync(row, secrets)
  try {
    if (req.method !== 'POST') return json({ error: 'Bruk POST' }, 405)
    if (!ENC_KEY) return json({ error: 'Server mangler TRIPLETEX_ENC_KEY' }, 500)

    // ── HVEM SPØR ────────────────────────────────────────────────────────
    // TO HULL, ikke ett. Begge må lukkes, og det ene lukker ikke det andre:
    //   1) companyId kom fra request-body → kalleren valgte selv hvilken
    //      bedrifts Tripletex-konto han skrev til.
    //   2) prosjektet ble hentet på .eq('id', projectId) ALENE, med
    //      service_role, altså uten RLS. Med egen companyId og en ANNEN
    //      bedrifts projectId passerte man enhver avsenderkontroll og fikk
    //      likevel lest prosjektets navn, nummer og datoer — og skrevet
    //      tripletex_id tilbake på deres rad.
    const avsender = await hentAvsender(req)

    const body = await req.json().catch(() => ({}))
    // companyId i body styrer INGENTING lenger. Den godtas kun hvis den er
    // identisk med den utledede. Feltet fjernes fra body i en senere runde.
    krevSammeBedrift(avsender, body?.companyId, '/tripletex-project-sync')
    const companyId = avsender.companyId
    const projectId = body?.projectId
    if (!projectId) return json({ error: 'projectId er påkrevd' }, 400)

    logBase = {
      company_id: companyId, provider: 'tripletex', operation: 'project_sync',
      entity_type: 'project', entity_id: projectId,
    }

    // 1) Hent vårt prosjekt — og bare VÅRT. hentEgenRad svarer likt på «finnes
    //    ikke» og «hører til en annen bedrift»; skillet står kun i
    //    [SIKKERHET]-loggen, så endepunktet ikke blir et oppslagsverk der
    //    uuid-er kan testes mot andre bedrifter.
    let proj: Record<string, any>
    try {
      proj = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'projects',
        'id, name, project_number, parent_id, customer_id, start_date, end_date, tripletex_id',
        projectId, 'Fant ikke prosjektet',
      )
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }

    const name = String(proj.name ?? '').trim()
    const projectNumber = String(proj.project_number ?? '').trim()

    // 2) Underprosjekt → ikke støttet ennå. Feil pent, ingen synk.
    if (proj.parent_id) {
      const melding = 'Dette er et underprosjekt (har et mor-prosjekt). Synk av underprosjekter '
        + 'er ikke støttet ennå. Synk mor-prosjektet i stedet, eller vent til hierarkisynk er på plass.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'subproject_not_supported' }, 400)
    }

    // 3) Krav: navn og prosjektnummer.
    if (!name) {
      await log({ ...logBase, action: 'failed', error: 'Prosjektet mangler navn' })
      return json({ error: 'Prosjektet mangler navn — kan ikke synkes' }, 400)
    }
    if (!projectNumber) {
      const melding = 'Prosjektet mangler prosjektnummer. Gi prosjektet et nummer før synk.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'missing_project_number' }, 400)
    }

    // 4) Krav: EKTE kunde (customer_id), ikke bare et løst navnefelt.
    if (!proj.customer_id) {
      const melding = 'Prosjektet mangler en ekte kunde. Velg en kunde på prosjektet '
        + '(ikke bare et løst kundenavn) før du synker det til Tripletex.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'missing_customer' }, 400)
    }

    // 5) Sørg for at kunden er synket. Gjenbruk tripletex-customer-sync (samme logikk).
    //    Logges separat av kundesynk-funksjonen (operation='customer_sync').
    // Kunden scopes OGSÅ, selv om den nås via vårt eget prosjekt. Et prosjekt
    // som peker på en kunde i en annen bedrift er en datafeil, ikke en
    // tilgang — og den skal stoppe her, ikke bli synket videre.
    let tripletexCustomerId: string | number | null = null
    try {
      const kunde = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'customers', 'id, tripletex_customer_id',
        String(proj.customer_id), 'Fant ikke kunden',
      )
      tripletexCustomerId = kunde.tripletex_customer_id ?? null
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }
    if (!tripletexCustomerId) {
      const inv = await kallFunksjon('tripletex-customer-sync', { companyId, customerId: proj.customer_id }, avsender)
      if (!inv.ok) {
        const detail = (inv.data && inv.data.error) ? String(inv.data.error) : `HTTP ${inv.status}`
        await log({ ...logBase, action: 'skipped', error: `Kunden må synkes først: ${detail}`, response_summary: { step: 'customer_sync' } })
        return json({ error: `Kunden må synkes først: ${detail}`, reason: 'customer_sync_required' }, 400)
      }
      const custRead2 = await admin.from('customers').select('tripletex_customer_id').eq('id', proj.customer_id).eq('company_id', companyId).maybeSingle()
      tripletexCustomerId = custRead2.data?.tripletex_customer_id ?? null
    }
    if (!tripletexCustomerId) {
      await log({ ...logBase, action: 'failed', error: 'Kundesynk ga ingen Tripletex-kunde-id' })
      return json({ error: 'Kunden ble ikke synket (ingen Tripletex-kunde-id)' }, 502)
    }

    // 6) Skaff sesjon. Registrer tokenet som hemmelighet som ALLTID fjernes fra logging.
    const session = await getSession(avsender)
    secrets.push(session, btoa('0:' + session))
    const authHeader = basicAuth(session)

    // 7) Allerede koblet? Verifiser at ID-en fortsatt finnes i Tripletex → ingen duplikat.
    if (proj.tripletex_id) {
      // fields=id: vi trenger bare å bekrefte at prosjektet finnes — minimal datamengde.
      const getRes = await fetch(`${TRIPLETEX_BASE}/v2/project/${proj.tripletex_id}?fields=id`, { headers: { Authorization: authHeader } })
      if (getRes.ok) {
        await log({ ...logBase, external_id: proj.tripletex_id, action: 'noop', http_status: 200, response_summary: { note: 'allerede koblet' } })
        return json({ ok: true, action: 'noop', tripletexProjectId: proj.tripletex_id })
      }
      // 404 e.l.: lagret ID ugyldig → vi matcher/oppretter på nytt.
    }

    // 8) Match på prosjektnummer.
    const q = new URL(`${TRIPLETEX_BASE}/v2/project`)
    q.searchParams.set('number', projectNumber)
    q.searchParams.set('fields', 'id,name,number')
    q.searchParams.set('count', '50')
    const sRes = await fetch(q.toString(), { headers: { Authorization: authHeader } })
    const sText = await sRes.text()
    if (!sRes.ok) {
      await log({ ...logBase, action: 'failed', http_status: sRes.status, error: `Søk feilet: ${sText.slice(0, 400)}` })
      return json({ error: `Tripletex-søk feilet (${sRes.status})`, detail: sText.slice(0, 400) }, 502)
    }
    // Verifiser eksakt nummertreff (defensivt, i tilfelle filteret er upresist).
    const match = (safeJson(sText)?.values ?? []).find((p: any) => String(p?.number ?? '').trim() === projectNumber)
    if (match?.id) {
      await admin.from('projects').update({ tripletex_id: match.id, tripletex_synced_at: new Date().toISOString(), tripletex_sync_error: null }).eq('id', projectId).eq('company_id', companyId)
      await skrivEksternKobling({ companyId, entityType: 'project', entityId: projectId, externalId: match.id, syncedAt: new Date().toISOString(), syncError: null })
      await log({ ...logBase, external_id: match.id, action: 'linked_existing', http_status: sRes.status, response_summary: { matchedOn: 'number', name: match.name } })
      return json({ ok: true, action: 'linked_existing', tripletexProjectId: match.id })
    }

    // 9) Opprett nytt prosjekt i Tripletex.
    const pmId = await resolveProjectManagerId(authHeader)
    if (!pmId) {
      const melding = 'Fant ingen prosjektleder i Tripletex. Tripletex krever en prosjektleder ved '
        + 'opprettelse, og integrasjonens employee-token må tilhøre en aktiv ansatt i Tripletex. '
        + 'Sjekk at employee-tokenet er koblet til en ansatt, og prøv igjen.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'no_project_manager' }, 400)
    }

    const payload: Record<string, unknown> = {
      name,
      number: projectNumber,
      customer: { id: tripletexCustomerId },
      projectManager: { id: pmId },
    }
    if (proj.start_date) payload.startDate = String(proj.start_date).slice(0, 10)
    if (proj.end_date) payload.endDate = String(proj.end_date).slice(0, 10)

    const cRes = await fetch(`${TRIPLETEX_BASE}/v2/project`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const cText = await cRes.text()
    if (!cRes.ok) {
      await admin.from('projects').update({ tripletex_sync_error: `Opprett feilet (${cRes.status})` }).eq('id', projectId).eq('company_id', companyId)
      await skrivEksternKobling({ companyId, entityType: 'project', entityId: projectId, syncError: `Opprett feilet (${cRes.status})` })
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: `Opprett feilet: ${cText.slice(0, 400)}` })
      return json({ error: `Tripletex avviste opprettelse (${cRes.status})`, detail: cText.slice(0, 400) }, 502)
    }
    const created = safeJson(cText)?.value
    if (!created?.id) {
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: 'Svar manglet id' })
      return json({ error: 'Uventet svar fra Tripletex (mangler id)', detail: cText.slice(0, 400) }, 502)
    }

    await admin.from('projects').update({ tripletex_id: created.id, tripletex_synced_at: new Date().toISOString(), tripletex_sync_error: null }).eq('id', projectId).eq('company_id', companyId)
    await skrivEksternKobling({ companyId, entityType: 'project', entityId: projectId, externalId: created.id, syncedAt: new Date().toISOString(), syncError: null })
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { name: created.name, number: created.number } })
    return json({ ok: true, action: 'created', tripletexProjectId: created.id })
  } catch (e) {
    // Avvisninger fra kontrollen bærer sin egen status og en tekst som er trygg
    // å vise. logBase er tom hvis kontrollen avviste FØR vi visste hvilken
    // bedrift og hvilket prosjekt det gjaldt — da finnes ingen meningsfull rad
    // å skrive i integration_sync_log, og [SIKKERHET]-linja står allerede i
    // funksjonsloggen.
    const melding = (e as Error)?.message ?? String(e)
    if (logBase.company_id) await log({ ...logBase, action: 'failed', error: melding })
    if (e instanceof AvvistFeil) return json({ error: melding }, e.status)
    return json({ error: melding }, 500)
  }
})
