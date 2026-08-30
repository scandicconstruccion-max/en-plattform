// ============================================================================
//  Edge Function: stripe-sync-amount
//  Regner ut bedriftens månedsbeløp på nytt (moduler + seter/brukere) og
//  oppdaterer det aktive Stripe-abonnementet. Kalles automatisk fra appen når
//  kunden endrer moduler eller tildeler/fjerner brukere.
//
//  PRORATION: Endringer beregnes FORHOLDSMESSIG (proration_behavior:
//  'create_prorations'). Bestiller kunden en modul den 17. i en periode som
//  løper til den 31., betaler hun for de 15 gjenstående dagene og deretter
//  full måned. Beløpet trekkes IKKE umiddelbart — Stripe legger to linjer på
//  neste ordinære faktura (kreditt for ubrukt del av gammelt beløp,
//  belastning for gjenstående del av nytt). Ett fakturabilde i måneden.
//  Samme regel gjelder BEGGE veier: fjerner kunden en modul, får hun kreditt
//  for de ubrukte dagene, trukket fra neste faktura.
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
async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Stripe-feil (${res.status})`)
  return data
}

// ── Varsling ved feil ───────────────────────────────────────────────────────
// Appen kaller denne funksjonen med .catch(()=>{}) — den er bevisst
// ikke-blokkerende. Uten varsling her går en feilet beløpssynk i stillhet,
// og det er penger. Vi skriver derfor til bedriftens timeline OG lager et
// varsel til plattformeier.
async function meldFeil(companyId: string | null, tekst: string, detalj: string) {
  console.error('[sync] FEIL:', tekst, detalj)
  // 1) Timeline på bedriften — samme felt Kontrollpanelet allerede leser
  if (companyId) {
    try {
      const { data: rad } = await admin
        .from('company_settings').select('timeline').eq('id', companyId).single()
      const timeline = Array.isArray(rad?.timeline) ? rad.timeline : []
      timeline.push({
        type: 'feil',
        label: `Stripe-synk feilet: ${tekst}`,
        detalj,
        timestamp: new Date().toISOString(),
      })
      await admin.from('company_settings').update({ timeline }).eq('id', companyId)
    } catch (e) {
      console.error('[sync] kunne ikke skrive timeline:', (e as Error)?.message)
    }
  }
  // 2) Varsel til plattformeier — ellers er det ingen vei til å oppdage det
  try {
    const { data: eiere } = await admin
      .from('user_profiles').select('id').eq('role', 'platform_owner')
    for (const eier of eiere || []) {
      await admin.from('notifications').insert({
        user_id: eier.id,
        title: 'Stripe-synk feilet',
        message: `${tekst}${detalj ? ' — ' + detalj : ''}`,
      })
    }
  } catch (e) {
    console.error('[sync] kunne ikke varsle eier:', (e as Error)?.message)
  }
}

// Skriver om Stripes engelske proration-linjer til norsk.
// Stripe lager to «invoice items» ved et beløpsbytte:
//   «Unused time on … after 17 Aug 2026»    (kreditt, negativt beløp)
//   «Remaining time on … after 17 Aug 2026» (belastning, positivt beløp)
// Kunden skal ikke måtte tyde det. Vi henter de ventende linjene og setter
// norsk tekst. Feiler dette, står Stripes egen tekst — fakturaen blir stygg,
// men beløpet er riktig, så vi lar det ikke velte synken.
async function norskProrationTekst(customerId: string) {
  try {
    const liste = await stripeGet(`invoiceitems?customer=${customerId}&pending=true&limit=10`)
    const idag = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })
    for (const item of liste?.data || []) {
      const beskrivelse = String(item?.description || '')
      let ny: string | null = null
      if (/^Unused time/i.test(beskrivelse)) ny = `Kreditt for ubrukt abonnement f.o.m. ${idag}`
      else if (/^Remaining time/i.test(beskrivelse)) ny = `Endret abonnement f.o.m. ${idag}`
      if (ny) await stripe(`invoiceitems/${item.id}`, { description: ny })
    }
  } catch (e) {
    console.warn('[sync] kunne ikke sette norsk fakturatekst:', (e as Error)?.message)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let companyId: string | null = null
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt)
    if (uErr || !user) return json({ error: 'Ikke innlogget' }, 401)

    const { data: profile } = await admin
      .from('user_profiles').select('company_id, role').eq('id', user.id).single()
    if (!profile?.company_id) return json({ error: 'Ingen bedrift funnet' }, 400)
    if (!['admin', 'leder', 'platform_owner'].includes(profile.role || ''))
      return json({ error: 'Kun administrator' }, 403)
    companyId = profile.company_id

    const { data: company } = await admin
      .from('company_settings')
      .select('stripe_subscription_id, stripe_product_id, active_modules, num_users')
      .eq('id', profile.company_id).single()
    if (!company) return json({ error: 'Fant ikke bedriftsinnstillinger' }, 400)
    // Ingenting å synke hvis bedriften ikke har et aktivt betalt abonnement ennå
    if (!company.stripe_subscription_id) return json({ ok: true, skipped: 'ingen aktivt abonnement' })

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

    const sub = await stripeGet(`subscriptions/${company.stripe_subscription_id}`)
    const item = sub.items?.data?.[0]
    if (!item) {
      await meldFeil(companyId, 'Fant ingen abonnementslinje', `sub ${company.stripe_subscription_id}`)
      return json({ error: 'Fant ingen abonnementslinje' }, 400)
    }

    // ── Ingen moduler igjen ───────────────────────────────────────────────
    // Tidligere returnerte denne «ok: true» og gjorde ingenting. Kunden ble
    // da trukket videre for moduler hun hadde fjernet — den eneste feilen
    // her som koster HENNE penger. Vi kansellerer ikke umiddelbart: hun har
    // betalt ut perioden og skal beholde tilgangen. cancel_at_period_end
    // lar abonnementet løpe ut, og varselet gir Wissam sjansen til å ringe.
    if (totalKr <= 0) {
      if (sub.cancel_at_period_end) {
        return json({ ok: true, skipped: 'allerede satt til opphør ved periodeslutt' })
      }
      await stripe(`subscriptions/${company.stripe_subscription_id}`, { cancel_at_period_end: 'true' })
      await meldFeil(
        companyId,
        'Alle moduler fjernet — abonnementet avsluttes ved periodeslutt',
        `sub ${company.stripe_subscription_id}. Kunden beholder tilgang ut perioden. Ta kontakt hvis dette ikke var meningen.`,
      )
      console.log('[sync] cancel_at_period_end satt', { companyId })
      return json({ ok: true, cancelAtPeriodEnd: true })
    }

    const totalOre = Math.round(totalKr * 100)

    // Hopp over hvis beløpet allerede er riktig (unngå unødvendige Stripe-kall)
    if (item.price?.unit_amount === totalOre) {
      console.log('[sync] uendret', { total: totalKr, øre: totalOre })
      return json({ ok: true, uendret: true, total: totalKr })
    }

    // ── Produkt: GJENBRUK, ikke opprett på nytt ───────────────────────────
    // Tidligere ble det opprettet et nytt Stripe-produkt ved HVER
    // beløpsendring. Ti modulendringer = ti produkter med samme navn.
    // Med proration på blir rotet synlig: proration-linjene navngir
    // produktet. Vi gjenbruker derfor produktet som allerede henger på
    // abonnementslinjen, og oppretter kun hvis det ikke finnes.
    const eksisterendeProdukt =
      typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id
    let produktId: string = eksisterendeProdukt || company.stripe_product_id || ''
    if (!produktId) {
      const produkt = await stripe('products', { name: 'En Plattform – månedsabonnement' })
      produktId = produkt.id
      // Lagre for neste gang, så vi ikke er avhengige av å lese den fra Stripe.
      // Feiler skrivingen, henter vi den fra abonnementslinjen neste gang.
      try {
        await admin.from('company_settings')
          .update({ stripe_product_id: produktId }).eq('id', companyId)
      } catch (e) {
        console.warn('[sync] kunne ikke lagre stripe_product_id:', (e as Error)?.message)
      }
    }

    console.log('[sync] oppdaterer', { fra: item.price?.unit_amount, til: totalOre, itemId: item.id, produktId })
    await stripe(`subscriptions/${company.stripe_subscription_id}`, {
      'items[0][id]': item.id,
      'items[0][price_data][currency]': 'nok',
      'items[0][price_data][product]': produktId,
      'items[0][price_data][unit_amount]': totalOre,
      'items[0][price_data][recurring][interval]': 'month',
      'items[0][price_data][tax_behavior]': 'exclusive',
      // Forholdsmessig beregning, begge veier. Legges på neste faktura.
      'proration_behavior': 'create_prorations',
    })

    // Gjør de to proration-linjene lesbare på norsk før fakturaen lages.
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (customerId) await norskProrationTekst(customerId)

    console.log('[sync] OK — nytt beløp', totalKr, 'kr')
    return json({ ok: true, oppdatert: true, total: totalKr, proration: true })
  } catch (e) {
    const melding = String((e as Error)?.message || e)
    await meldFeil(companyId, 'Kunne ikke oppdatere Stripe-abonnementet', melding)
    return json({ error: melding }, 500)
  }
})
