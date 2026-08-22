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

// Gyldig sesjonstoken: bruk cachet hvis mulig, ellers be tripletex-session lage ett.
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

    const body = await req.json().catch(() => ({}))
    const companyId = body?.companyId
    const projectId = body?.projectId
    if (!companyId || !projectId) return json({ error: 'companyId og projectId er påkrevd' }, 400)

    logBase = {
      company_id: companyId, provider: 'tripletex', operation: 'project_sync',
      entity_type: 'project', entity_id: projectId,
    }

    // 1) Hent vårt prosjekt.
    const { data: proj, error: pErr } = await admin
      .from('projects')
      .select('id, name, project_number, parent_id, customer_id, start_date, end_date, tripletex_id')
      .eq('id', projectId)
      .single()
    if (pErr || !proj) {
      await log({ ...logBase, action: 'failed', error: 'Fant ikke prosjektet' })
      return json({ error: 'Fant ikke prosjektet' }, 404)
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
    const custRead1 = await admin.from('customers').select('tripletex_customer_id').eq('id', proj.customer_id).single()
    if (custRead1.error) {
      await log({ ...logBase, action: 'failed', error: `Kunne ikke lese kunden: ${custRead1.error.message}` })
      return json({ error: `Kunne ikke lese kunden: ${custRead1.error.message}` }, 500)
    }
    let tripletexCustomerId = custRead1.data?.tripletex_customer_id
    if (!tripletexCustomerId) {
      const inv = await admin.functions.invoke('tripletex-customer-sync', { body: { companyId, customerId: proj.customer_id } })
      if (inv.error) {
        let detail = inv.error.message || 'Kundesynk feilet'
        try { const b = await inv.error.context.json(); if (b?.error) detail = b.error } catch (_) { /* behold detail */ }
        await log({ ...logBase, action: 'skipped', error: `Kunden må synkes først: ${detail}`, response_summary: { step: 'customer_sync' } })
        return json({ error: `Kunden må synkes først: ${detail}`, reason: 'customer_sync_required' }, 400)
      }
      const custRead2 = await admin.from('customers').select('tripletex_customer_id').eq('id', proj.customer_id).single()
      tripletexCustomerId = custRead2.data?.tripletex_customer_id
    }
    if (!tripletexCustomerId) {
      await log({ ...logBase, action: 'failed', error: 'Kundesynk ga ingen Tripletex-kunde-id' })
      return json({ error: 'Kunden ble ikke synket (ingen Tripletex-kunde-id)' }, 502)
    }

    // 6) Skaff sesjon. Registrer tokenet som hemmelighet som ALLTID fjernes fra logging.
    const session = await getSession(companyId)
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
      await admin.from('projects').update({ tripletex_id: match.id, tripletex_synced_at: new Date().toISOString(), tripletex_sync_error: null }).eq('id', projectId)
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
      await admin.from('projects').update({ tripletex_sync_error: `Opprett feilet (${cRes.status})` }).eq('id', projectId)
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: `Opprett feilet: ${cText.slice(0, 400)}` })
      return json({ error: `Tripletex avviste opprettelse (${cRes.status})`, detail: cText.slice(0, 400) }, 502)
    }
    const created = safeJson(cText)?.value
    if (!created?.id) {
      await log({ ...logBase, action: 'failed', http_status: cRes.status, request_payload: payload, error: 'Svar manglet id' })
      return json({ error: 'Uventet svar fra Tripletex (mangler id)', detail: cText.slice(0, 400) }, 502)
    }

    await admin.from('projects').update({ tripletex_id: created.id, tripletex_synced_at: new Date().toISOString(), tripletex_sync_error: null }).eq('id', projectId)
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { name: created.name, number: created.number } })
    return json({ ok: true, action: 'created', tripletexProjectId: created.id })
  } catch (e) {
    await log({ ...logBase, action: 'failed', error: (e as Error)?.message ?? String(e) })
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
