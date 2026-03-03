import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * rebuildCompanyModuleAccess – bygger opp CompanyModuleAccess fra bunnen
 * 
 * Payload: { companyId?: string }  (bruker første firma hvis ikke oppgitt)
 * 
 * Kun admin kan kalle denne funksjonen.
 * 
 * Logikk:
 * - trial    → alle moduler aktive, source = "trial", validTo = trialEndDate
 * - active   → alle moduler aktive, source = "subscription"
 * - suspended/canceled → alle moduler inaktive
 */

// Masterliste over alle modulkoder i systemet
const ALL_MODULE_CODES = [
    { moduleCode: 'GRUNNPAKKE',        name: 'Grunnpakke',             isCore: true,  requiresBasePackage: false, frontendKeys: ['dashboard', 'prosjekter', 'prosjektfiler', 'sjekklister'], sortOrder: 1 },
    { moduleCode: 'AVVIK',             name: 'Avvik',                  isCore: false, requiresBasePackage: true,  frontendKeys: ['avvik'], sortOrder: 2 },
    { moduleCode: 'HMS',               name: 'HMS & Risiko',           isCore: false, requiresBasePackage: true,  frontendKeys: ['hms', 'sja', 'ruh', 'risikoanalyse', 'hmshandbok'], sortOrder: 3 },
    { moduleCode: 'TILBUD',            name: 'Tilbud',                 isCore: false, requiresBasePackage: true,  frontendKeys: ['tilbud'], sortOrder: 4 },
    { moduleCode: 'ORDRE',             name: 'Ordre',                  isCore: false, requiresBasePackage: true,  frontendKeys: ['ordre'], sortOrder: 5 },
    { moduleCode: 'ENDRINGSMELDINGER', name: 'Endringsmeldinger',      isCore: false, requiresBasePackage: true,  frontendKeys: ['endringsmeldinger'], sortOrder: 6 },
    { moduleCode: 'FAKTURA',           name: 'Faktura',                isCore: false, requiresBasePackage: true,  frontendKeys: ['faktura'], sortOrder: 7 },
    { moduleCode: 'ANSATTE',           name: 'Ansatte',                isCore: false, requiresBasePackage: true,  frontendKeys: ['ansatte'], sortOrder: 8 },
    { moduleCode: 'TIMELISTER',        name: 'Timelister',             isCore: false, requiresBasePackage: true,  frontendKeys: ['timelister'], sortOrder: 9 },
    { moduleCode: 'RESSURS',           name: 'Ressursplanlegger',      isCore: false, requiresBasePackage: true,  frontendKeys: ['ressursplan'], sortOrder: 10 },
    { moduleCode: 'KALENDER',          name: 'Kalender',               isCore: false, requiresBasePackage: true,  frontendKeys: ['kalender'], sortOrder: 11 },
    { moduleCode: 'BEFARING',          name: 'Befaring',               isCore: false, requiresBasePackage: true,  frontendKeys: ['befaring'], sortOrder: 12 },
    { moduleCode: 'BILDEDOK',          name: 'Bildedokumentasjon',     isCore: false, requiresBasePackage: true,  frontendKeys: ['bildedok'], sortOrder: 13 },
    { moduleCode: 'FDV',               name: 'FDV',                    isCore: false, requiresBasePackage: true,  frontendKeys: ['fdv'], sortOrder: 14 },
    { moduleCode: 'BESTILLINGER',      name: 'Bestillinger',           isCore: false, requiresBasePackage: true,  frontendKeys: ['bestillinger'], sortOrder: 15 },
    { moduleCode: 'CHAT',              name: 'Intern Chat',            isCore: false, requiresBasePackage: true,  frontendKeys: ['chat'], sortOrder: 16 },
    { moduleCode: 'CRM',               name: 'CRM',                    isCore: false, requiresBasePackage: true,  frontendKeys: ['crm'], sortOrder: 17 },
    { moduleCode: 'ADMIN',             name: 'Admin & Innstillinger',  isCore: true,  requiresBasePackage: false, frontendKeys: ['minbedrift', 'brukeradmin', 'kompetanser'], sortOrder: 18 },
    { moduleCode: 'MOTTAKSKONTROLL',   name: 'Mottakskontroll',        isCore: false, requiresBasePackage: true,  frontendKeys: ['mottakskontroll'], sortOrder: 19 },
];

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: kun admin kan kjøre denne funksjonen' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));

    // Hent firma
    let company;
    if (payload.companyId) {
        const companies = await base44.asServiceRole.entities.Company.filter({ id: payload.companyId });
        company = companies[0];
    } else {
        const companies = await base44.asServiceRole.entities.Company.list();
        company = companies[0];
    }

    if (!company) {
        return Response.json({ error: 'Ingen firma funnet' }, { status: 404 });
    }

    const companyId = company.id;
    const status = company.subscriptionStatus || 'trial';
    const now = new Date().toISOString();

    // Slett alle eksisterende tilgangsoppføringer for dette firmaet
    const existing = await base44.asServiceRole.entities.CompanyModuleAccess.filter({ companyId });
    for (const record of existing) {
        await base44.asServiceRole.entities.CompanyModuleAccess.delete(record.id);
    }

    // Sync ModuleDefinition-tabellen (opprett manglende definisjoner)
    const existingDefs = await base44.asServiceRole.entities.ModuleDefinition.list();
    const existingCodes = existingDefs.map(d => d.moduleCode);
    for (const mod of ALL_MODULE_CODES) {
        if (!existingCodes.includes(mod.moduleCode)) {
            await base44.asServiceRole.entities.ModuleDefinition.create(mod);
        }
    }

    // Bygg nye tilgangsoppføringer basert på subscriptionStatus
    let active = false;
    let source = 'manual';
    let validTo = null;

    if (status === 'trial') {
        active = true;
        source = 'trial';
        validTo = company.trialEndDate ? `${company.trialEndDate}T23:59:59.000Z` : null;
    } else if (status === 'active') {
        active = true;
        source = 'subscription';
        validTo = null;
    } else {
        // suspended eller canceled
        active = false;
        source = 'subscription';
        validTo = null;
    }

    const newRecords = ALL_MODULE_CODES.map(mod => ({
        companyId,
        moduleCode: mod.moduleCode,
        active,
        source,
        validFrom: now,
        ...(validTo ? { validTo } : {})
    }));

    await base44.asServiceRole.entities.CompanyModuleAccess.bulkCreate(newRecords);

    return Response.json({
        success: true,
        companyId,
        companyName: company.name,
        subscriptionStatus: status,
        modulesUpdated: newRecords.length,
        active,
        source,
        ...(validTo ? { validTo } : {}),
        modules: newRecords.map(r => r.moduleCode)
    });
});