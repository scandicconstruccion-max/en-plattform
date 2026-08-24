// ============================================================
// FUNKSJON: tripletex-lookup
// ------------------------------------------------------------
// Skrivefritt oppslag mot Tripletex. Returnerer en kort liste med ansatte
// (id + navn) og aktiviteter (id + navn), slik at du kan finne ID-ene du
// trenger til tripletex_employee_id og standardaktivitet.
//
// KUN oppslag (GET). Skriver INGENTING til Tripletex. Bruker samme sesjons-
// håndtering som de andre funksjonene (cachet sesjon, ellers tripletex-session).
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

// Tripletex autentiserer med HTTP Basic: brukernavn '0' (token-eierens firma), passord = sesjonstoken.
function basicAuth(sessionToken: string): string {
  return 'Basic ' + btoa('0:' + sessionToken)
}

// Sesjonstokenet hentes for avsenderens EGEN bedrift. Tidligere tok denne en
// companyId fra request-body, og da kunne hvem som helst med en gyldig
// innlogging lese en annen bedrifts Tripletex-ansattliste ved å oppgi deres
// uuid. Nå finnes ikke den veien: bedriften kommer fra auth_company_id().
//
// Merk at det cachede tokenet leses FØR tripletex-session kalles. Det er
// derfor kontrollen må stå her også, og ikke bare i tripletex-session:
// med et gyldig cachet token ville det kallet aldri skjedd.
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

async function getList(path: string, authHeader: string): Promise<any[]> {
  const res = await fetch(`${TRIPLETEX_BASE}${path}`, { headers: { Authorization: authHeader } })
  const text = await res.text()
  if (!res.ok) throw new Error(`Tripletex ${res.status} på ${path.split('?')[0]}: ${text.slice(0, 300)}`)
  return safeJson(text)?.values ?? []
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight. MÅ ligge først — før metode-sjekken lenger nede, ellers avvises
  // OPTIONS med 405 og nettleseren sender aldri den ekte POST-en.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Bruk POST' }, 405)
    if (!ENC_KEY) return json({ error: 'Server mangler TRIPLETEX_ENC_KEY' }, 500)

    // ── HVEM SPØR ────────────────────────────────────────────────────────
    // Før dette punktet bestemte kalleren selv hvilken bedrift oppslaget
    // gjaldt. Denne funksjonen returnerer hele Tripletex-ansattlista og
    // aktivitetslista til bedriften, så en fri companyId var et oppslag i
    // en annen bedrifts personalregister.
    const avsender = await hentAvsender(req)

    const body = await req.json().catch(() => ({}))
    // companyId i body styrer INGENTING lenger. Den godtas kun hvis den er
    // identisk med den utledede. Feltet fjernes fra body i en senere runde.
    krevSammeBedrift(avsender, body?.companyId, '/tripletex-lookup')

    const session = await getSession(avsender)
    const authHeader = basicAuth(session)

    // Kun oppslag (GET), med fields for å begrense datamengden.
    const [empRaw, actRaw] = await Promise.all([
      getList('/v2/employee?fields=id,firstName,lastName&count=1000', authHeader),
      getList('/v2/activity?fields=id,name&count=1000', authHeader),
    ])

    const employees = empRaw
      .map((e: any) => ({ id: e.id, name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || '(uten navn)' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'))

    const activities = actRaw
      .map((a: any) => ({ id: a.id, name: String(a.name ?? '').trim() || '(uten navn)' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'))

    const result: Record<string, unknown> = {
      ok: true,
      employeeCount: employees.length,
      activityCount: activities.length,
      employees,
      activities,
    }
    if (activities.length === 0) {
      result.note = 'Aktivitetslista er tom i dette Tripletex-miljøet. Opprett eller aktiver minst én '
        + 'aktivitet i Tripletex (Innstillinger → Aktiviteter, eller aktiver en aktivitet på prosjektet), '
        + 'og kjør dette oppslaget på nytt for å få aktivitet-id-en.'
    }
    return json(result)
  } catch (e) {
    // Avvisninger fra kontrollen bærer sin egen status og en tekst som er
    // trygg å vise. Alt annet er 500 som før.
    if (e instanceof AvvistFeil) return json({ error: e.message }, e.status)
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
