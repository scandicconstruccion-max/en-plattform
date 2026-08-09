// ============================================================
// Edge Function: tripletex-customer-sync
// ------------------------------------------------------------
// Synker ÉN kunde fra En Plattform til Tripletex. Én vei, ett kall, én kunde.
// Ingen bulk, ingen automatikk, ingen tidsstyring.
//
// Regler:
//   - Matcher primært på org.nr (9 siffer). Finnes kunden i Tripletex → koble til
//     og lagre tripletex_customer_id. Finnes ikke → opprett og lagre ID-en.
//   - Kunder uten org.nr (privatpersoner): OPPRETT alltid ny (aldri navnematch),
//     for å unngå å koble to ulike personer sammen. Se docs for risikoforklaring.
//   - Aldri slett i Tripletex. Aldri oppdater felter på en kunde som finnes fra før
//     (vi kobler bare til den). Endring av navn/adresse hos oss synkes IKKE ennå.
//   - Hvert forsøk logges i integration_sync_log (hva ble sendt, resultat, feil).
//
// Hemmeligheter (delt på prosjektnivå med tripletex-session):
//   TRIPLETEX_ENC_KEY   – hovednøkkel for å lese cachet sesjonstoken
//   TRIPLETEX_API_BASE  – valgfri; default https://api-test.tripletex.tech
// SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY leveres automatisk av Supabase.
// (Trenger IKKE consumer-token — sesjonen skaffes via tripletex-session.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function safeJson(text: string): any {
  try { return JSON.parse(text) } catch { return null }
}

async function logSync(row: Record<string, unknown>): Promise<void> {
  try { await admin.from('integration_sync_log').insert(row) } catch (_) { /* logging skal aldri velte kallet */ }
}

// Tripletex autentiserer med HTTP Basic: brukernavn '0' (token-eierens firma), passord = sesjonstoken.
function basicAuth(sessionToken: string): string {
  return 'Basic ' + btoa('0:' + sessionToken)
}

// Skaffer et gyldig sesjonstoken: bruk cachet hvis mulig, ellers be tripletex-session lage ett.
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

Deno.serve(async (req: Request): Promise<Response> => {
  let logBase: Record<string, unknown> = {}
  try {
    if (req.method !== 'POST') return json({ error: 'Bruk POST' }, 405)
    if (!ENC_KEY) return json({ error: 'Server mangler TRIPLETEX_ENC_KEY' }, 500)

    const body = await req.json().catch(() => ({}))
    const companyId = body?.companyId
    const customerId = body?.customerId
    if (!companyId || !customerId) return json({ error: 'companyId og customerId er påkrevd' }, 400)

    logBase = {
      company_id: companyId, provider: 'tripletex', operation: 'customer_sync',
      entity_type: 'customer', entity_id: customerId,
    }

    // 1) Hent vår kunde.
    const { data: cust, error: cErr } = await admin
      .from('customers')
      .select('id, name, orgnr, email, phone, tripletex_customer_id')
      .eq('id', customerId)
      .single()
    if (cErr || !cust) {
      await logSync({ ...logBase, action: 'failed', error: 'Fant ikke kunden' })
      return json({ error: 'Fant ikke kunden' }, 404)
    }

    const name = String(cust.name ?? '').trim()
    if (!name) {
      await logSync({ ...logBase, action: 'failed', error: 'Kunden mangler navn' })
      return json({ error: 'Kunden mangler navn — kan ikke synkes' }, 400)
    }
    const orgDigits = String(cust.orgnr ?? '').replace(/\D/g, '')
    const hasOrg = orgDigits.length === 9
    const email = String(cust.email ?? '').trim() || undefined
    const phone = String(cust.phone ?? '').trim() || undefined

    // 2) Skaff sesjon.
    const session = await getSession(companyId)
    const authHeader = basicAuth(session)

    // 3) Allerede koblet? Verifiser at ID-en fortsatt finnes i Tripletex → ingen duplikat.
    if (cust.tripletex_customer_id) {
      const getRes = await fetch(`${TRIPLETEX_BASE}/v2/customer/${cust.tripletex_customer_id}`, {
        headers: { Authorization: authHeader },
      })
      if (getRes.ok) {
        await logSync({ ...logBase, external_id: cust.tripletex_customer_id, action: 'noop', http_status: 200, response_summary: { note: 'allerede koblet' } })
        return json({ ok: true, action: 'noop', tripletexCustomerId: cust.tripletex_customer_id })
      }
      // 404 e.l.: den lagrede ID-en er ugyldig — vi faller gjennom og matcher/oppretter på nytt.
    }

    // 4) Match på org.nr (kun når vi har et gyldig 9-sifret nummer).
    if (hasOrg) {
      const q = new URL(`${TRIPLETEX_BASE}/v2/customer`)
      q.searchParams.set('organizationNumber', orgDigits)
      q.searchParams.set('fields', 'id,name,organizationNumber')
      const sRes = await fetch(q.toString(), { headers: { Authorization: authHeader } })
      const sText = await sRes.text()
      if (!sRes.ok) {
        await logSync({ ...logBase, action: 'failed', http_status: sRes.status, error: `Søk feilet: ${sText.slice(0, 400)}` })
        return json({ error: `Tripletex-søk feilet (${sRes.status})`, detail: sText.slice(0, 400) }, 502)
      }
      const found = safeJson(sText)?.values?.[0]
      if (found?.id) {
        await admin.from('customers').update({ tripletex_customer_id: found.id }).eq('id', customerId)
        await logSync({ ...logBase, external_id: found.id, action: 'linked_existing', http_status: sRes.status, response_summary: { matchedOn: 'organizationNumber', name: found.name } })
        return json({ ok: true, action: 'linked_existing', tripletexCustomerId: found.id })
      }
      // Ikke funnet på org.nr → opprett under.
    }

    // 5) Opprett ny kunde i Tripletex.
    //    Gjelder både «org.nr ikke funnet» og «privatperson uten org.nr» (create-only, ingen navnematch).
    const payload: Record<string, unknown> = { name, isCustomer: true }
    if (hasOrg) payload.organizationNumber = orgDigits
    if (email) payload.email = email
    if (phone) payload.phoneNumber = phone

    const cRes = await fetch(`${TRIPLETEX_BASE}/v2/customer`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const cText = await cRes.text()
    if (!cRes.ok) {
      await logSync({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: `Opprett feilet: ${cText.slice(0, 400)}` })
      return json({ error: `Tripletex avviste opprettelse (${cRes.status})`, detail: cText.slice(0, 400) }, 502)
    }
    const created = safeJson(cText)?.value
    if (!created?.id) {
      await logSync({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: 'Svar manglet id' })
      return json({ error: 'Uventet svar fra Tripletex (mangler id)', detail: cText.slice(0, 400) }, 502)
    }

    await admin.from('customers').update({ tripletex_customer_id: created.id }).eq('id', customerId)
    await logSync({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { name: created.name } })
    return json({ ok: true, action: 'created', tripletexCustomerId: created.id })
  } catch (e) {
    await logSync({ ...logBase, action: 'failed', error: (e as Error)?.message ?? String(e) })
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
