// ============================================================================
//  Edge Function: stripe-checkout  (robust versjon — uten Stripe-bibliotek)
//  Snakker direkte med Stripe sitt API via fetch, så den ikke kan krasje på
//  oppstart pga. et eksternt bibliotek.
//
//  Hemmeligheter i Supabase (Secrets):
//    STRIPE_SECRET_KEY   (sk_test_...)
//  Automatisk tilgjengelig: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Prismodell — speiler MODULE_CATALOG i App.jsx (kr/mnd eks. mva)
const PER_USER: Record<string, number> = {
  grunnpakke: 239, tilbud: 39, ordre: 49, endringsmelding: 39, faktura: 59,
  timelister: 49, kalender: 12, chat: 79, befaring: 69, bildedok: 69, fdv: 109, crm: 149,
}
const PER_COMPANY: Record<string, number> = {
  kalkulator: 1499, bim_kalkyle: 1899, anbudsmodul: 799, ressursplan: 349,
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Kall Stripe REST API (form-encoding)
async function stripe(path: string, params: Record<string, string | number | undefined>) {
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
      return json({ error: 'Kun administrator kan starte abonnement' }, 403)

    const { data: company } = await admin
      .from('company_settings').select('*').eq('id', profile.company_id).single()
    if (!company) return json({ error: 'Fant ikke bedriftsinnstillinger' }, 400)
    const { data: users } = await admin
      .from('user_profiles').select('role, module_access').eq('company_id', profile.company_id)

    const aktive: string[] = company.active_modules || []
    const brukere = users || []
    const antallBrukere = brukere.length || company.num_users || 0
    let totalKr = 0
    if (aktive.includes('grunnpakke')) totalKr += PER_USER.grunnpakke * antallBrukere
    for (const [id, pris] of Object.entries(PER_COMPANY)) if (aktive.includes(id)) totalKr += pris
    for (const [id, pris] of Object.entries(PER_USER)) {
      if (id === 'grunnpakke' || !aktive.includes(id)) continue
      const seter = brukere.filter((u) => u.role !== 'les' && (u.module_access || []).includes(id)).length
      totalKr += pris * seter
    }
    if (totalKr <= 0) return json({ error: 'Ingen aktive moduler å fakturere ennå' }, 400)
    const totalOre = Math.round(totalKr * 100)

    let customerId: string | null = company.stripe_customer_id || null
    if (!customerId) {
      const c = await stripe('customers', { email: user.email || undefined, 'preferred_locales[0]': 'nb', 'metadata[company_id]': profile.company_id })
      customerId = c.id
      await admin.from('company_settings').update({ stripe_customer_id: customerId }).eq('id', profile.company_id)
    }

    const reqBody = await req.json().catch(() => ({}))
    const origin = (reqBody.origin as string) || 'https://en-plattform-staging.vercel.app'
    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      locale: 'nb',
      customer: customerId!,
      'line_items[0][quantity]': 1,
      'line_items[0][price_data][currency]': 'nok',
      'line_items[0][price_data][product_data][name]': 'En Plattform – månedsabonnement',
      'line_items[0][price_data][unit_amount]': totalOre,
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][tax_behavior]': 'exclusive',
      'subscription_data[metadata][company_id]': profile.company_id,
      'adaptive_pricing[enabled]': 'false',
      'automatic_tax[enabled]': 'true',
      'billing_address_collection': 'required',
      'customer_update[address]': 'auto',
      success_url: `${origin}/?abonnement=ok#minbedrift`,
      cancel_url: `${origin}/?abonnement=avbrutt#minbedrift`,
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
