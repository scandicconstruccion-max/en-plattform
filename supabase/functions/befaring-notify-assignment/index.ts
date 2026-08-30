// supabase/functions/befaring-notify-assignment/index.ts
//
// Sender e-post + in-app notification til mottaker når en observasjon
// tildeles dem (intern ansatt eller ekstern UE).
//
// Brukes både ved opprettelse og senere endring av tildeling.
// Idempotent: Hvis samme tildeling allerede er varslet, sendes ikke duplikat.
//
// Request body: {
//   observation_id: uuid,
//   include_email: boolean (default true),
// }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { observation_id, include_email } = await req.json()
    if (!observation_id) {
      return new Response(JSON.stringify({ error: 'observation_id mangler' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sendEmail = include_email !== false

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Hent observation + inspection
    const { data: observation, error: obsErr } = await supabase
      .from('inspection_observations')
      .select('id, sequence_number, title, description, location_ref, due_date, category, severity, inspection_id, assigned_to_user_id, assigned_email, assigned_role, sent_log')
      .eq('id', observation_id)
      .single()

    if (obsErr || !observation) {
      return new Response(JSON.stringify({ error: 'Observasjon ikke funnet' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: inspection } = await supabase
      .from('inspections')
      .select('id, title, location, date, view_token, view_token_expires_at, project_id')
      .eq('id', observation.inspection_id)
      .single()

    // 2) Bestem mottaker
    // Hvis assigned_to_user_id finnes, hent e-post fra user_profiles eller employees
    let recipientEmail: string | null = null
    let recipientName: string | null = null
    let isInternal = false

    if (observation.assigned_to_user_id) {
      // Intern ansatt med konto
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', observation.assigned_to_user_id)
        .maybeSingle()

      if (profile) {
        recipientEmail = profile.email
        recipientName = profile.full_name
      }

      // Fallback: hent fra employees-tabellen
      if (!recipientEmail) {
        const { data: emp } = await supabase
          .from('employees')
          .select('email, first_name, last_name')
          .eq('user_id', observation.assigned_to_user_id)
          .maybeSingle()
        if (emp) {
          recipientEmail = emp.email
          recipientName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
        }
      }
      isInternal = true
    } else if (observation.assigned_email) {
      // Ekstern eller intern uten konto — bare e-post
      recipientEmail = observation.assigned_email
      // Sjekk om det er en intern ansatt uten konto (slik at vi kan hente navn)
      const { data: empByEmail } = await supabase
        .from('employees')
        .select('first_name, last_name, user_id')
        .ilike('email', observation.assigned_email)
        .maybeSingle()
      if (empByEmail) {
        recipientName = `${empByEmail.first_name || ''} ${empByEmail.last_name || ''}`.trim()
        isInternal = !!empByEmail.user_id // Selv om vi varsler via e-post, vet vi om de har konto
      }
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: true, sent_to: null, reason: 'Ingen mottaker' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = recipientEmail.trim().toLowerCase()

    // 3) Sjekk om vi allerede har varslet (idempotency basert på sent_log)
    const sentLog: any[] = Array.isArray(observation.sent_log) ? observation.sent_log : []
    const alreadyNotified = sentLog.some(entry =>
      entry?.type === 'assignment' &&
      entry?.to?.toLowerCase() === normalizedEmail
    )
    if (alreadyNotified) {
      return new Response(JSON.stringify({ success: true, sent_to: normalizedEmail, skipped: 'duplicate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4) Bygg e-post (hvis include_email)
    let emailSent = false
    if (sendEmail) {
      const subject = `🔔 Du har fått tildelt et befaringspunkt: ${observation.title || 'Punkt #' + observation.sequence_number}`
      const appUrl = Deno.env.get('APP_URL') ?? 'https://en-plattform.vercel.app'

      // For interne ansatte med konto, bruk app-link.
      // For ansatte/UE uten konto, bruk view-token-link.
      let actionLink: string | null = null
      let actionLabel = ''

      if (observation.assigned_to_user_id) {
        // Intern bruker — link til app
        actionLink = `${appUrl}/#befaring`
        actionLabel = '📋 Se i appen'
      } else if (
        inspection?.view_token &&
        (!inspection.view_token_expires_at || new Date(inspection.view_token_expires_at) > new Date())
      ) {
        // UE eller intern uten konto — link til view-token
        actionLink = `${appUrl}/befaring-view?token=${inspection.view_token}&email=${encodeURIComponent(normalizedEmail)}`
        actionLabel = '📋 Åpne befaring'
      }

      const linkBlock = actionLink ? `
        <div style="text-align:center; margin: 24px 0 8px;">
          <a href="${actionLink}" style="display:inline-block; background:#2563eb; color:white; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:700; font-size:15px;">${actionLabel}</a>
        </div>
      ` : ''

      const dueBlock = observation.due_date ? `
        <tr>
          <td style="padding: 6px 0; color: #d97706; font-size: 13px; font-weight:600;">📅 Frist:</td>
          <td style="padding: 6px 0; color: #d97706; font-size: 13px; font-weight:600;">${escapeHtml(observation.due_date)}</td>
        </tr>
      ` : ''

      const html = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div style="background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; padding: 18px; margin-bottom: 18px; text-align: center;">
      <div style="font-size: 36px; margin-bottom: 6px; line-height: 1;">🔔</div>
      <h1 style="margin: 0 0 6px; color: #1e3a8a; font-size: 19px;">Du har fått en oppgave</h1>
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
        ${recipientName ? `Hei ${escapeHtml(recipientName)}, d` : 'D'}u har blitt tildelt et befaringspunkt som må utbedres.
      </p>
    </div>

    <table style="width:100%; border-collapse: collapse; margin-bottom: 4px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 110px;">Befaring:</td>
        <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(inspection?.title || '')}</td>
      </tr>
      ${inspection?.location ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Sted:</td>
        <td style="padding: 6px 0; font-size: 13px; color: #0f172a;">${escapeHtml(inspection.location)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Punkt:</td>
        <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;">#${observation.sequence_number} — ${escapeHtml(observation.title || '')}</td>
      </tr>
      ${observation.description ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px; vertical-align: top;">Beskrivelse:</td>
        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; white-space: pre-wrap;">${escapeHtml(observation.description)}</td>
      </tr>` : ''}
      ${observation.location_ref ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">📍 Plassering:</td>
        <td style="padding: 6px 0; font-size: 13px; color: #2563eb; font-weight:500;">${escapeHtml(observation.location_ref)}</td>
      </tr>` : ''}
      ${dueBlock}
    </table>

    ${linkBlock}
  </div>
  <p style="margin: 16px 0 0; text-align:center; color: #94a3b8; font-size: 11px;">Sendt fra En Plattform</p>
</div>
      `

      try {
        // Send e-post direkte via Resend (samme leverandør som send-quote bruker).
        // Vi unngår å kalle send-quote internt fordi function-til-function-kall via
        // Supabase Functions Gateway krever JWT-autentisering som er upraktisk å håndtere.
        const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
        const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'tilbud@enplattform.no'

        if (!resendApiKey) {
          console.warn('[notify-assignment] RESEND_API_KEY mangler i Edge Function secrets')
        } else {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [normalizedEmail],
              subject,
              html,
            }),
          })
          const data = await res.json().catch(() => ({}))
          emailSent = res.ok
          if (res.ok) {
            console.log('[notify-assignment] E-post sendt til', normalizedEmail, '- Resend ID:', data?.id || '(ingen)')
          } else {
            console.warn('[notify-assignment] Resend returnerte', res.status, data?.message || JSON.stringify(data))
          }
        }
      } catch (e) {
        console.warn('[notify-assignment] E-post-sending feilet:', e)
      }
    }

    // 5) In-app notification hvis intern bruker har konto
    if (observation.assigned_to_user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: observation.assigned_to_user_id,
          title: `🔔 Ny oppgave: ${observation.title || 'Punkt #' + observation.sequence_number}`,
          message: `Du har blitt tildelt et befaringspunkt${inspection?.title ? ' i "' + inspection.title + '"' : ''}.${observation.due_date ? ' Frist: ' + observation.due_date : ''}`,
          type: 'info',
          link_page: 'befaring',
        })
      } catch (e) {
        console.warn('In-app notification feilet:', e)
      }
    }

    // 6) Marker varslet i sent_log (idempotency)
    try {
      const newEntry = {
        type: 'assignment',
        to: normalizedEmail,
        sent_at: new Date().toISOString(),
        is_internal: isInternal,
        email_sent: emailSent,
      }
      await supabase
        .from('inspection_observations')
        .update({ sent_log: [...sentLog, newEntry] })
        .eq('id', observation_id)
    } catch (e) {
      console.warn('sent_log oppdatering feilet:', e)
    }

    // 7) Audit-logg
    try {
      await supabase.from('inspection_view_audit').insert({
        inspection_id: observation.inspection_id,
        observation_id,
        action: 'assignment_notify',
        actor_email: normalizedEmail,
        actor_name: recipientName || null,
        metadata: { is_internal: isInternal, email_sent: emailSent },
      })
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      sent_to: normalizedEmail,
      is_internal: isInternal,
      email_sent: emailSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('befaring-notify-assignment error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Server-feil' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
