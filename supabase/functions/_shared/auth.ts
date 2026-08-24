// ============================================================
// _shared/auth.ts — hvem spør, og hvilken bedrift gjelder kallet?
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
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

export type Avsender = {
  userId: string
  companyId: string
  jwt: string
}

// Kastes av kontrollene under. Bæreren av en HTTP-status og en tekst som er
// trygg å vise til kalleren — aldri noe om hva som finnes på innsiden.
export class AvvistFeil extends Error {
  status: number
  constructor(melding: string, status: number) {
    super(melding)
    this.name = 'AvvistFeil'
    this.status = status
  }
}

// Sikkerhetshendelser logges til funksjonsloggen med nok til å etterforske,
// og ingenting av det kalleren ikke allerede kjenner. Aldri tokens.
export function loggSikkerhet(hendelse: string, detaljer: Record<string, unknown>): void {
  try {
    console.warn('[SIKKERHET] ' + hendelse + ' ' + JSON.stringify(detaljer))
  } catch (_) {
    console.warn('[SIKKERHET] ' + hendelse)
  }
}

/**
 * Fastslår hvem som spør, og hvilken bedrift kallet gjelder.
 *
 * Rekkefølgen er bevisst: de billige avvisningene først, oppslaget sist.
 */
export async function hentAvsender(req: Request): Promise<Avsender> {
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) throw new AvvistFeil('Mangler Authorization', 401)

  // Service-role-nøkkelen er IKKE en avsender. Den identifiserer ingen, og en
  // funksjon som godtar den kan kalles på vegne av hvem som helst. Interne
  // kall mellom funksjoner skal videresende brukerens JWT i stedet.
  if (SERVICE_ROLE && jwt === SERVICE_ROLE) {
    loggSikkerhet('service_role brukt som avsender', { path: new URL(req.url).pathname })
    throw new AvvistFeil('Ugyldig sesjon', 401)
  }
  // Anon-nøkkelen er offentlig og identifiserer heller ingen. getUser under
  // ville avvist den uansett, men vi sier det eksplisitt: det er den nøkkelen
  // «Verify JWT»-bryteren slipper gjennom, og den skal ikke komme lenger.
  if (ANON_KEY && jwt === ANON_KEY) {
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
export function krevSammeBedrift(avsender: Avsender, oppgitt: unknown, sti: string): void {
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
export async function hentEgenRad<T extends Record<string, unknown>>(
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
