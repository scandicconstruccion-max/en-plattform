// ════════════════════════════════════════════════════════════════════════
// send-quote — Edge-funksjon for å sende e-post via Resend
// ════════════════════════════════════════════════════════════════════════
// Versjon 5 — KREVER innlogget bruker (lukker det åpne e-post-reléet).
//
// Endring fra v4:
//   • Leser kallerens JWT og avviser alle som ikke er en autentisert bruker
//     (rolle 'anon' / manglende token → 401). Dette er den EGENTLIGE sperren;
//     plattform-toggelen "Verify JWT" alene holder ikke, fordi den offentlige
//     anon-nøkkelen i seg selv er en gyldig JWT som passerer den.
//   • sender_user_id i sent_emails settes fra den verifiserte kalleren
//     (caller.id), ikke fra en klient-oppgitt verdi som kan forfalskes.
//   • Alt annet (from/fromName, reply_to, vedlegg, sent_emails-logging for
//     bounce-fangst) er uendret fra v4.
//
// Body (JSON): { to, subject, html, fromName?, replyTo?, attachments? }
//   (senderUserId fra klienten ignoreres nå — vi bruker den verifiserte brukeren.)
//
// Miljøvariabler:
//   RESEND_API_KEY, FROM_EMAIL (default noreply@enplattform.no)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//
// DEPLOY: Verify JWT kan stå PÅ (ekstra lag) — koden sjekker uansett brukeren.
// ════════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function sanitizeFromName(name: string): string {
  return String(name || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/["\\<>]/g, "")
    .trim()
    .slice(0, 80)
}

function isValidEmail(e: unknown): boolean {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // ─── Auth: kun innloggede brukere kan sende ──────────────────────────
    // Anon-nøkkelen passerer plattformens "Verify JWT", så vi må sjekke i
    // koden at kalleren faktisk er en autentisert bruker (ikke anon).
    const authHeader = req.headers.get("Authorization") || ""
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await userClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: "Ikke autentisert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { to, subject, html, attachments, fromName, replyTo } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const apiKey = Deno.env.get("RESEND_API_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@enplattform.no"

    let from = fromEmail
    if (fromName) {
      const renset = sanitizeFromName(fromName)
      if (renset) {
        from = `${renset} <${fromEmail}>`
      }
    }

    const resendBody: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }

    if (replyTo && isValidEmail(replyTo)) {
      resendBody.reply_to = replyTo
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      resendBody.attachments = attachments
        .filter((a) => a && a.filename && a.content)
        .map((a) => ({
          filename: String(a.filename),
          content: String(a.content),
        }))
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData)
      return new Response(
        JSON.stringify({
          error: resendData?.message || "Resend API failed",
          details: resendData,
        }),
        { status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─── Bounce-fangst (Nivå 2): lagre sendt e-post ──────────────────────
    // Best effort — skal ALDRI hindre at e-posten regnes som sendt.
    try {
      if (resendData?.id) {
        const sb = createClient(supabaseUrl, serviceKey)
        const recipient = Array.isArray(to) ? to[0] : to
        await sb.from("sent_emails").insert({
          resend_email_id: resendData.id,
          sender_user_id: caller.id, // verifisert avsender
          recipient_email: recipient,
          subject,
        })
      }
    } catch (logErr) {
      console.warn("Kunne ikke lagre sent_emails (e-post ble likevel sendt):", logErr)
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("send-quote error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
