// supabase/functions/ue-melding-notify/index.ts
// Varsler oppdragsgiver når en UE skriver i dialogen på /anbud-pris.
//
// SIKKERHET — endepunktet står åpent (verify_jwt = false, fordi UE-siden er
// uinnlogget og ikke har noen brukertoken):
//   • Eneste inndata er anbuds-tokenet. Ukjent token → 404, ingen e-post.
//   • Mottakeren hentes fra databasen (tenders.created_by). Den kan IKKE
//     oppgis av kalleren. Det er derfor dette ikke er et åpent relé.
//   • Teksten leses fra tender_ues.sporsmal og escapes. Ingenting fra
//     forespørselen havner i e-posten.
//   • Bare meldinger fra UE, og bare under MAKS_ALDER_MIN gamle, utløser
//     e-post — så gamle meldinger ikke kan spilles av på nytt i en løkke.
//
// KJENT MANGEL: funksjonen husker ikke om den alt har varslet om denne
// meldingen. Den som sitter på et gyldig token kan skrive én fersk melding og
// kalle endepunktet gjentatte ganger innenfor tidsvinduet. En teller per token
// per time lukker det, men krever en tabell — tas sammen med historikk-saken.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'En Plattform AS <ikke.svar@enplattform.no>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.enplattform.no'
const MAKS_ALDER_MIN = 10

// UE-siden ligger på app.enplattform.no og kaller supabase.co, så nettleseren
// sender preflight først. Uten disse headerne blokkeres kallet før koden kjører.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Alle svar må bære CORS-headerne — også 400, 404 og 500. Ellers ser
// nettleseren en CORS-feil i stedet for den faktiske feilmeldingen, og
// feilsøking blir umulig.
const svar = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') return svar({ error: 'Method not allowed' }, 405)

    const { token } = await req.json().catch(() => ({}))
    if (!token || typeof token !== 'string') return svar({ error: 'Mangler token' }, 400)

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Tokenet må finnes. Gjør det ikke det, skjer ingenting.
    const { data: ue } = await db.from('tender_ues')
      .select('id, company_name, sporsmal, tender_id').eq('token', token).maybeSingle()
    if (!ue) return svar({ error: 'Ukjent token' }, 404)

    // 2. Siste melding må være fra UE, og fersk.
    const trad = Array.isArray(ue.sporsmal) ? ue.sporsmal : []
    const siste = trad[trad.length - 1]
    if (!siste || siste.from !== 'ue') return svar({ ok: true, hoppet: 'ingen ny UE-melding' })
    const alderMin = (Date.now() - new Date(siste.at ?? 0).getTime()) / 60000
    if (!(alderMin >= 0 && alderMin <= MAKS_ALDER_MIN)) {
      return svar({ ok: true, hoppet: 'meldingen er ikke fersk' })
    }

    // 3. Mottakeren hentes her. Den kommer aldri fra forespørselen.
    const { data: t } = await db.from('tenders')
      .select('id, title, tender_number, created_by').eq('id', ue.tender_id).maybeSingle()
    if (!t?.created_by) return svar({ ok: true, hoppet: 'ingen mottaker' })

    const { data: mottaker } = await db.auth.admin.getUserById(t.created_by)
    const til = mottaker?.user?.email
    if (!til) return svar({ ok: true, hoppet: 'oppdragsgiver mangler e-post' })

    const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px">
      <h1 style="color:#0f172a;font-size:22px;margin-bottom:12px">Melding fra ${esc(ue.company_name)}</h1>
      <p style="color:#475569;font-size:14px;line-height:1.6">Du har fått en melding om <strong>${esc(t.title)}</strong> (${esc(t.tender_number)}):</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin:16px 0;color:#1e3a8a;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(siste.text)}</div>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/#anbudsmodul" style="background:#059669;color:white;text-decoration:none;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:700;display:inline-block">Åpne anbudet og svar →</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center">Sendt via En Plattform KS-system</p>
    </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [til],
        subject: `Melding fra ${ue.company_name} – ${t.title}`,
        html,
      }),
    })
    if (!res.ok) return svar({ error: `Resend: ${await res.text()}` }, 500)

    return svar({ ok: true })
  } catch (e) {
    return svar({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
