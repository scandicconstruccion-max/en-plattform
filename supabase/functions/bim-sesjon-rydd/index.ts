// Edge Function: bim-sesjon-rydd
// ------------------------------------------------------------------
// Kjører med service_role og omgår RLS-quirken på Storage .remove()/signed URL.
// Kalles fra frontend via supabase.functions.invoke('bim-sesjon-rydd', { body }).
//
// Støttede actions (body.action):
//   'slett'            { sesjonId }                         -> { ok, storageSlettet }
//   'hent-signert-url' { storagePath, gyldigSekunder? }     -> { ok, url }
//
// Krav i Supabase:
//   - Tabell:  bim_sesjoner (kolonner: id, user_id, ifc_file_path, ...)
//   - Bucket:  bim-ifc-files
//   - Secrets: SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY settes automatisk
//              av Supabase for deployede functions.
//
// Deploy:  supabase functions deploy bim-sesjon-rydd
// (verifiser at du er koblet mot riktig prosjekt før deploy).
// ------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'bim-ifc-files'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'Mangler SUPABASE_URL/SERVICE_ROLE_KEY' }, 500)
    }

    // Klient med service_role — omgår RLS.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Autentiser kalleren via JWT-en fra Authorization-headeren, slik at vi
    // kun opererer på egne sesjoner (service_role ellers ser alt).
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ ok: false, error: 'Mangler Authorization' }, 401)

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return json({ ok: false, error: 'Ugyldig sesjon' }, 401)
    }
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    // ---------------------------------------------------------------
    // Action: slett  — slett en sesjon + tilhørende IFC-fil i Storage
    // ---------------------------------------------------------------
    if (action === 'slett') {
      const sesjonId = body?.sesjonId
      if (!sesjonId) return json({ ok: false, error: 'Mangler sesjonId' }, 400)

      // Hent sesjonen (kun egen) for å finne Storage-stien.
      const { data: sesjon, error: hentFeil } = await admin
        .from('bim_sesjoner')
        .select('id, user_id, ifc_file_path')
        .eq('id', sesjonId)
        .single()

      if (hentFeil || !sesjon) {
        return json({ ok: false, error: 'Fant ikke sesjonen' }, 404)
      }
      if (sesjon.user_id !== userId) {
        return json({ ok: false, error: 'Ikke tilgang til sesjonen' }, 403)
      }

      // Best-effort Storage-sletting.
      let storageSlettet = false
      const storagePath = sesjon.ifc_file_path
      if (storagePath) {
        const { data: fjernet, error: remFeil } = await admin.storage
          .from(BUCKET)
          .remove([storagePath])
        if (!remFeil && Array.isArray(fjernet) && fjernet.length > 0) {
          storageSlettet = true
        } else {
          // Fallback: list mappen og slett alt som ligger der.
          const mappe = storagePath.split('/').slice(0, -1).join('/')
          const { data: filer } = await admin.storage.from(BUCKET).list(mappe)
          if (filer && filer.length > 0) {
            const stier = filer.map((f: { name: string }) => `${mappe}/${f.name}`)
            const { data: fjernet2 } = await admin.storage
              .from(BUCKET)
              .remove(stier)
            if (Array.isArray(fjernet2) && fjernet2.length > 0) {
              storageSlettet = true
            }
          }
        }
      }

      // Slett selve sesjonsraden.
      const { error: delFeil } = await admin
        .from('bim_sesjoner')
        .delete()
        .eq('id', sesjonId)
      if (delFeil) {
        return json({ ok: false, error: delFeil.message }, 500)
      }

      return json({ ok: true, storageSlettet })
    }

    // ---------------------------------------------------------------
    // Action: hent-signert-url — signert nedlastings-URL til IFC-filen
    // ---------------------------------------------------------------
    if (action === 'hent-signert-url') {
      const storagePath = body?.storagePath
      const gyldigSekunder = Number(body?.gyldigSekunder) || 3600
      if (!storagePath) return json({ ok: false, error: 'Mangler storagePath' }, 400)

      // Sikkerhet: stien må starte med brukerens egen id (<user_id>/...).
      if (!String(storagePath).startsWith(`${userId}/`)) {
        return json({ ok: false, error: 'Ikke tilgang til filen' }, 403)
      }

      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, gyldigSekunder)
      if (error) return json({ ok: false, error: error.message }, 500)

      return json({ ok: true, url: data?.signedUrl || null })
    }

    return json({ ok: false, error: `Ukjent action: ${action}` }, 400)
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message || 'Ukjent feil' }, 500)
  }
})
