// supabase/functions/befaring-view-upload-url/index.ts
//
// Genererer signed upload URL slik at UE kan laste opp bilder direkte til
// storage uten å eksponere service role key. Validerer token+email først.
//
// Request body: {
//   token: string,
//   email: string,
//   observation_id: uuid,
//   filename: string,
//   content_type: string
// }
// Response: { signedUrl: string, path: string, publicUrl: string }

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
    const { token, email, observation_id, filename, content_type } = await req.json()

    if (!token || !email || !observation_id) {
      return new Response(JSON.stringify({ error: 'Mangler påkrevde felter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Valider token + observation tilhørighet
    const { data: inspection } = await supabase
      .from('inspections')
      .select('id, view_token_expires_at')
      .eq('view_token', token)
      .single()

    if (!inspection) {
      return new Response(JSON.stringify({ error: 'Ugyldig lenke' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (inspection.view_token_expires_at && new Date(inspection.view_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Lenken har utløpt' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: observation } = await supabase
      .from('inspection_observations')
      .select('id, assigned_email, inspection_id')
      .eq('id', observation_id)
      .eq('inspection_id', inspection.id)
      .single()

    if (!observation) {
      return new Response(JSON.stringify({ error: 'Observasjon ikke funnet' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!observation.assigned_email || observation.assigned_email.toLowerCase() !== normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Ingen tilgang' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Generer path og signed upload URL
    const id = crypto.randomUUID()
    const safeName = (filename || 'image.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const path = `befaring/${inspection.id}/observations/${observation_id}/resolution-token/${id}-${safeName}`

    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('plattform-files')
      .createSignedUploadUrl(path)

    if (uploadErr) throw uploadErr

    const { data: { publicUrl } } = supabase
      .storage
      .from('plattform-files')
      .getPublicUrl(path)

    // 3) Logg
    await supabase.from('inspection_view_audit').insert({
      inspection_id: inspection.id,
      observation_id,
      action: 'upload_image',
      actor_email: normalizedEmail,
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '',
      user_agent: req.headers.get('user-agent') ?? '',
      metadata: { filename: safeName, content_type },
    })

    return new Response(JSON.stringify({
      signedUrl: uploadData.signedUrl,
      path,
      publicUrl,
      token: uploadData.token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('befaring-view-upload-url error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Server-feil' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
