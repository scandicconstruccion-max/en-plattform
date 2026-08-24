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
import { AvvistFeil, hentAvsender, krevSammeBedrift } from './auth.ts'

const TRIPLETEX_BASE = Deno.env.get('TRIPLETEX_API_BASE') ?? 'https://api-test.tripletex.tech'
const CONSUMER_TOKEN = Deno.env.get('TRIPLETEX_CONSUMER_TOKEN') ?? ''
const ENC_KEY = Deno.env.get('TRIPLETEX_ENC_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// CORS. Uten disse kan funksjonen ikke kalles fra nettleseren i det hele tatt:
// supabase.functions.invoke() sender authorization, apikey, content-type og
// x-client-info, og alle fire må stå i Allow-Headers. Samme mønster som
// supabase/functions/bim-sesjon-rydd/index.ts, som allerede kalles fra App.jsx.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Tripletex' svar lagres i last_error via tripletex_mark_failed, og last_error VISES
// i grensesnittet under «Siste forsøk feilet». Skulle et svar noen gang ekko
// forespørselen, ville nøkkelen havnet på skjermen. Samme beskyttelse som
// tripletex-customer-sync, -project-sync og -hours-sync allerede har.
function maskerHemmeligheter(tekst: string, hemmeligheter: string[]): string {
  let s = tekst || ''
  for (const h of hemmeligheter) {
    if (h && h.length >= 6) s = s.split(h).join('[REDACTED]')
  }
  return s.replace(/(consumerToken|employeeToken|sessionToken|token|password)=[^&\s"']+/gi, '$1=[REDACTED]')
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight. MÅ ligge før metode-sjekken under — ellers avvises OPTIONS med 405
  // og nettleseren sender aldri den ekte POST-en.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Bruk POST' }, 405)
    if (!CONSUMER_TOKEN || !ENC_KEY) {
      return json({ error: 'Server mangler hemmeligheter (TRIPLETEX_CONSUMER_TOKEN / TRIPLETEX_ENC_KEY)' }, 500)
    }

    // ── HVEM SPØR ────────────────────────────────────────────────────────
    // Før dette punktet bestemte kalleren selv hvilken bedrift han opererte i:
    // companyId kom fra request-body, og funksjonen kjørte med service_role.
    // Én innlogget bruker kunne dermed skrive en ANNEN bedrifts Tripletex-
    // nøkkel — deres integrasjon sluttet å virke, og det de synket havnet i
    // angriperens Tripletex-konto.
    //
    // Bedriften utledes nå av auth_company_id() for kallerens JWT, som er
    // samme kilde som RLS og DEFAULT-verdiene i databasen. Under en støtteøkt
    // svarer den med kundens bedrift, så støtteinnlogging virker uten unntak.
    const avsender = await hentAvsender(req)

    const body = await req.json().catch(() => ({}))
    // companyId i body styrer INGENTING lenger. Den godtas kun hvis den er
    // identisk med den utledede, så en gammel klient ikke stille begynner å
    // operere i feil bedrift. Feltet fjernes fra body i en senere runde.
    krevSammeBedrift(avsender, body?.companyId, '/tripletex-session')
    const companyId = avsender.companyId
    const force = !!body?.force
    // Fiks #3 (trimming): rens employee-token for mellomrom, tab og linjeskift.
    // Kunden limer ofte inn fra e-post/PDF og skal ikke straffes for et usynlig linjeskift.
    const employeeToken = typeof body?.employeeToken === 'string'
      ? body.employeeToken.replace(/\s+/g, '')
      : ''
    // (Valgfritt, praktisk for testing) Lagre/oppdater employee-token hvis det sendes med.
    // Da holdes hovednøkkelen på ETT sted (Edge-hemmeligheten) — du slipper å røre den i SQL.
    // Fiks #1 (cache-forkasting): hvis tokenet AVVIKER fra det lagrede, skal cachen
    // forkastes og et nytt sesjonstoken hentes umiddelbart — ellers ville et nytt token
    // bli ignorert helt til det gamle sesjonstokenet gikk ut (ved midnatt).
    let tokenChanged = false
    if (employeeToken) {
      const { data: stored, error: getErr } = await admin.rpc('tripletex_get_employee_token', {
        p_company_id: companyId,
        p_key: ENC_KEY,
      })
      if (getErr) return json({ error: `DB-feil (les employee-token): ${getErr.message}` }, 500)
      if (stored !== employeeToken) {
        const { error: setErr } = await admin.rpc('tripletex_set_employee_token', {
          p_company_id: companyId,
          p_environment: 'test',
          p_token: employeeToken,
          p_key: ENC_KEY,
        })
        if (setErr) return json({ error: `Kunne ikke lagre employee-token: ${setErr.message}` }, 500)
        tokenChanged = true
      }
    }

    // 1) Har vi allerede et gyldig, cachet sesjonstoken?
    //    Hopp over hvis force = true ELLER hvis employee-tokenet nettopp ble endret.
    if (!force && !tokenChanged) {
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

    // POST med JSON-BODY. Dette er den eneste formen som er verifisert mot Tripletex:
    // POST /v2/token/session/:create med { employeeToken, consumerToken, expirationDate }
    // i body gir 201 Created. Historikken bak denne linjen:
    //   · PUT + query-parametre (dcc29a8)  -> 422 «employee token is invalid or does not
    //     exist», selv med korrekt token. Endepunktet plukker ikke opp query-parametrene.
    //   · POST + query-parametre (d054a3d) -> 422 «request body: Kan ikke være null».
    //     Riktig verb, men kallet manglet body.
    // Begge tokenene sendes som HELE strengene Tripletex ga ut, uendret. Tripletex
    // godtar sin egen base64-innpakning — den skal IKKE pakkes ut.
    const ttRes = await fetch(`${TRIPLETEX_BASE}/v2/token/session/:create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consumerToken: CONSUMER_TOKEN,
        employeeToken: employeeTokenDb,
        expirationDate: expDate,
      }),
    })
    // Masker nøkkelen og consumer-tokenet FØR teksten kan havne i last_error eller i
    // svaret til UI-et.
    const ttText = maskerHemmeligheter(await ttRes.text(), [employeeTokenDb, CONSUMER_TOKEN])

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
    // Avvisninger fra kontrollen bærer sin egen status og en tekst som er
    // trygg å vise. Alt annet er 500 som før.
    if (e instanceof AvvistFeil) return json({ error: e.message }, e.status)
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
