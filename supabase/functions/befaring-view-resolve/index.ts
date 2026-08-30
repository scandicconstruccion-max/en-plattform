// supabase/functions/befaring-view-resolve/index.ts
//
// UE markerer observasjon som utbedret via token-side.
// Validerer token+email mot observasjon, oppdaterer status til 'utbedret',
// lagrer notat og bilder. Trigger e-post til byggleder.
//
// Request body: {
//   token: string,
//   email: string,
//   observation_id: uuid,
//   note: string,
//   images: [{ url, uploaded_at }],
//   resolver_name?: string
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
    const body = await req.json()
    const { token, email, observation_id, note, images, resolver_name } = body

    if (!token || !email || !observation_id) {
      return new Response(JSON.stringify({ error: 'Mangler påkrevde felter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!note || !note.trim()) {
      return new Response(JSON.stringify({ error: 'Beskrivelse av utbedring er påkrevd' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'Minst ett bilde er påkrevd' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Valider token + finn inspection
    const { data: inspection, error: insErr } = await supabase
      .from('inspections')
      .select('id, view_token, view_token_expires_at, title, project_id, created_by')
      .eq('view_token', token)
      .single()

    if (insErr || !inspection) {
      return new Response(JSON.stringify({ error: 'Ugyldig lenke' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (inspection.view_token_expires_at && new Date(inspection.view_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Lenken har utløpt' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Valider at observation tilhører inspection OG er tildelt mottakers email
    const { data: observation, error: obsErr } = await supabase
      .from('inspection_observations')
      .select('id, inspection_id, assigned_email, status, title, sequence_number')
      .eq('id', observation_id)
      .eq('inspection_id', inspection.id)
      .single()

    if (obsErr || !observation) {
      return new Response(JSON.stringify({ error: 'Observasjon ikke funnet' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!observation.assigned_email || observation.assigned_email.toLowerCase() !== normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Du har ikke tilgang til denne observasjonen' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Sjekk at status tillater utbedring
    if (!['apen', 'pagar', 'avvist'].includes(observation.status)) {
      return new Response(JSON.stringify({
        error: `Kan ikke markere som utbedret — punktet har status "${observation.status}"`,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4) Oppdater observasjon
    const { error: updateErr } = await supabase
      .from('inspection_observations')
      .update({
        status: 'utbedret',
        resolution_note: String(note).trim(),
        resolution_images: images,
        resolved_at: new Date().toISOString(),
        resolved_via_token: true,
        resolved_by_email: normalizedEmail,
        resolved_by_name: resolver_name || null,
      })
      .eq('id', observation_id)

    if (updateErr) throw updateErr

    // 5) Logg handling
    await supabase.from('inspection_view_audit').insert({
      inspection_id: inspection.id,
      observation_id,
      action: 'resolve',
      actor_email: normalizedEmail,
      actor_name: resolver_name || null,
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '',
      user_agent: req.headers.get('user-agent') ?? '',
      metadata: { image_count: images.length },
    })

    // 6) Send varsel-epost til byggleder
    try {
      let builderEmail: string | null = null
      let builderName: string | null = null
      if (inspection.created_by) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('id', inspection.created_by)
          .single()
        if (profile) {
          builderEmail = profile.email
          builderName = profile.full_name
        }
      }

      if (builderEmail) {
        const appUrl = Deno.env.get('APP_URL') ?? 'https://en-plattform.vercel.app'
        const html = `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 8px; color: #064e3b; font-size: 18px;">✅ Punkt markert som utbedret</h2>
              <p style="margin: 0; color: #065f46; font-size: 14px;">${resolver_name || normalizedEmail} har lagt inn dokumentasjon på et befaringspunkt.</p>
            </div>
            <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Befaring:</td><td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${escapeHtml(inspection.title || '')}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Punkt:</td><td style="padding: 6px 0; font-size: 13px; font-weight: 600;">#${observation.sequence_number} — ${escapeHtml(observation.title || '')}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Utbedret av:</td><td style="padding: 6px 0; font-size: 13px;">${escapeHtml(resolver_name || '')} ${escapeHtml(normalizedEmail)}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Beskrivelse:</td><td style="padding: 6px 0; font-size: 13px;">${escapeHtml(String(note).trim())}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Bilder:</td><td style="padding: 6px 0; font-size: 13px;">${images.length} stk</td></tr>
            </table>
            <a href="${appUrl}/#befaring" style="display: inline-block; background: #059669; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Gå til befaring for å godkjenne</a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Sendt via En Plattform</p>
          </div>
        `

        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            to: builderEmail,
            subject: `✅ Punkt utbedret: ${observation.title || ''} (#${observation.sequence_number})`,
            html,
          }),
        }).catch(e => console.warn('E-post-varsel feilet:', e))
      }

      // Også in-app notification
      if (inspection.created_by) {
        await supabase.from('notifications').insert({
          user_id: inspection.created_by,
          title: `✅ Punkt utbedret: ${observation.title || ''}`,
          message: `${resolver_name || normalizedEmail} har lagt inn dokumentasjon på #${observation.sequence_number}`,
          type: 'success',
          link_page: 'befaring',
        }).then(r => r).catch(e => console.warn('Notification insert feilet:', e))
      }
    } catch (notifyErr) {
      console.warn('Varsling feilet (men oppdatering OK):', notifyErr)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('befaring-view-resolve error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Server-feil' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
