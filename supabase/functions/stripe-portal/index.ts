// ============================================================================
//  Edge Function: stripe-portal
//  Åpner Stripes kundeportal for bedriften — der kan kunden se og laste ned
//  alle fakturaer, bytte betalingskort og si opp abonnementet.
//
//  ⚠️ Krever at kundeportalen er aktivert i Stripe:
//     Settings → Billing → Customer portal → aktiver og lagre standardoppsettet.
//
//  Hemmeligheter i Supabase (Secrets): STRIPE_SECRET_KEY  (sk_test_...)
//  Automatisk tilgjengelig: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function stripe(path: string, params: Record<string, string | undefined>) {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) body.append(k, String(v))
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Stripe-feil (${res.status})`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt)
    if (uErr || !user) return json({ error: 'Ikke innlogget' }, 401)

    const { data: profile } = await admin
      .from('user_profiles').select('company_id, role').eq('id', user.id).single()
    if (!profile?.company_id) return json({ error: 'Ingen bedrift funnet' }, 400)
    if (!['admin', 'leder', 'platform_owner'].includes(profile.role || ''))
      return json({ error: 'Kun administrator kan administrere abonnement' }, 403)

    const { data: company } = await admin
      .from('company_settings').select('stripe_customer_id').eq('id', profile.company_id).single()
    if (!company?.stripe_customer_id)
      return json({ error: 'Ingen betalingskonto funnet — start abonnement først' }, 400)

    const reqBody = await req.json().catch(() => ({}))
    const origin = (reqBody.origin as string) || 'https://en-plattform-staging.vercel.app'
    const session = await stripe('billing_portal/sessions', {
      customer: company.stripe_customer_id,
      return_url: `${origin}/#minbedrift`,
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
