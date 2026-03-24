import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * Creates or updates a Stripe subscription for a company.
 * Payload: { companyId, moduleCodes: ['GRUNNPAKKE', 'CRM', ...], priceIds: { GRUNNPAKKE: 'price_xxx', CRM: 'price_yyy' } }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId, moduleCodes, priceIds, customerEmail, customerName } = await req.json();

  if (!companyId || !moduleCodes || !priceIds) {
    return Response.json({ error: 'companyId, moduleCodes og priceIds er påkrevd' }, { status: 400 });
  }

  // Get or create company subscription record
  let subRecords = await base44.asServiceRole.entities.CompanySubscription.filter({ companyId });
  let subRecord = subRecords[0] || null;

  let stripeCustomerId = subRecord?.stripeCustomerId;

  // Create Stripe customer if not exists
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: customerEmail || '',
      name: customerName || companyId,
      metadata: { companyId }
    });
    stripeCustomerId = customer.id;
  }

  // Build subscription items
  const items = moduleCodes.map(code => ({
    price: priceIds[code],
    quantity: 1,
    metadata: { moduleCode: code }
  }));

  // Create Stripe subscription with proration
  const stripeSub = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items,
    proration_behavior: 'create_prorations',
    metadata: { companyId },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });

  // Upsert CompanySubscription in DB
  const subData = {
    companyId,
    stripeCustomerId,
    stripeSubscriptionId: stripeSub.id,
    status: mapStripeStatus(stripeSub.status),
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: false
  };

  if (subRecord) {
    await base44.asServiceRole.entities.CompanySubscription.update(subRecord.id, subData);
  } else {
    subRecord = await base44.asServiceRole.entities.CompanySubscription.create(subData);
  }

  // Create CompanySubscriptionItems
  for (const stripeItem of stripeSub.items.data) {
    const moduleCode = stripeItem.metadata?.moduleCode || moduleCodes.find(c => priceIds[c] === stripeItem.price.id);
    if (!moduleCode) continue;
    await base44.asServiceRole.entities.CompanySubscriptionItem.create({
      companySubscriptionId: subRecord.id,
      companyId,
      stripeSubscriptionItemId: stripeItem.id,
      stripePriceId: stripeItem.price.id,
      moduleCode,
      quantity: stripeItem.quantity || 1,
      unitPrice: stripeItem.price.unit_amount || 0,
      active: false // will be activated on invoice.paid
    });
  }

  return Response.json({
    success: true,
    stripeSubscriptionId: stripeSub.id,
    clientSecret: stripeSub.latest_invoice?.payment_intent?.client_secret || null,
    status: stripeSub.status
  });
});

function mapStripeStatus(stripeStatus) {
  const map = {
    'active': 'active',
    'trialing': 'trial',
    'past_due': 'suspended',
    'unpaid': 'suspended',
    'canceled': 'canceled',
    'incomplete': 'suspended',
    'incomplete_expired': 'canceled',
    'paused': 'suspended'
  };
  return map[stripeStatus] || 'suspended';
}