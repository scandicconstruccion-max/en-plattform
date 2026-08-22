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
    const entryId = body?.entryId
    if (!companyId || !entryId) return json({ error: 'companyId og entryId er påkrevd' }, 400)

    logBase = { company_id: companyId, provider: 'tripletex', operation: 'hours_sync', entity_type: 'timesheet_entry', entity_id: entryId }

    // 1) Hent timeraden.
    const { data: entry, error: eErr } = await admin
      .from('timesheet_entries')
      .select('id, timesheet_id, date, project_id, absence_type, normal_hours, overtime_50, overtime_100, status, tripletex_entry_id, tripletex_synced_hours')
      .eq('id', entryId)
      .single()
    if (eErr || !entry) {
      await log({ ...logBase, action: 'failed', error: 'Fant ikke timeraden' })
      return json({ error: 'Fant ikke timeraden' }, 404)
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
    const tsRead = await admin.from('timesheets').select('employee_id').eq('id', entry.timesheet_id).single()
    if (tsRead.error || !tsRead.data?.employee_id) {
      await log({ ...logBase, action: 'failed', error: 'Fant ikke timelisten/ansatt for timeraden' })
      return json({ error: 'Fant ikke timelisten eller ansatt for timeraden' }, 500)
    }
    const empRead = await admin.from('employees')
      .select('id, first_name, last_name, tripletex_employee_id')
      .eq('id', tsRead.data.employee_id).single()
    if (empRead.error || !empRead.data) {
      await log({ ...logBase, action: 'failed', error: 'Fant ikke ansatt' })
      return json({ error: 'Fant ikke ansatt' }, 500)
    }
    const emp = empRead.data
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
    const projRead1 = await admin.from('projects').select('tripletex_id').eq('id', entry.project_id).single()
    if (projRead1.error) {
      await log({ ...logBase, action: 'failed', error: `Kunne ikke lese prosjektet: ${projRead1.error.message}` })
      return json({ error: `Kunne ikke lese prosjektet: ${projRead1.error.message}` }, 500)
    }
    let tripletexProjectId = projRead1.data?.tripletex_id
    if (!tripletexProjectId) {
      const inv = await admin.functions.invoke('tripletex-project-sync', { body: { companyId, projectId: entry.project_id } })
      if (inv.error) {
        let detail = inv.error.message || 'Prosjektsynk feilet'
        try { const b = await inv.error.context.json(); if (b?.error) detail = b.error } catch (_) { /* behold detail */ }
        await log({ ...logBase, action: 'skipped', error: `Prosjektet må synkes først: ${detail}`, response_summary: { step: 'project_sync' } })
        return json({ error: `Prosjektet må synkes først: ${detail}`, reason: 'project_sync_required' }, 400)
      }
      const projRead2 = await admin.from('projects').select('tripletex_id').eq('id', entry.project_id).single()
      tripletexProjectId = projRead2.data?.tripletex_id
    }
    if (!tripletexProjectId) {
      await log({ ...logBase, action: 'failed', error: 'Prosjektsynk ga ingen Tripletex-prosjekt-id' })
      return json({ error: 'Prosjektet ble ikke synket (ingen Tripletex-prosjekt-id)' }, 502)
    }

    // 7) Sesjon. Registrer tokenet som hemmelighet som ALLTID fjernes fra logging.
    const session = await getSession(companyId)
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
      await admin.from('timesheet_entries').update({ tripletex_sync_error: `Opprett feilet (${cRes.status})` }).eq('id', entryId)
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
    }).eq('id', entryId)
    await log({ ...logBase, external_id: created.id, action: 'created', http_status: cRes.status, request_payload: payload, response_summary: { hours } })
    return json({ ok: true, action: 'created', tripletexEntryId: created.id })
  } catch (e) {
    await log({ ...logBase, action: 'failed', error: (e as Error)?.message ?? String(e) })
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
