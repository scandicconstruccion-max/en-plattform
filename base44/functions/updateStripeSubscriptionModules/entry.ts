import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * Add or remove modules from an existing Stripe subscription (with proration).
 * Payload: { companyId, addModules: [{moduleCode, priceId}], removeModuleCodes: ['CRM'] }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId, addModules = [], removeModuleCodes = [] } = await req.json();

  const subRecords = await base44.asServiceRole.entities.CompanySubscription.filter({ companyId });
  if (subRecords.length === 0) {
    return Response.json({ error: 'Ingen aktiv Stripe-subscription funnet for dette firmaet' }, { status: 404 });
  }

  const subRecord = subRecords[0];
  const stripeSubId = subRecord.stripeSubscriptionId;

  if (!stripeSubId) {
    return Response.json({ error: 'Ingen stripeSubscriptionId på abonnementet' }, { status: 400 });
  }

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
  const existingItems = await base44.asServiceRole.entities.CompanySubscriptionItem.filter({ companySubscriptionId: subRecord.id });

  const stripeUpdates = [];

  // ADD new modules
  for (const { moduleCode, priceId } of addModules) {
    const alreadyExists = existingItems.find(i => i.moduleCode === moduleCode && i.active);
    if (!alreadyExists) {
      stripeUpdates.push({ price: priceId, quantity: 1, metadata: { moduleCode } });
    }
  }

  // REMOVE modules – find their stripe item IDs
  const itemsToDelete = [];
  for (const moduleCode of removeModuleCodes) {
    const item = existingItems.find(i => i.moduleCode === moduleCode);
    if (item?.stripeSubscriptionItemId) {
      itemsToDelete.push({ id: item.stripeSubscriptionItemId, deleted: true });
      // Deactivate in DB immediately
      await base44.asServiceRole.entities.CompanySubscriptionItem.update(item.id, { active: false });
    }
  }

  // Apply changes to Stripe with proration
  if (stripeUpdates.length > 0 || itemsToDelete.length > 0) {
    await stripe.subscriptions.update(stripeSubId, {
      items: [...stripeUpdates, ...itemsToDelete],
      proration_behavior: 'create_prorations'
    });
  }

  // Rebuild module access immediately for removed modules
  if (removeModuleCodes.length > 0) {
    await base44.asServiceRole.functions.invoke('rebuildCompanyModuleAccess', { companyId });
  }

  return Response.json({ success: true, added: addModules.length, removed: removeModuleCodes.length });
});