import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(base44, event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(base44, event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(base44, event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(base44, event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});

async function findCompanyByStripeCustomerId(base44, customerId) {
  const subscriptions = await base44.asServiceRole.entities.CompanySubscription.filter({ stripeCustomerId: customerId });
  if (subscriptions.length === 0) return null;
  const companies = await base44.asServiceRole.entities.Company.filter({ id: subscriptions[0].companyId });
  return companies.length > 0 ? companies[0] : null;
}

async function handleInvoicePaid(base44, invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const subs = await base44.asServiceRole.entities.CompanySubscription.filter({ stripeSubscriptionId: subscriptionId });
  if (subs.length === 0) {
    // First time: create subscription record
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(base44, stripeSub, 'active');
    return;
  }

  const sub = subs[0];
  await base44.asServiceRole.entities.CompanySubscription.update(sub.id, { status: 'active' });

  // Activate all subscription items
  const items = await base44.asServiceRole.entities.CompanySubscriptionItem.filter({ companySubscriptionId: sub.id });
  for (const item of items) {
    await base44.asServiceRole.entities.CompanySubscriptionItem.update(item.id, { active: true });
  }

  // Update Company subscriptionStatus
  await base44.asServiceRole.entities.Company.update(sub.companyId, { subscriptionStatus: 'active' });

  // Rebuild module access
  await base44.asServiceRole.functions.invoke('rebuildCompanyModuleAccess', { companyId: sub.companyId });
}

async function handleInvoicePaymentFailed(base44, invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const subs = await base44.asServiceRole.entities.CompanySubscription.filter({ stripeSubscriptionId: subscriptionId });
  if (subs.length === 0) return;

  const sub = subs[0];
  await base44.asServiceRole.entities.CompanySubscription.update(sub.id, { status: 'suspended' });
  await base44.asServiceRole.entities.Company.update(sub.companyId, { subscriptionStatus: 'suspended', suspended: true });

  await base44.asServiceRole.functions.invoke('rebuildCompanyModuleAccess', { companyId: sub.companyId });
}

async function handleSubscriptionUpdated(base44, stripeSub) {
  await syncSubscription(base44, stripeSub);
}

async function handleSubscriptionDeleted(base44, stripeSub) {
  const subs = await base44.asServiceRole.entities.CompanySubscription.filter({ stripeSubscriptionId: stripeSub.id });
  if (subs.length === 0) return;

  const sub = subs[0];
  await base44.asServiceRole.entities.CompanySubscription.update(sub.id, {
    status: 'canceled',
    canceledAt: new Date().toISOString()
  });
  await base44.asServiceRole.entities.Company.update(sub.companyId, { subscriptionStatus: 'canceled' });

  await base44.asServiceRole.functions.invoke('rebuildCompanyModuleAccess', { companyId: sub.companyId });
}

async function syncSubscription(base44, stripeSub, forceStatus) {
  const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

  // Find company by customerId
  const existingSubs = await base44.asServiceRole.entities.CompanySubscription.filter({ stripeCustomerId: customerId });
  if (existingSubs.length === 0) {
    console.log(`No CompanySubscription found for Stripe customer ${customerId}`);
    return;
  }

  const sub = existingSubs[0];
  const status = forceStatus || mapStripeStatus(stripeSub.status);

  await base44.asServiceRole.entities.CompanySubscription.update(sub.id, {
    status,
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000).toISOString() : null,
    trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000).toISOString() : null,
    trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null
  });

  // Sync subscription items
  const existingItems = await base44.asServiceRole.entities.CompanySubscriptionItem.filter({ companySubscriptionId: sub.id });

  for (const stripeItem of stripeSub.items.data) {
    const moduleCode = stripeItem.price.metadata?.moduleCode || stripeItem.metadata?.moduleCode;
    if (!moduleCode) continue;

    const existing = existingItems.find(i => i.stripeSubscriptionItemId === stripeItem.id);
    const itemData = {
      companySubscriptionId: sub.id,
      companyId: sub.companyId,
      stripeSubscriptionItemId: stripeItem.id,
      stripePriceId: stripeItem.price.id,
      moduleCode,
      quantity: stripeItem.quantity || 1,
      unitPrice: stripeItem.price.unit_amount || 0,
      active: status === 'active'
    };

    if (existing) {
      await base44.asServiceRole.entities.CompanySubscriptionItem.update(existing.id, itemData);
    } else {
      await base44.asServiceRole.entities.CompanySubscriptionItem.create(itemData);
    }
  }

  await base44.asServiceRole.entities.Company.update(sub.companyId, { subscriptionStatus: status });
  await base44.asServiceRole.functions.invoke('rebuildCompanyModuleAccess', { companyId: sub.companyId });
}

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