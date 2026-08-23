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
// SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY leveres automatisk av Supabase.
// (Trenger IKKE consumer-token — sesjonen skaffes via tripletex-session.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
    const customerId = body?.customerId
    if (!companyId || !customerId) return json({ error: 'companyId og customerId er påkrevd' }, 400)

    logBase = {
      company_id: companyId, provider: 'tripletex', operation: 'customer_sync',
      entity_type: 'customer', entity_id: customerId,
    }

    // 1) Hent vår kunde.
    const { data: cust, error: cErr } = await admin
      .from('customers')
      .select('id, name, orgnr, email, phone, type, tripletex_customer_id')
      .eq('id', customerId)
      .single()
    if (cErr || !cust) {
      await log({ ...logBase, action: 'failed', error: 'Fant ikke kunden' })
      return json({ error: 'Fant ikke kunden' }, 404)
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
    const session = await getSession(companyId)
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
        await admin.from('customers').update({ tripletex_customer_id: found.id }).eq('id', customerId)
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

    await admin.from('customers').update({ tripletex_customer_id: created.id }).eq('id', customerId)
    await skrivEksternKobling({ companyId, entityType: 'customer', entityId: customerId, externalId: created.id, syncedAt: new Date().toISOString() })
    // matchBasis + customerType gjør det lett å finne igjen kunder opprettet UTEN org.nr-match (mulige duplikater).
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { name: created.name, customerType: type || null, matchBasis: isPrivat ? 'privat' : 'organizationNumber_not_found' } })
    return json({ ok: true, action: 'created', tripletexCustomerId: created.id })
  } catch (e) {
    await log({ ...logBase, action: 'failed', error: (e as Error)?.message ?? String(e) })
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
