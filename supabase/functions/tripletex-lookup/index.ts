// ============================================================
// FUNKSJON: tripletex-lookup
// ------------------------------------------------------------
// Skrivefritt oppslag mot Tripletex. Tar imot {"companyId":"..."} og returnerer
// en kort liste med ansatte (id + navn) og aktiviteter (id + navn), slik at du
// kan finne ID-ene du trenger til tripletex_employee_id og standardaktivitet.
//
// KUN oppslag (GET). Skriver INGENTING til Tripletex. Bruker samme sesjons-
// håndtering som de andre funksjonene (cachet sesjon, ellers tripletex-session).
//
// Hemmeligheter (delt): TRIPLETEX_ENC_KEY, TRIPLETEX_API_BASE (valgfri).
// SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY leveres automatisk av Supabase.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
async function getSession(companyId: string): Promise<string> {
  const first = await admin.rpc('tripletex_get_cached_session', { p_company_id: companyId, p_key: ENC_KEY })
  if (first.error) throw new Error(`DB-feil (les sesjon): ${first.error.message}`)
  if (first.data) return first.data as string
  const inv = await admin.functions.invoke('tripletex-session', { body: { companyId } })
  if (inv.error) throw new Error(`Kunne ikke opprette sesjon (er bedriften satt opp med employee-token?): ${inv.error.message}`)
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

    const body = await req.json().catch(() => ({}))
    const companyId = body?.companyId
    if (!companyId) return json({ error: 'companyId er påkrevd' }, 400)

    const session = await getSession(companyId)
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
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
