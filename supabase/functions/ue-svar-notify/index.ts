// ════════════════════════════════════════════════════════════════════════
// ue-svar-notify — varsler oppdragsgiver når en UE leverer tilbud
// ════════════════════════════════════════════════════════════════════════
// Erstatter det ene uinnloggede send-quote-kallet fra /ue-svar-siden.
//
// Hvorfor egen funksjon: /ue-svar er offentlig (UE har ingen innlogging), så
// den kan ikke sende brukerens session-token til den hardnede send-quote.
// I stedet tar denne funksjonen KUN et svar-token og utleder mottaker + bygger
// e-postinnholdet SERVER-SIDE fra den lagrede raden. Klienten kan altså ikke
// velge mottaker, emne eller HTML → ingen åpen-relé-egenskap. Sikkerheten
// ligger i at svar_token er hemmelig (samme token som kreves for å se
// forespørselen).
//
// Body (JSON): { svar_token: string }
//
// Miljøvariabler: RESEND_API_KEY, FROM_EMAIL (default noreply@enplattform.no),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto).
//
// DEPLOY: Verify JWT = AV (offentlig, ingen brukerkontekst).
// ════════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Escape mot HTML-injeksjon i felt som stammer fra brukerinput (UE-tekst mm.)
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function nok(n: unknown): string {
  const num = Math.round(Number(n) || 0)
  try {
    return num.toLocaleString("nb-NO")
  } catch {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const { svar_token } = await req.json()
    if (!svar_token || typeof svar_token !== "string") {
      return json({ error: "svar_token mangler" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const sb = createClient(supabaseUrl, serviceKey)

    // Hent forespørselen server-side (klienten oppgir kun token)
    const { data: foresp, error: fErr } = await sb
      .from("ue_foresporsler")
      .select("*")
      .eq("svar_token", svar_token)
      .single()
    if (fErr || !foresp) return json({ error: "Forespørsel ikke funnet" }, 404)

    // Mottaker = oppdragsgiveren (den som eier forespørselen). Hent e-post fra
    // auth (autoritativt, uavhengig av profiles/user_profiles).
    let mottaker: string | null = null
    try {
      const { data: u } = await sb.auth.admin.getUserById(foresp.user_id)
      mottaker = u?.user?.email ?? null
    } catch (_) { /* faller gjennom */ }
    if (!mottaker) {
      // Ingen mottaker → ikke en feil for UE-en; svaret er allerede lagret.
      return json({ success: true, skipped: "ingen mottaker-e-post" }, 200)
    }

    const apiKey = Deno.env.get("RESEND_API_KEY")
    if (!apiKey) return json({ error: "RESEND_API_KEY not configured" }, 500)
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@enplattform.no"

    // Bygg e-post fra LAGREDE verdier på raden
    const poster = Array.isArray(foresp.svar_poster) ? foresp.svar_poster : []
    const posterTable = poster
      .filter((p: any) => Number(p?.pris) > 0)
      .map(
        (p: any) =>
          `<tr><td style="padding:6px 12px;font-size:13px">${esc(p.name)}</td>` +
          `<td style="padding:6px 12px;text-align:right;font-weight:600">${nok(p.pris)} kr</td></tr>`
      )
      .join("")

    const total = foresp.svar_pris ?? poster.reduce((s: number, p: any) => s + (Number(p?.pris) || 0), 0)
    const tidsplan = foresp.svar_tidsplan ? String(foresp.svar_tidsplan) : ""
    const forbehold = foresp.svar_forbehold ? String(foresp.svar_forbehold) : ""

    const emailHtml =
      `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px">` +
      `<h1 style="color:#0f172a;font-size:20px;margin:0 0 8px">🤝 Nytt tilbud mottatt</h1>` +
      `<p style="color:#94a3b8;font-size:13px;margin:0 0 20px">Ref: ${esc(foresp.foresporsel_nr)}</p>` +
      `<div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #bfdbfe">` +
      `<div style="font-size:12px;color:#2563eb;font-weight:600;margin-bottom:6px">TILBUD FRA ${esc(String(foresp.ue_navn || "").toUpperCase())}</div>` +
      `<table style="width:100%;border-collapse:collapse">${posterTable}` +
      `<tr style="border-top:2px solid #0f172a"><td style="padding:10px 12px;font-weight:800;font-size:15px">TOTALT</td>` +
      `<td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px">${nok(total)} kr</td></tr>` +
      `</table>` +
      (tidsplan ? `<div style="font-size:13px;color:#64748b;margin-top:8px">📅 ${esc(tidsplan)}</div>` : "") +
      (forbehold ? `<div style="font-size:13px;color:#92400e;margin-top:4px">⚠️ Forbehold: ${esc(forbehold)}</div>` : "") +
      `</div>` +
      `<p style="color:#475569;font-size:14px">Logg inn i En Plattform for å godkjenne eller avslå tilbudet.</p>` +
      `</div>`

    const subject = `Nytt UE-tilbud fra ${foresp.ue_navn} – ${foresp.prosjekt_navn}`

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [mottaker], subject, html: emailHtml }),
    })
    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error("Resend API error:", resendData)
      return json({ error: resendData?.message || "Resend API failed" }, resendRes.status)
    }

    // Bounce-fangst (best effort) — knyttes til oppdragsgiveren
    try {
      if (resendData?.id) {
        await sb.from("sent_emails").insert({
          resend_email_id: resendData.id,
          sender_user_id: foresp.user_id,
          recipient_email: mottaker,
          subject,
        })
      }
    } catch (logErr) {
      console.warn("Kunne ikke lagre sent_emails:", logErr)
    }

    return json({ success: true, id: resendData.id }, 200)
  } catch (err) {
    console.error("ue-svar-notify error:", err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
