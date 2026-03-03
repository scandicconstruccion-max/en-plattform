import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * checkModuleAccess – tilgangssjekk per modul per firma
 * 
 * Payload: { companyId: string, moduleCode?: string }
 * 
 * Logikk:
 * 1. Hent firma
 * 2. Sjekk om firma er suspendert
 * 3. Sjekk subscriptionStatus (trial / active / suspended / canceled)
 * 4. For active: sjekk CompanyModuleAccess-tabellen
 */
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const { companyId, moduleCode } = await req.json();

    if (!companyId) {
        return Response.json({ access: false, reason: 'companyId er påkrevd' }, { status: 400 });
    }

    // Hent firma
    const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
    const company = companies[0];

    if (!company) {
        return Response.json({ access: false, reason: 'Firma ikke funnet' }, { status: 404 });
    }

    // 1. Sjekk manuell suspensjon
    if (company.suspended === true) {
        return Response.json({ access: false, reason: 'Abonnement inaktivt (suspendert)' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const status = company.subscriptionStatus || 'trial';

    // 2. Trial-tilgang
    if (status === 'trial') {
        if (!company.trialEndDate || today <= company.trialEndDate) {
            return Response.json({ access: true, reason: 'Trial aktiv', status: 'trial' });
        } else {
            return Response.json({ access: false, reason: 'Trial utløpt', status: 'trial_expired' }, { status: 403 });
        }
    }

    // 3. Aktivt abonnement – sjekk CompanyModuleAccess
    if (status === 'active') {
        if (!moduleCode) {
            return Response.json({ access: true, reason: 'Abonnement aktivt', status: 'active' });
        }

        const accessRecords = await base44.asServiceRole.entities.CompanyModuleAccess.filter({
            companyId,
            moduleCode
        });

        const record = accessRecords[0];
        if (record && record.active === true) {
            return Response.json({ access: true, reason: 'Modul aktiv', status: 'active', moduleCode });
        } else {
            return Response.json({ access: false, reason: 'Modul ikke aktiv i abonnementet', status: 'module_inactive', moduleCode }, { status: 403 });
        }
    }

    // 4. Suspended eller canceled
    return Response.json({ access: false, reason: `Abonnement ikke aktivt (${status})`, status }, { status: 403 });
});