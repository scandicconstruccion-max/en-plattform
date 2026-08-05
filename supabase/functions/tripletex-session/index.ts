// ============================================================
// Edge Function: tripletex-session
// ------------------------------------------------------------
// Gjør KUN én ting:
//   1. Bytter vårt consumer-token + bedriftens employee-token
//      mot et SESJONSTOKEN fra Tripletex (api-test.tripletex.tech).
//   2. Cacher sesjonstokenet kryptert i databasen med utløpsdato.
//   3. Fornyer automatisk når det cachede tokenet er utløpt.
//
// Ingen prosjektsynk. Ingen UI. Tokenet returneres ALDRI til kalleren —
// bare status (tilkoblet / cachet / utløp).
//
// Hemmeligheter (settes som Edge Function secrets i Supabase):
//   TRIPLETEX_CONSUMER_TOKEN  – vårt consumer-token (ett for hele integrasjonen)
//   TRIPLETEX_ENC_KEY         – hovednøkkel for kryptering (valgfri sterk streng)
//   TRIPLETEX_API_BASE        – valgfri; default https://api-test.tripletex.tech
// SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY leveres automatisk av Supabase.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const CONSUMER_TOKEN = Deno.env.get('TRIPLETEX_CONSUMER_TOKEN') ?? ''
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== 'POST') return json({ error: 'Bruk POST' }, 405)
    if (!CONSUMER_TOKEN || !ENC_KEY) {
      return json({ error: 'Server mangler hemmeligheter (TRIPLETEX_CONSUMER_TOKEN / TRIPLETEX_ENC_KEY)' }, 500)
    }

    const { companyId, employeeToken, force } = await req.json().catch(() => ({}))
    if (!companyId) return json({ error: 'companyId er påkrevd' }, 400)

    // (Valgfritt, praktisk for testing) Lagre/oppdater employee-token hvis det sendes med.
    // Da holdes hovednøkkelen på ETT sted (Edge-hemmeligheten) — du slipper å røre den i SQL.
    if (employeeToken) {
      const { error: setErr } = await admin.rpc('tripletex_set_employee_token', {
        p_company_id: companyId,
        p_environment: 'test',
        p_token: employeeToken,
        p_key: ENC_KEY,
      })
      if (setErr) return json({ error: `Kunne ikke lagre employee-token: ${setErr.message}` }, 500)
    }

    // 1) Har vi allerede et gyldig, cachet sesjonstoken? (Hopp over hvis force = true.)
    if (!force) {
      const { data: cached, error: cErr } = await admin.rpc('tripletex_get_cached_session', {
        p_company_id: companyId,
        p_key: ENC_KEY,
      })
      if (cErr) return json({ error: `DB-feil (les cache): ${cErr.message}` }, 500)
      if (cached) {
        const { data: row } = await admin
          .from('company_integrations')
          .select('session_token_expires')
          .eq('company_id', companyId)
          .eq('provider', 'tripletex')
          .single()
        // Returnerer ALDRI selve tokenet — bare status.
        return json({ ok: true, cached: true, expires: row?.session_token_expires ?? null })
      }
    }

    // 2) Hent (dekrypter) bedriftens employee-token.
    const { data: employeeTokenDb, error: eErr } = await admin.rpc('tripletex_get_employee_token', {
      p_company_id: companyId,
      p_key: ENC_KEY,
    })
    if (eErr) return json({ error: `DB-feil (employee-token): ${eErr.message}` }, 500)
    if (!employeeTokenDb) {
      return json({ error: 'Bedriften har ikke lagret et Tripletex employee-token ennå' }, 400)
    }

    // 3) Be Tripletex om et nytt sesjonstoken.
    //    Sesjonstokenet må ha en utløpsdato (yyyy-MM-dd). Vi setter i morgen.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const expDate = tomorrow.toISOString().slice(0, 10) // yyyy-MM-dd

    const url = new URL(`${TRIPLETEX_BASE}/v2/token/session/:create`)
    url.searchParams.set('consumerToken', CONSUMER_TOKEN)
    url.searchParams.set('employeeToken', employeeTokenDb)
    url.searchParams.set('expirationDate', expDate)

    const ttRes = await fetch(url.toString(), { method: 'PUT' })
    const ttText = await ttRes.text()

    if (!ttRes.ok) {
      await admin.rpc('tripletex_mark_failed', {
        p_company_id: companyId,
        p_error: `Tripletex ${ttRes.status}: ${ttText.slice(0, 500)}`,
      })
      return json({ error: `Tripletex avviste forespørselen (${ttRes.status})`, detail: ttText.slice(0, 500) }, 502)
    }

    let parsed: { value?: { token?: string; expirationDate?: string } } | null
    try {
      parsed = JSON.parse(ttText)
    } catch {
      parsed = null
    }
    const token = parsed?.value?.token
    const expirationDate = parsed?.value?.expirationDate
    if (!token) {
      await admin.rpc('tripletex_mark_failed', { p_company_id: companyId, p_error: 'Tripletex-svar manglet token' })
      return json({ error: 'Uventet svar fra Tripletex (mangler token)', detail: ttText.slice(0, 500) }, 502)
    }

    // Tripletex svarer med en utløpsDATO — vi cacher til slutten av den dagen (UTC).
    const expiresAt = expirationDate ? new Date(`${expirationDate}T23:59:59Z`) : tomorrow

    // 4) Lagre sesjonstokenet kryptert + utløp.
    const { error: sErr } = await admin.rpc('tripletex_store_session', {
      p_company_id: companyId,
      p_token: token,
      p_expires: expiresAt.toISOString(),
      p_key: ENC_KEY,
    })
    if (sErr) return json({ error: `DB-feil (lagre sesjon): ${sErr.message}` }, 500)

    return json({ ok: true, cached: false, expires: expiresAt.toISOString() })
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
