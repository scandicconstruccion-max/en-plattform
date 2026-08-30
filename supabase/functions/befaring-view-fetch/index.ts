// supabase/functions/befaring-view-fetch/index.ts
//
// Validerer view_token + mottakers email, returnerer begrenset inspection-data
// + observasjoner som er tildelt denne mottakeren.
//
// Request body: { token: string, email: string }
// Response: { inspection: {...}, observations: [...], project: {...} }

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
    const { token, email } = await req.json()

    if (!token || !email) {
      return new Response(JSON.stringify({ error: 'Token og email er påkrevd' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Service role client — kan lese alt, men vi filtrerer manuelt
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Hent inspection ut fra token
    const { data: inspection, error: insErr } = await supabase
      .from('inspections')
      .select('id, title, location, date, inspection_type, status, project_id, view_token, view_token_expires_at')
      .eq('view_token', token)
      .single()

    if (insErr || !inspection) {
      return new Response(JSON.stringify({ error: 'Ugyldig eller utløpt lenke' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Sjekk utløp
    if (inspection.view_token_expires_at && new Date(inspection.view_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Lenken har utløpt. Be byggleder om ny lenke.' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Hent observasjoner tildelt denne email-adressen
    const { data: observations, error: obsErr } = await supabase
      .from('inspection_observations')
      .select('id, sequence_number, title, description, voice_transcript, location_ref, images, category, severity, assigned_email, assigned_role, status, due_date, resolution_note, resolution_images, resolved_at, resolved_by_email, resolved_by_name, approved_at, approval_note, rejected_at, rejection_note, created_at')
      .eq('inspection_id', inspection.id)
      .ilike('assigned_email', normalizedEmail)
      .order('sequence_number', { ascending: true })

    if (obsErr) throw obsErr

    // 4) Hent prosjekt-info (begrenset)
    let project = null
    if (inspection.project_id) {
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name, project_number')
        .eq('id', inspection.project_id)
        .single()
      project = proj
    }

    // 5) Hent firma-info for byggleder (slik at UE ser hvem som sender)
    // (valgfritt — la stå tomt for nå)

    // 6) Logg "view"-handling
    await supabase.from('inspection_view_audit').insert({
      inspection_id: inspection.id,
      action: 'view',
      actor_email: normalizedEmail,
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '',
      user_agent: req.headers.get('user-agent') ?? '',
      metadata: { observation_count: observations?.length || 0 },
    })

    return new Response(
      JSON.stringify({
        inspection: {
          id: inspection.id,
          title: inspection.title,
          location: inspection.location,
          date: inspection.date,
          inspection_type: inspection.inspection_type,
          status: inspection.status,
        },
        project,
        observations: observations || [],
        viewer_email: normalizedEmail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('befaring-view-fetch error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Server-feil' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
