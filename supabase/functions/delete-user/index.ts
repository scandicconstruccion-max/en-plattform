// supabase/functions/delete-user/index.ts
//
// Fullstendig sletting av en bruker (GDPR «retten til å bli glemt»):
//  - sletter persondata (push_subscriptions, notifications, user_profiles)
//  - sletter selve Auth-kontoen (fjerner e-post fra auth.users)
//
// Autorisasjon: kun platform_owner ELLER admin i SAMME bedrift kan slette.
//
// DEPLOY:
//   1) Lag funksjonen i Supabase → Edge Functions → "delete-user", lim inn denne koden.
//   2) La "Verify JWT" stå PÅ (kun innloggede kan kalle).
//   3) Secrets som trengs (settes automatisk av Supabase): SUPABASE_URL,
//      SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
//   4) Kall fra appen: supabase.functions.invoke('delete-user', { body: { target_user_id } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { target_user_id } = await req.json()
    if (!target_user_id) return json({ error: 'target_user_id mangler' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Identifiser den som kaller (via deres egen JWT)
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller } } = await userClient.auth.getUser()
    if (!caller) return json({ error: 'Ikke autentisert' }, 401)

    // Admin-klient (service role) for autorisasjonssjekk og sletting
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: callerProfile } = await admin.from('user_profiles').select('role, platform_role, company_id').eq('id', caller.id).single()
    const { data: targetProfile } = await admin.from('user_profiles').select('id, company_id').eq('id', target_user_id).single()
    if (!targetProfile) return json({ error: 'Bruker finnes ikke' }, 404)

    const erEier = callerProfile?.platform_role === 'platform_owner'
    const erAdminSammeBedrift = callerProfile?.role === 'admin' && callerProfile?.company_id === targetProfile.company_id
    if (!erEier && !erAdminSammeBedrift) return json({ error: 'Ikke autorisert' }, 403)
    if (caller.id === target_user_id) return json({ error: 'Du kan ikke slette din egen konto her' }, 400)

    // Slett persondata (best-effort) + selve profilen
    await admin.from('push_subscriptions').delete().eq('user_id', target_user_id)
    await admin.from('notifications').delete().eq('user_id', target_user_id)
    await admin.from('user_profiles').delete().eq('id', target_user_id)

    // Slett Auth-kontoen (fjerner e-post fra auth.users)
    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id)
    if (delErr) return json({ error: 'Profil slettet, men Auth-konto feilet: ' + delErr.message }, 207)

    return json({ ok: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
