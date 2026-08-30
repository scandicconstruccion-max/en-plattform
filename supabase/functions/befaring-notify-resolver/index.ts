// supabase/functions/befaring-notify-resolver/index.ts
//
// Sender e-post + in-app notification til UE/utbedrer når byggleder
// godkjenner eller avviser en utbedring.
//
// Request body: {
//   observation_id: uuid,
//   action: 'approve' | 'reject',
//   note?: string,
// }
//
// Bruker authenticated bruker (byggleder) sin JWT for å validere RLS.
// Response: { success: true, sent_to: string | null }

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
    const { observation_id, action, note } = await req.json()

    if (!observation_id || !action) {
      return new Response(JSON.stringify({ error: 'Mangler påkrevde felter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Ugyldig action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Hent observation + inspection-info
    const { data: observation, error: obsErr } = await supabase
      .from('inspection_observations')
      .select('id, sequence_number, title, description, inspection_id, assigned_email, assigned_to_user_id, resolved_by_email, resolved_by_name, resolution_note, resolved_via_token')
      .eq('id', observation_id)
      .single()

    if (obsErr || !observation) {
      console.error('[notify-resolver] Observasjon ikke funnet:', observation_id, obsErr)
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
    // Prioritet:
    //   1. resolved_by_email (UE som faktisk utbedret via token-side)
    //   2. assigned_email (UE som er tildelt)
    //   3. assigned_to_user_id → slå opp e-post fra user_profiles eller employees (intern ansatt)
    let recipient: string | null = null
    let recipientName: string | null = observation.resolved_by_name || ''
    let isInternalUser = false

    if (observation.resolved_by_email) {
      recipient = observation.resolved_by_email.trim().toLowerCase()
    } else if (observation.assigned_email) {
      recipient = observation.assigned_email.trim().toLowerCase()
    } else if (observation.assigned_to_user_id) {
      // Intern ansatt — slå opp e-post
      isInternalUser = true
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', observation.assigned_to_user_id)
        .maybeSingle()

      if (profile?.email) {
        recipient = profile.email.trim().toLowerCase()
        recipientName = recipientName || profile.full_name || ''
      } else {
        // Fallback: employees-tabellen
        const { data: emp } = await supabase
          .from('employees')
          .select('email, first_name, last_name')
          .eq('user_id', observation.assigned_to_user_id)
          .maybeSingle()
        if (emp?.email) {
          recipient = emp.email.trim().toLowerCase()
          recipientName = recipientName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
        }
      }
    }

    if (!recipient) {
      console.log('[notify-resolver] Ingen mottaker funnet for observasjon', observation_id, {
        has_resolved_email: !!observation.resolved_by_email,
        has_assigned_email: !!observation.assigned_email,
        has_assigned_user: !!observation.assigned_to_user_id,
      })
      return new Response(JSON.stringify({ success: true, sent_to: null, reason: 'Ingen mottaker' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[notify-resolver] Sender', action, 'til', recipient, '(intern:', isInternalUser, ')')

    // 3) Bygg lenke til view-siden hvis token finnes og er gyldig.
    // Lenke vises kun ved avvisning, og kun hvis UE bruker token (ikke for interne ansatte).
    let viewLink: string | null = null
    if (
      inspection?.view_token &&
      action === 'reject' &&
      !isInternalUser &&
      (!inspection.view_token_expires_at || new Date(inspection.view_token_expires_at) > new Date())
    ) {
      const appUrl = Deno.env.get('APP_URL') ?? 'https://en-plattform.vercel.app'
      viewLink = `${appUrl}/befaring-view?token=${inspection.view_token}&email=${encodeURIComponent(recipient)}`
    }

    // 4) Bygg e-post
    const isApprove = action === 'approve'
    const subject = isApprove
      ? `✅ Punkt #${observation.sequence_number} er godkjent: ${observation.title || ''}`.trim()
      : `🔄 Punkt #${observation.sequence_number} må gjøres på nytt: ${observation.title || ''}`.trim()

    let html: string

    if (isApprove) {
      // Godkjenning: kort, vennlig, ingen lenke. Mottaker trenger ikke gjøre noe mer.
      const approvalNoteBlock = note?.trim() ? `
        <div style="background:#f8fafc; border-left:3px solid #059669; padding:12px 14px; margin:16px 0 0; border-radius:6px;">
          <p style="margin:0 0 4px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Kommentar fra byggleder</p>
          <p style="margin:0; font-size:14px; color:#0f172a; line-height:1.5; white-space:pre-wrap;">${escapeHtml(note.trim())}</p>
        </div>
      ` : ''

      html = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 16px; padding: 32px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div style="font-size: 56px; margin-bottom: 12px; line-height: 1;">✅</div>
    <h1 style="margin: 0 0 12px; color: #064e3b; font-size: 22px;">Godkjent!</h1>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.5;">
      ${recipientName ? `Hei ${escapeHtml(recipientName)},` : 'Hei,'}<br>
      Utbedringen din av befaringspunktet er godkjent. Takk for innsatsen!
    </p>
    <div style="background: #ecfdf5; border-radius: 10px; padding: 14px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #064e3b;">
        <strong>Punkt #${observation.sequence_number}</strong>${observation.title ? ' — ' + escapeHtml(observation.title) : ''}<br>
        ${inspection?.title ? '<span style="color:#475569; font-size:12px;">Befaring: ' + escapeHtml(inspection.title) + '</span>' : ''}
      </p>
    </div>
    ${approvalNoteBlock}
  </div>
  <p style="margin: 16px 0 0; text-align:center; color: #94a3b8; font-size: 11px;">Sendt fra En Plattform</p>
</div>
      `
    } else {
      // Avvisning: detaljert, med tydelig knapp som åpner view-token-siden direkte.
      // Hvis token er utløpt, vis advarsel om at de må kontakte byggleder.
      const noteBlock = note?.trim() ? `
        <div style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 14px; margin: 16px 0; border-radius: 6px;">
          <p style="margin:0 0 6px; font-size:11px; font-weight:700; color:#991b1b; text-transform:uppercase;">Begrunnelse for avvisning</p>
          <p style="margin:0; font-size:14px; color:#0f172a; line-height:1.5; white-space:pre-wrap;">${escapeHtml(note.trim())}</p>
        </div>
      ` : ''

      const linkBlock = viewLink ? `
        <div style="text-align:center; margin: 20px 0;">
          <a href="${viewLink}" style="display:inline-block; background:#dc2626; color:white; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:700; font-size:15px;">🔄 Se årsak og send inn på nytt</a>
          <p style="margin:10px 0 0; color:#64748b; font-size:11px;">Klikk for å åpne befaringspunktet direkte — ingen innlogging nødvendig.</p>
        </div>
      ` : `
        <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:12px; margin:16px 0; text-align:center;">
          <p style="margin:0; color:#92400e; font-size:13px;">⚠️ Lenken til befaringen er utløpt. Kontakt byggleder for ny lenke.</p>
        </div>
      `

      html = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 20px; margin-bottom: 18px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px; line-height: 1;">🔄</div>
      <h1 style="margin: 0 0 6px; color: #7f1d1d; font-size: 20px;">Må gjøres på nytt</h1>
      <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
        ${recipientName ? `Hei ${escapeHtml(recipientName)}, d` : 'D'}essverre må utbedringen gjøres på nytt.
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
    </table>

    ${noteBlock}
    ${linkBlock}
  </div>
  <p style="margin: 16px 0 0; text-align:center; color: #94a3b8; font-size: 11px;">Sendt fra En Plattform</p>
</div>
      `
    }

    // 5) Send e-post direkte via Resend (samme leverandør som send-quote bruker)
    // Vi unngår å kalle send-quote internt fordi function-til-function-kall via
    // Supabase Functions Gateway krever JWT-autentisering som er upraktisk å håndtere.
    let emailSent = false
    let emailError: string | null = null
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
      const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'tilbud@enplattform.no'

      if (!resendApiKey) {
        emailError = 'RESEND_API_KEY mangler i Edge Function secrets'
        console.warn('[notify-resolver]', emailError)
      } else {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipient],
            subject,
            html,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          emailSent = true
          console.log('[notify-resolver] E-post sendt til', recipient, '- Resend ID:', data?.id || '(ingen)')
        } else {
          emailError = `Resend returnerte ${res.status}: ${data?.message || JSON.stringify(data)}`
          console.warn('[notify-resolver]', emailError)
        }
      }
    } catch (e) {
      emailError = `Exception: ${e?.message || String(e)}`
      console.warn('[notify-resolver] E-post-sending feilet:', e)
    }

    // 6) In-app notification (hvis vi finner bruker med samme e-post)
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('email', recipient)
        .limit(1)
        .maybeSingle()

      if (profile?.id) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: isApprove ? `✅ Utbedring godkjent: ${observation.title || 'Punkt'}` : `🔄 Utbedring må gjøres på nytt: ${observation.title || 'Punkt'}`,
          message: note?.trim() || (isApprove ? 'Byggleder har godkjent utbedringen.' : 'Byggleder ber om at utbedringen gjøres på nytt.'),
          type: isApprove ? 'success' : 'warning',
          link_page: 'befaring',
        })
      }
    } catch (e) {
      console.warn('In-app notification feilet:', e)
    }

    // 7) Audit-logg
    try {
      await supabase.from('inspection_view_audit').insert({
        inspection_id: observation.inspection_id,
        observation_id,
        action: isApprove ? 'approve_notify' : 'reject_notify',
        actor_email: recipient,
        actor_name: recipientName || null,
        metadata: { email_sent: emailSent, has_note: !!note?.trim() },
      })
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      sent_to: recipient,
      email_sent: emailSent,
      email_error: emailError,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('befaring-notify-resolver error:', e)
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
