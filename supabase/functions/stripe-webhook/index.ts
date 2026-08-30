// ============================================================================
//  Edge Function: stripe-webhook  (robust versjon — uten Stripe-bibliotek)
//  Sjekker Stripe-signaturen selv (Web Crypto) og oppdaterer bedriftens status.
//
//  ⚠️ Må ha "Verify JWT" SLÅTT AV i Supabase (Stripe kaller uten Supabase-token).
//
//  Hemmeligheter i Supabase (Secrets):
//    STRIPE_SECRET_KEY       (sk_test_...)
//    STRIPE_WEBHOOK_SECRET   (whsec_...)
//  Automatisk tilgjengelig: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
//  ── ENDRINGER I DENNE VERSJONEN ────────────────────────────────────────────
//  1. invoice.paid / invoice.payment_succeeded håndteres nå. De skriver
//     last_payment_date, next_due_date og payment_history. Uten dem sto
//     Kontrollpanelet tomt selv om kunden hadde betalt to ganger.
//  2. current_period_end leses fra abonnementslinjen når den mangler på selve
//     abonnementet. Stripe flyttet feltet til subscription item i nyere
//     API-versjoner, og den gamle koden gjorde da
//     new Date(undefined * 1000).toISOString() — som KASTER RangeError.
//     Det er derfor checkout.session.completed feilet med 500.
//  3. payment_history er idempotent: Stripe leverer samme hendelse på nytt
//     ved feil, og uten duplikatsjekk ville historikken vokst for hver retry.
//  4. Hver post får source: 'stripe'. «Registrer betaling»-knappen setter
//     source: 'manuell', så de to aldri dobbeltføres.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// MERK: 'trialing' → 'active' er BEHOLDT uendret med vilje. Den bør
// sannsynligvis være 'trial', men å endre den flytter status for bedrifter
// som står i Stripe-prøve akkurat nå, og det er en egen beslutning.
// Modultilgangen i appen styres uansett av trial_ends_at, ikke av dette feltet.
const statusMap: Record<string, string> = {
  active: 'active', trialing: 'active', past_due: 'past_due',
  canceled: 'canceled', unpaid: 'past_due',
  incomplete: 'trial', incomplete_expired: 'canceled',
}

// Verifiser Stripe-signaturen (HMAC-SHA256 over "timestamp.payload")
async function verifiserSignatur(payload: string, header: string, secret: string): Promise<boolean> {
  let t = ''
  const v1: string[] = []
  for (const del of header.split(',')) {
    const [k, ...rest] = del.trim().split('=')
    const val = rest.join('=')
    if (k === 't') t = val
    else if (k === 'v1') v1.push(val)
  }
  if (!t || v1.length === 0) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return v1.includes(hex)
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Stripe-feil (${res.status})`)
  return data
}

// ── Periodeslutt, uansett API-versjon ───────────────────────────────────────
// Fram til API-versjon 2025-03-31 lå current_period_end på selve abonnementet.
// Etter det ligger den på hver linje i sub.items.data[]. Den gamle koden leste
// bare det første stedet, og fikk undefined på nyere versjoner.
// new Date(NaN).toISOString() kaster RangeError — derfor 500 og ingen skriving.
function periodeSlutt(sub: any): string | null {
  const raa = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  if (!raa) return null
  const d = new Date(Number(raa) * 1000)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// Unix-sekunder → ISO-dato (YYYY-MM-DD), eller null. Tåler undefined og tull.
function tilDato(unix: unknown): string | null {
  if (!unix) return null
  const d = new Date(Number(unix) * 1000)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') || ''
  const payload = await req.text()

  const gyldig = await verifiserSignatur(payload, sig, WEBHOOK_SECRET).catch(() => false)
  if (!gyldig) return new Response('Ugyldig signatur', { status: 400 })

  let event: any
  try { event = JSON.parse(payload) } catch { return new Response('Ugyldig JSON', { status: 400 }) }

  const oppdater = async (customerId: string, patch: Record<string, unknown>) => {
    await admin.from('company_settings').update(patch).eq('stripe_customer_id', customerId)
  }

  // ── Betaling mottatt ──────────────────────────────────────────────────────
  // Skriver de tre feltene Kontrollpanelet leser. Idempotent: en faktura-ID
  // som allerede ligger i payment_history føres ikke på nytt, uansett hvor
  // mange ganger Stripe leverer hendelsen.
  const registrerBetaling = async (faktura: any) => {
    const customerId = typeof faktura.customer === 'string' ? faktura.customer : faktura.customer?.id
    if (!customerId) return { hoppet: 'ingen kunde' }
    // Engangsfakturaer uten abonnement er ikke månedsbetalinger — hopp over.
    const subId = typeof faktura.subscription === 'string'
      ? faktura.subscription
      : faktura.subscription?.id ?? faktura.parent?.subscription_details?.subscription
    if (!subId) return { hoppet: 'faktura uten abonnement' }

    const { data: firma } = await admin
      .from('company_settings')
      .select('id, payment_history')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (!firma) return { hoppet: 'fant ingen bedrift på kunde-ID' }

    const historikk: any[] = Array.isArray(firma.payment_history) ? firma.payment_history : []
    // Idempotens — dette er hele grunnen til at retries er trygge.
    if (historikk.some((p) => p && p.stripe_invoice_id === faktura.id)) {
      console.log('[webhook] betaling allerede registrert', faktura.id)
      return { hoppet: 'allerede registrert' }
    }

    // Betalingstidspunkt: status_transitions.paid_at er det riktige feltet.
    // effective_at og created er fallback for eldre/avvikende hendelser.
    const betaltDato =
      tilDato(faktura.status_transitions?.paid_at) ||
      tilDato(faktura.effective_at) ||
      tilDato(faktura.created) ||
      new Date().toISOString().split('T')[0]

    // Neste forfall = periodeslutten på abonnementet etter denne betalingen.
    // Vi henter abonnementet friskt, så vi får den nye perioden — ikke den
    // som nettopp løp ut. Faller tilbake på fakturalinjens periode.
    let nestePeriode: string | null = null
    let periodeIso: string | null = null
    try {
      const sub = await stripeGet(`subscriptions/${subId}`)
      periodeIso = periodeSlutt(sub)
      nestePeriode = periodeIso ? periodeIso.split('T')[0] : null
    } catch (e) {
      console.warn('[webhook] kunne ikke hente abonnement for neste forfall:', (e as Error)?.message)
    }
    if (!nestePeriode) nestePeriode = tilDato(faktura.lines?.data?.[0]?.period?.end)

    historikk.push({
      date: betaltDato,
      amount: typeof faktura.amount_paid === 'number' ? faktura.amount_paid / 100 : null,
      currency: (faktura.currency || 'nok').toUpperCase(),
      stripe_invoice_id: faktura.id,
      invoice_number: faktura.number || null,
      // AVGJØRENDE: skiller automatiske betalinger fra manuelt registrerte.
      // «Registrer betaling»-knappen i Kontrollpanelet setter 'manuell',
      // ellers kan de samme pengene føres to ganger.
      source: 'stripe',
      recorded_at: new Date().toISOString(),
    })

    const patch: Record<string, unknown> = {
      last_payment_date: betaltDato,
      next_due_date: nestePeriode,
      payment_history: historikk,
      subscription_status: 'active',
    }
    if (periodeIso) patch.current_period_end = periodeIso

    await admin.from('company_settings').update(patch).eq('id', firma.id)
    console.log('[webhook] betaling registrert', { faktura: faktura.id, betaltDato, nestePeriode })
    return { registrert: true }
  }

  try {
    const obj = event.data?.object || {}
    switch (event.type) {
      case 'checkout.session.completed': {
        if (obj.subscription && obj.customer) {
          const sub = await stripeGet(`subscriptions/${obj.subscription}`)
          await oppdater(obj.customer, {
            subscription_status: statusMap[sub.status] || 'active',
            stripe_subscription_id: sub.id,
            // periodeSlutt() tåler at feltet ligger på linjen i stedet.
            // Her lå den opprinnelige 500-feilen.
            current_period_end: periodeSlutt(sub),
          })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await oppdater(obj.customer, {
          subscription_status: statusMap[obj.status] || 'active',
          stripe_subscription_id: obj.id,
          current_period_end: periodeSlutt(obj),
        })
        break
      }
      case 'customer.subscription.deleted': {
        await oppdater(obj.customer, { subscription_status: 'canceled' })
        break
      }
      // Begge navnene håndteres. invoice.paid er den som normalt sendes;
      // invoice.payment_succeeded kan komme i tillegg på enkelte kontoer.
      // Idempotenssjekken i registrerBetaling gjør at begge kan komme uten
      // at betalingen føres to ganger.
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const res = await registrerBetaling(obj)
        console.log('[webhook] invoice-hendelse', event.type, res)
        break
      }
      case 'invoice.payment_failed': {
        if (obj.customer) await oppdater(obj.customer, { subscription_status: 'past_due' })
        break
      }
    }
  } catch (e) {
    console.error('[webhook] behandlingsfeil', event?.type, (e as Error).message)
    return new Response(`Behandlingsfeil: ${(e as Error).message}`, { status: 500 })
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
