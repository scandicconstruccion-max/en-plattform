// Supabase Edge Function: send-materialliste
// Sender en materialliste på e-post (med PDF vedlagt) via Resend.
//
// Deploy:
//   supabase functions deploy send-materialliste --project-ref zffzvvtuycjbrdybajwu
// Secrets (samme som øvrige send-funksjoner):
//   supabase secrets set RESEND_API_KEY=... FROM_EMAIL=ikke.svar@enplattform.no
// Verify JWT: PÅ (kalles fra innlogget app via supabase.functions.invoke)
//
// Body (fra frontend):
//   { to, message, title, project, date, textList, pdfBase64, filename }

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { to, message, title, project, date, leveringsAdresse, kontaktNavn, kontaktTlf, textList, pdfBase64, filename } = await req.json()

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: "Ugyldig mottaker" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ikke.svar@enplattform.no"
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY mangler i secrets" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
    }

    const emneDeler = ["Materialliste", title].filter(Boolean)
    const subject = emneDeler.join(" – ")

    const infoLinjer = [
      project && `Prosjekt: ${project}`,
      date && `Leveringsdato: ${date}`,
      leveringsAdresse && `Leveres til: ${leveringsAdresse}`,
      (kontaktNavn || kontaktTlf) && `Kontakt: ${[kontaktNavn, kontaktTlf].filter(Boolean).join(", ")}`,
    ].filter(Boolean)

    const tekst = [message || "", ...infoLinjer, "", textList || ""].join("\n")

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.6;">
        ${(message || "").replace(/\n/g, "<br>")}
        ${infoLinjer.length ? `<p style="color:#334155;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;">${infoLinjer.map((l) => `<span>${l}</span>`).join("<br>")}</p>` : ""}
        <p style="color:#64748b;font-size:13px;">Full materialliste ligger vedlagt som PDF.</p>
      </div>`

    const attachments = pdfBase64
      ? [{ filename: filename || "materialliste.pdf", content: pdfBase64 }]
      : undefined

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        text: tekst,
        html,
        attachments,
      }),
    })

    if (!res.ok) {
      const errTxt = await res.text()
      return new Response(JSON.stringify({ error: `Resend: ${errTxt}` }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } })
    }

    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, id: data?.id || null }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})
