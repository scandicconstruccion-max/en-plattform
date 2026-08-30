// ============================================================
// Edge Function: tripletex-customer-sync
// ------------------------------------------------------------
// Synker ÉN kunde fra En Plattform til Tripletex. Én vei, ett kall, én kunde.
// Ingen bulk, ingen automatikk, ingen tidsstyring.
//
// Regler (styrt av customers.type):
//   - type='bedrift'/'ue' MED org.nr → match på org.nr; finnes kunden i Tripletex → koble til
//     og lagre tripletex_customer_id, ellers opprett og lagre ID-en.
//   - type='bedrift'/'ue' UTEN org.nr → IKKE synk (ufullstendig registrering); tydelig melding
//     om at org.nr må fylles inn først.
//   - type='privat' → OPPRETT alltid ny (aldri navnematch), for å unngå å koble to ulike
//     personer sammen. Se docs for risikoforklaring.
//   - Aldri slett i Tripletex. Aldri oppdater felter på en kunde som finnes fra før
//     (vi kobler bare til den). Endring av navn/adresse hos oss synkes IKKE ennå.
//   - Hvert forsøk logges i integration_sync_log (hva ble sendt, resultat, feil) — sanitert.
//
// Hemmeligheter (delt på prosjektnivå med tripletex-session):
//   TRIPLETEX_ENC_KEY   – hovednøkkel for å lese cachet sesjonstoken
//   TRIPLETEX_API_BASE  – valgfri; default https://api-test.tripletex.tech
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY og SUPABASE_ANON_KEY leveres
// automatisk av Supabase.
// (Trenger IKKE consumer-token — sesjonen skaffes via tripletex-session.)
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

// Fjerner hemmeligheter fra en tekst: eksakte kjente verdier (sesjonstoken + dets
// Basic-auth-form) OG generiske mønstre (Basic-header, token/passord-parametre) — i
// tilfelle en feilmelding fra Tripletex, en URL eller en runtime-feil skulle bære dem.
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

// Skriver til synk-loggen. Saniterer ALLTID error/request_payload/response_summary mot
// kjente hemmeligheter — ingen token skal kunne havne i loggen, heller ikke via Tripletex-feil.
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

// Skaffer et gyldig sesjonstoken for AVSENDERENS EGEN bedrift: bruk cachet hvis
// mulig, ellers be tripletex-session lage ett.
//
// Det cachede tokenet leses FØR tripletex-session kalles. Det er derfor
// kontrollen må stå i denne fila også, og ikke bare i tripletex-session: med et
// gyldig cachet token ville det kallet aldri skjedd, og fiksen der ville ikke
// beskyttet noe her.
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
    // TO HULL, ikke ett. Begge må lukkes, og det ene lukker ikke det andre:
    //   1) companyId kom fra request-body → kalleren valgte selv hvilken
    //      bedrifts Tripletex-konto han skrev til.
    //   2) kunden ble hentet på .eq('id', customerId) ALENE, med service_role,
    //      altså uten RLS. Med egen companyId og en ANNEN bedrifts customerId
    //      passerte man enhver avsenderkontroll og fikk likevel lest kundens
    //      navn, org.nr, e-post og telefon — og skrevet tripletex_customer_id
    //      tilbake på deres rad.
    const avsender = await hentAvsender(req)

    const body = await req.json().catch(() => ({}))
    // companyId i body styrer INGENTING lenger. Den godtas kun hvis den er
    // identisk med den utledede. Feltet fjernes fra body i en senere runde.
    krevSammeBedrift(avsender, body?.companyId, '/tripletex-customer-sync')
    const companyId = avsender.companyId
    const customerId = body?.customerId
    if (!customerId) return json({ error: 'customerId er påkrevd' }, 400)

    logBase = {
      company_id: companyId, provider: 'tripletex', operation: 'customer_sync',
      entity_type: 'customer', entity_id: customerId,
    }

    // 1) Hent vår kunde — og bare VÅR. hentEgenRad svarer likt på «finnes ikke»
    //    og «hører til en annen bedrift»; skillet står kun i [SIKKERHET]-loggen.
    //    Ulike svar ville gjort endepunktet til et oppslagsverk der uuid-er kan
    //    testes mot andre bedrifter.
    let cust: Record<string, any>
    try {
      cust = await hentEgenRad<Record<string, any>>(
        admin, avsender, 'customers',
        'id, name, orgnr, email, phone, type, tripletex_customer_id',
        customerId, 'Fant ikke kunden',
      )
    } catch (e) {
      if (e instanceof AvvistFeil) {
        await log({ ...logBase, action: 'failed', error: e.message })
        return json({ error: e.message }, e.status)
      }
      throw e
    }

    const name = String(cust.name ?? '').trim()
    if (!name) {
      await log({ ...logBase, action: 'failed', error: 'Kunden mangler navn' })
      return json({ error: 'Kunden mangler navn — kan ikke synkes' }, 400)
    }
    const orgDigits = String(cust.orgnr ?? '').replace(/\D/g, '')
    const hasOrg = orgDigits.length === 9
    const type = String(cust.type ?? '').trim().toLowerCase()   // 'privat' | 'bedrift' | 'ue' | ''
    const isPrivat = type === 'privat'
    const email = String(cust.email ?? '').trim() || undefined
    const phone = String(cust.phone ?? '').trim() || undefined

    // 2) Skaff sesjon. Registrer tokenet (og dets Basic-auth-form) som hemmeligheter
    //    som ALLTID skal fjernes fra alt vi logger.
    const session = await getSession(avsender)
    secrets.push(session, btoa('0:' + session))
    const authHeader = basicAuth(session)

    // 3) Allerede koblet? Verifiser at ID-en fortsatt finnes i Tripletex → ingen duplikat.
    if (cust.tripletex_customer_id) {
      // fields=id: vi trenger bare å bekrefte at kunden finnes — minimal datamengde.
      const getRes = await fetch(`${TRIPLETEX_BASE}/v2/customer/${cust.tripletex_customer_id}?fields=id`, {
        headers: { Authorization: authHeader },
      })
      if (getRes.ok) {
        await log({ ...logBase, external_id: cust.tripletex_customer_id, action: 'noop', http_status: 200, response_summary: { note: 'allerede koblet' } })
        return json({ ok: true, action: 'noop', tripletexCustomerId: cust.tripletex_customer_id })
      }
      // 404 e.l.: den lagrede ID-en er ugyldig — vi faller gjennom og matcher/oppretter på nytt.
    }

    // 3b) Styrende signal er customers.type:
    //   - 'privat'                         → opprett alltid ny (create-only, ingen navnematch)
    //   - 'bedrift'/'ue'/annet MED org.nr  → match/opprett på org.nr
    //   - bedrift UTEN org.nr              → IKKE synk: ufullstendig registrering, be om org.nr først
    if (!isPrivat && !hasOrg) {
      const melding = `Kunden er registrert som «${type || 'bedrift'}» men mangler org.nr. `
        + 'Fyll inn org.nr på kunden før synk. Er dette en privatperson, merk kunden som «privat».'
      await log({ ...logBase, action: 'skipped', error: melding })
      return json({ error: melding, action: 'skipped', reason: 'missing_orgnr' }, 400)
    }

    // Skrivingene under bærer .eq('company_id', companyId) i tillegg til id-en.
    // hentEgenRad har allerede bevist at kunden er vår, så det er belte i
    // tillegg til seler — men det koster ingenting, og det betyr at en senere
    // omskriving som flytter kontrollen ikke stille kan skrive i feil bedrift.
    // 4) Bedrift/UE med org.nr: match på org.nr (kun gyldig 9-sifret nummer).
    if (!isPrivat && hasOrg) {
      const q = new URL(`${TRIPLETEX_BASE}/v2/customer`)
      q.searchParams.set('organizationNumber', orgDigits)
      q.searchParams.set('fields', 'id,name,organizationNumber')
      const sRes = await fetch(q.toString(), { headers: { Authorization: authHeader } })
      const sText = await sRes.text()
      if (!sRes.ok) {
        await log({ ...logBase, action: 'failed', http_status: sRes.status, error: `Søk feilet: ${sText.slice(0, 400)}` })
        return json({ error: `Tripletex-søk feilet (${sRes.status})`, detail: sText.slice(0, 400) }, 502)
      }
      const found = safeJson(sText)?.values?.[0]
      if (found?.id) {
        await admin.from('customers').update({ tripletex_customer_id: found.id }).eq('id', customerId).eq('company_id', companyId)
        await skrivEksternKobling({ companyId, entityType: 'customer', entityId: customerId, externalId: found.id, syncedAt: new Date().toISOString() })
        await log({ ...logBase, external_id: found.id, action: 'linked_existing', http_status: sRes.status, response_summary: { matchedOn: 'organizationNumber', name: found.name } })
        return json({ ok: true, action: 'linked_existing', tripletexCustomerId: found.id })
      }
      // Ikke funnet på org.nr → opprett under.
    }

    // 5) Opprett ny kunde i Tripletex.
    //    Gjelder både «org.nr ikke funnet» og «privatperson uten org.nr» (create-only, ingen navnematch).
    const payload: Record<string, unknown> = { name, isCustomer: true }
    if (!isPrivat && hasOrg) payload.organizationNumber = orgDigits
    if (email) payload.email = email
    if (phone) payload.phoneNumber = phone

    const cRes = await fetch(`${TRIPLETEX_BASE}/v2/customer`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const cText = await cRes.text()
    if (!cRes.ok) {
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: `Opprett feilet: ${cText.slice(0, 400)}` })
      return json({ error: `Tripletex avviste opprettelse (${cRes.status})`, detail: cText.slice(0, 400) }, 502)
    }
    const created = safeJson(cText)?.value
    if (!created?.id) {
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: 'Svar manglet id' })
      return json({ error: 'Uventet svar fra Tripletex (mangler id)', detail: cText.slice(0, 400) }, 502)
    }

    await admin.from('customers').update({ tripletex_customer_id: created.id }).eq('id', customerId).eq('company_id', companyId)
    await skrivEksternKobling({ companyId, entityType: 'customer', entityId: customerId, externalId: created.id, syncedAt: new Date().toISOString() })
    // matchBasis + customerType gjør det lett å finne igjen kunder opprettet UTEN org.nr-match (mulige duplikater).
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { name: created.name, customerType: type || null, matchBasis: isPrivat ? 'privat' : 'organizationNumber_not_found' } })
    return json({ ok: true, action: 'created', tripletexCustomerId: created.id })
  } catch (e) {
    // Avvisninger fra kontrollen bærer sin egen status og en tekst som er trygg
    // å vise. logBase er tom hvis kontrollen avviste FØR vi visste hvilken
    // bedrift og hvilken kunde det gjaldt — da har vi ingenting meningsfullt å
    // skrive i integration_sync_log, og [SIKKERHET]-linja i funksjonsloggen
    // står der allerede.
    const melding = (e as Error)?.message ?? String(e)
    if (logBase.company_id) await log({ ...logBase, action: 'failed', error: melding })
    if (e instanceof AvvistFeil) return json({ error: melding }, e.status)
    return json({ error: melding }, 500)
  }
})
