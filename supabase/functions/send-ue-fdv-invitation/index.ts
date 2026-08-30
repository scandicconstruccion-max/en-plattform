// Supabase Edge Function: send-ue-fdv-invitation
// Sender FDV UE-e-post (invitasjon / påminnelse / avvisning) via Resend.
// Leser forespørselen server-side (service role) og bygger opplastingslenka.
//
// Deploy:
//   supabase functions deploy send-ue-fdv-invitation --project-ref zffzvvtuycjbrdybajwu
// Secrets (RESEND_API_KEY + FROM_EMAIL settes én gang; SUPABASE_* er auto):
//   supabase secrets set RESEND_API_KEY=... FROM_EMAIL=ikke.svar@enplattform.no
// Verify JWT: PÅ (kalles fra innlogget app via supabase.functions.invoke)
//
// Body: { requestId, type, origin, rejectedDocTitle?, rejectedReason? }
//   type = 'invitation' | 'reminder' | 'rejection'

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const esc = (s: string) => String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { requestId, type = "invitation", origin, rejectedDocTitle, rejectedReason } = await req.json()
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId mangler" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ikke.svar@enplattform.no"
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY mangler i secrets" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Hent forespørselen
    const { data: r, error: rErr } = await sb.from("fdv_ue_requests").select("*").eq("id", requestId).single()
    if (rErr || !r) {
      return new Response(JSON.stringify({ error: "Fant ikke forespørselen" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } })
    }
    if (!r.ue_contact_email) {
      return new Response(JSON.stringify({ error: "UE har ingen e-postadresse" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
    }

    // Prosjektnavn (for kontekst)
    let prosjektNavn = ""
    if (r.project_id) {
      const { data: proj } = await sb.from("projects").select("name, project_number").eq("id", r.project_id).single()
      if (proj) prosjektNavn = [proj.project_number, proj.name].filter(Boolean).join(" · ")
    }

    const base = (origin || "https://app.enplattform.no").replace(/\/$/, "")
    const lenke = `${base}/#fdv_ue_levering?token=${r.token}`
    const mottakerNavn = r.ue_contact_name || r.ue_name || "der"
    const fristTxt = r.deadline ? new Date(r.deadline + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" }) : ""

    let subject = ""
    let intro = ""
    let ekstra = ""
    if (type === "reminder") {
      subject = `Påminnelse: FDV-dokumentasjon${prosjektNavn ? " – " + prosjektNavn : ""}`
      intro = `Dette er en vennlig påminnelse om at vi mangler FDV-dokumentasjon${prosjektNavn ? ` for prosjektet <strong>${esc(prosjektNavn)}</strong>` : ""}.`
    } else if (type === "rejection") {
      subject = `FDV-dokument må leveres på nytt${prosjektNavn ? " – " + prosjektNavn : ""}`
      intro = `Dokumentet <strong>${esc(rejectedDocTitle || "")}</strong> ble dessverre ikke godkjent og må leveres på nytt.`
      if (rejectedReason) ekstra = `<p style="margin:0 0 14px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#991b1b;font-size:14px;"><strong>Begrunnelse:</strong> ${esc(rejectedReason)}</p>`
    } else {
      subject = `FDV-dokumentasjon etterspurt${prosjektNavn ? " – " + prosjektNavn : ""}`
      intro = `Du er invitert til å levere FDV-dokumentasjon${prosjektNavn ? ` for prosjektet <strong>${esc(prosjektNavn)}</strong>` : ""}.`
    }

    if (r.forventet_dokumenter) {
      ekstra += `<p style="margin:0 0 14px;color:#334155;font-size:14px;"><strong>Hva som forventes:</strong><br>${esc(r.forventet_dokumenter).replace(/\n/g, "<br>")}</p>`
    }
    if (fristTxt) {
      ekstra += `<p style="margin:0 0 14px;color:#334155;font-size:14px;"><strong>Frist:</strong> ${esc(fristTxt)}</p>`
    }

    const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <p style="font-size:15px;">Hei ${esc(mottakerNavn)},</p>
      <p style="font-size:15px;line-height:1.6;">${intro}</p>
      ${ekstra}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr><td>
        <a href="${lenke}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">📎 Last opp dokumentasjon</a>
      </td></tr></table>
      <p style="font-size:13px;color:#64748b;line-height:1.5;">Fungerer ikke knappen? Kopier og lim inn denne lenken i nettleseren:<br>
      <a href="${lenke}" style="color:#059669;word-break:break-all;">${lenke}</a></p>
      <p style="font-size:13px;color:#94a3b8;margin-top:20px;">Ingen innlogging kreves. Lenken er personlig for denne leveransen.</p>
    </div>`

    const text = `Hei ${mottakerNavn},\n\n${intro.replace(/<[^>]+>/g, "")}\n${r.forventet_dokumenter ? `\nHva som forventes:\n${r.forventet_dokumenter}\n` : ""}${fristTxt ? `\nFrist: ${fristTxt}\n` : ""}${rejectedReason ? `\nBegrunnelse: ${rejectedReason}\n` : ""}\nLast opp her: ${lenke}\n\nIngen innlogging kreves.`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [r.ue_contact_email], subject, html, text }),
    })

    if (!res.ok) {
      const errTxt = await res.text()
      return new Response(JSON.stringify({ error: `Resend: ${errTxt}` }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } })
    }
    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, id: data?.id || null }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})
