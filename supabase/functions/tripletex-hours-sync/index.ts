// ============================================================
// FUNKSJON: tripletex-hours-sync
// ------------------------------------------------------------
// Synker ÉN godkjent timerad fra En Plattform til Tripletex. Én vei, ett kall.
// Ingen bulk, ingen automatikk, ingen UI.
//
// Absolutte regler:
//   - KUN godkjente timer (timesheet_entries.status = 'Godkjent'). Ellers blokkeres.
//   - Ansatt-kobling ALDRI gjettet: employees.tripletex_employee_id må være satt,
//     ellers blokkeres (feil ansatt = feil lønn). Ingen fallback.
//   - Prosjektet må være synket først; er det ikke det, kalles tripletex-project-sync
//     (gjenbruk, ikke kopi). Stegene logges hver for seg.
//   - Tripletex krever en aktivitet: company_integrations.tripletex_default_activity_id
//     må være satt, ellers blokkeres. Ingen gjettet aktivitet.
//   - Ingen dobbeltføring: Tripletex' time-id lagres på vår rad; samme time igjen → noop.
//   - Aldri slett i Tripletex. Endret time etter synk → feil pent (ingen rot i lønn).
//   - Hvert forsøk logges i integration_sync_log (sanitert — ingen tokens). fields på GET.
//
// Denne runden sendes KUN normaltimer. Overtid og fravær blokkeres (eget steg senere).
//
// Hemmeligheter (delt): TRIPLETEX_ENC_KEY, TRIPLETEX_API_BASE (valgfri).
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

// ── Sanitering: ingen hemmeligheter i loggen (samme prinsipp som de andre funksjonene) ──
function redactStr(input: string, secrets: string[]): string {
  let s = input
  for (const sec of secrets) { if (sec && sec.length >= 6) s = s.split(sec).join('[REDACTED]') }
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
// Gyldig sesjonstoken for AVSENDERENS EGEN bedrift. Det cachede tokenet leses
// FØR tripletex-session kalles, så kontrollen må stå i denne fila også: med et
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
    // TO HULL, ikke ett. Denne funksjonen er den mest alvorlige av de fire:
    //   1) companyId kom fra request-body → kalleren valgte selv hvilken
    //      bedrifts Tripletex-konto timen ble ført i.
    //   2) timeraden ble hentet på .eq('id', entryId) ALENE, med service_role
    //      og uten RLS. Med egen companyId og en ANNEN bedrifts entryId kunne
    //      man ført deres ansattes timer inn i SIN egen Tripletex — og skrevet
    //      tripletex_entry_id tilbake på deres rad. Timer er lønnsgrunnlag.
    const avsender = await hentAvsender(req)

    const body = await req.json().catch(() => ({}))
    // companyId i body styrer INGENTING lenger. Den godtas kun hvis den er
    // identisk med den utledede. Feltet fjernes fra body i en senere runde.
    krevSammeBedrift(avsender, body?.companyId, '/tripletex-hours-sync')
    const companyId = avsender.companyId
    const entryId = body?.entryId
    if (!entryId) return json({ error: 'entryId er påkrevd' }, 400)

    logBase = { company_id: companyId, provider: 'tripletex', operation: 'hours_sync', entity_type: 'timesheet_entry', entity_id: entryId }

    // 1) Hent timeraden — og bare VÅR. timesheet_entries har sin egen
    //    company_id, så den kan scopes direkte uten omvei via timesheets.
    let entry: Record<string, any>
    try {
      entry = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'timesheet_entries',
        'id, timesheet_id, date, project_id, absence_type, normal_hours, overtime_50, overtime_100, status, tripletex_entry_id, tripletex_synced_hours',
        entryId, 'Fant ikke timeraden',
      )
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }

    // 2) KUN godkjente timer.
    if (entry.status !== 'Godkjent') {
      const melding = `Timen er ikke godkjent (status: «${entry.status || 'ukjent'}»). Bare godkjente timer kan sendes til Tripletex. Få timen godkjent først.`
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'not_approved' }, 400)
    }

    // 3) Denne runden: kun normaltimer på et prosjekt. Fravær og overtid blokkeres.
    if (entry.absence_type) {
      const melding = 'Dette er en fraværsføring, ikke en prosjekt-time. Fravær synkes ikke til Tripletex ennå.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'absence_not_supported' }, 400)
    }
    if (!entry.project_id) {
      const melding = 'Timen mangler prosjekt. En time må være ført på et prosjekt for å kunne synkes.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'missing_project' }, 400)
    }
    if ((Number(entry.overtime_50) || 0) > 0 || (Number(entry.overtime_100) || 0) > 0) {
      const melding = 'Timen har overtidstimer. Overtid støttes ikke ennå (kommer i eget steg) — for å unngå feil lønn.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'overtime_not_supported' }, 400)
    }
    const hours = Number(entry.normal_hours) || 0
    if (hours <= 0) {
      const melding = 'Timen har ingen normaltimer å sende.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'no_hours' }, 400)
    }

    // 4) Ansatt-kobling (via timeliste → ansatt). ALDRI gjettet.
    // Timelista og ansatten scopes OGSÅ, selv om de nås via vår egen timerad.
    // En timerad som peker på en timeliste eller ansatt i en annen bedrift er
    // en datafeil — og feil ansatt gir feil lønn. Den skal stoppe her.
    let emp: Record<string, any>
    try {
      const ts = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'timesheets', 'id, employee_id',
        String(entry.timesheet_id), 'Fant ikke timelisten eller ansatt for timeraden',
      )
      if (!ts.employee_id) {
        await log({ ...logBase, action: 'failed', error: 'Fant ikke timelisten/ansatt for timeraden' })
        return json({ error: 'Fant ikke timelisten eller ansatt for timeraden' }, 500)
      }
      emp = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'employees', 'id, first_name, last_name, tripletex_employee_id',
        String(ts.employee_id), 'Fant ikke ansatt',
      )
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }
    if (!emp.tripletex_employee_id) {
      const navn = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Ansatt'
      const melding = `${navn} er ikke koblet til en ansatt i Tripletex. Koble ansatten til riktig Tripletex-ansatt før timer kan sendes (feil kobling gir feil lønn).`
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'employee_not_linked' }, 400)
    }

    // 5) Standard aktivitet på bedriften (Tripletex krever aktivitet). ALDRI gjettet.
    const ciRead = await admin.from('company_integrations')
      .select('tripletex_default_activity_id')
      .eq('company_id', companyId).eq('provider', 'tripletex').single()
    const activityId = ciRead.data?.tripletex_default_activity_id
    if (!activityId) {
      const melding = 'Bedriften har ikke valgt en standard Tripletex-aktivitet for timer. Velg en aktivitet før timer kan sendes.'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'missing_default_activity' }, 400)
    }

    // 6) Prosjektet må være synket. Er tripletex_id tomt → synk prosjektet først (gjenbruk).
    let projRead1: Record<string, any>
    try {
      projRead1 = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'projects', 'id, tripletex_id, project_number, name, start_date',
        String(entry.project_id), 'Fant ikke prosjektet',
      )
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }
    let tripletexProjectId = projRead1.tripletex_id
    if (!tripletexProjectId) {
      const inv = await kallFunksjon('tripletex-project-sync', { companyId, projectId: entry.project_id }, avsender)
      if (!inv.ok) {
        const detail = (inv.data && inv.data.error) ? String(inv.data.error) : `HTTP ${inv.status}`
        await log({ ...logBase, action: 'skipped', error: `Prosjektet må synkes først: ${detail}`, response_summary: { step: 'project_sync' } })
        return json({ error: `Prosjektet må synkes først: ${detail}`, reason: 'project_sync_required' }, 400)
      }
      const projRead2 = await admin.from('projects').select('tripletex_id').eq('id', entry.project_id).eq('company_id', companyId).maybeSingle()
      tripletexProjectId = projRead2.data?.tripletex_id
    }
    if (!tripletexProjectId) {
      await log({ ...logBase, action: 'failed', error: 'Prosjektsynk ga ingen Tripletex-prosjekt-id' })
      return json({ error: 'Prosjektet ble ikke synket (ingen Tripletex-prosjekt-id)' }, 502)
    }

    // 6b) FORHÅNDSSJEKK: er timen datert FØR prosjektets startdato, avviser Tripletex
    //     den med 422 og en melding som ikke sier hvilken dato som er problemet. Vi
    //     fanger det her i stedet, og oppgir både timens dato, startdatoen og
    //     prosjektnummeret — det brukeren trenger for å rette.
    //     Startdatoen vi sendte til Tripletex ved opprettelse er den samme som
    //     projects.start_date, så vi kan avgjøre dette uten et ekstra kall til dem.
    const projStart = projRead1.start_date ? String(projRead1.start_date).slice(0, 10) : null
    const timeDato = String(entry.date).slice(0, 10)
    if (projStart && timeDato < projStart) {
      const prosjNr = projRead1.project_number ? `#${projRead1.project_number}` : (projRead1.name || 'prosjektet')
      const melding = `Timen er ført ${timeDato}, men prosjektet ${prosjNr} startet ${projStart} i Tripletex. `
        + 'Tripletex avviser timer som er eldre enn prosjektets startdato. '
        + `Enten flyttes prosjektets startdato tilbake til ${timeDato} eller tidligere, eller så må timen føres på nytt med en dato fra ${projStart} og utover.`
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'before_project_start', detail: `Timedato ${timeDato}, prosjektstart ${projStart}` }, 400)
    }

    // 7) Sesjon. Registrer tokenet som hemmelighet som ALLTID fjernes fra logging.
    const session = await getSession(avsender)
    secrets.push(session, btoa('0:' + session))
    const authHeader = basicAuth(session)

    // 8) Allerede ført? Verifiser at ID-en finnes i Tripletex → noop (ingen dobbeltføring).
    if (entry.tripletex_entry_id) {
      const getRes = await fetch(`${TRIPLETEX_BASE}/v2/timesheet/entry/${entry.tripletex_entry_id}?fields=id`, { headers: { Authorization: authHeader } })
      if (getRes.ok) {
        // Endret hos oss etter synk? Feil pent — vi overskriver ikke lønnstimer automatisk.
        if (entry.tripletex_synced_hours != null && Number(entry.tripletex_synced_hours) !== hours) {
          const melding = 'Timen er endret etter at den ble sendt til Tripletex. Automatisk oppdatering støttes ikke ennå — kontakt regnskap for å rette i Tripletex.'
          await log({ ...logBase, external_id: entry.tripletex_entry_id, action: 'skipped', error: melding })
          return json({ error: melding, action: 'skipped', reason: 'changed_after_sync' }, 409)
        }
        await log({ ...logBase, external_id: entry.tripletex_entry_id, action: 'noop', http_status: 200, response_summary: { note: 'allerede ført' } })
        return json({ ok: true, action: 'noop', tripletexEntryId: entry.tripletex_entry_id })
      }
      // 404: ført-ID ugyldig (slettet i Tripletex?) → vi faller gjennom og oppretter på nytt.
    }

    // 9) Opprett timeføring i Tripletex.
    const payload: Record<string, unknown> = {
      employee: { id: emp.tripletex_employee_id },
      project: { id: tripletexProjectId },
      activity: { id: activityId },
      date: String(entry.date).slice(0, 10),
      hours,
    }
    const cRes = await fetch(`${TRIPLETEX_BASE}/v2/timesheet/entry`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const cText = await cRes.text()
    if (!cRes.ok) {
      await admin.from('timesheet_entries').update({ tripletex_sync_error: `Opprett feilet (${cRes.status})` }).eq('id', entryId).eq('company_id', companyId)
      await skrivEksternKobling({ companyId, entityType: 'timesheet_entry', entityId: entryId, syncError: `Opprett feilet (${cRes.status})` })
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: `Opprett feilet: ${cText.slice(0, 400)}` })
      return json({ error: `Tripletex avviste timeføringen (${cRes.status})`, detail: cText.slice(0, 400) }, 502)
    }
    const created = safeJson(cText)?.value
    if (!created?.id) {
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: 'Svar manglet id' })
      return json({ error: 'Uventet svar fra Tripletex (mangler id)', detail: cText.slice(0, 400) }, 502)
    }

    await admin.from('timesheet_entries').update({
      tripletex_entry_id: created.id,
      tripletex_synced_hours: hours,
      tripletex_synced_at: new Date().toISOString(),
      tripletex_sync_error: null,
    }).eq('id', entryId).eq('company_id', companyId)
    // synced_hours har ingen egen kolonne i external_links — den er ikke
    // koblingsmetadata, men verdien vi FAKTISK sendte, brukt til å oppdage at
    // timen er endret hos oss etterpå (se sjekken lenger oppe). Den bor i
    // metadata, så neste regnskapssystem ikke krever en ny kolonne.
    await skrivEksternKobling({
      companyId, entityType: 'timesheet_entry', entityId: entryId,
      externalId: created.id, syncedAt: new Date().toISOString(), syncError: null,
      metadata: { synced_hours: hours },
    })
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { hours } })
    return json({ ok: true, action: 'created', tripletexEntryId: created.id })
  } catch (e) {
    // Avvisninger fra kontrollen bærer sin egen status og en tekst som er trygg
    // å vise. logBase er tom hvis kontrollen avviste FØR vi visste hvilken
    // bedrift og hvilken timerad det gjaldt — da finnes ingen meningsfull rad å
    // skrive i integration_sync_log, og [SIKKERHET]-linja står allerede i
    // funksjonsloggen.
    const melding = (e as Error)?.message ?? String(e)
    if (logBase.company_id) await log({ ...logBase, action: 'failed', error: melding })
    if (e instanceof AvvistFeil) return json({ error: melding }, e.status)
    return json({ error: melding }, 500)
  }
})
