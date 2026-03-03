import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Mapping fra frontend-modulnøkler (sidebar) til ModuleDefinition-koder
 */
export const FRONTEND_TO_MODULE_CODE = {
    dashboard:          'GRUNNPAKKE',
    prosjekter:         'GRUNNPAKKE',
    prosjektfiler:      'GRUNNPAKKE',
    sjekklister:        'GRUNNPAKKE',
    avvik:              'AVVIK',
    hms:                'HMS',
    sja:                'HMS',
    ruh:                'HMS',
    risikoanalyse:      'HMS',
    hmshandbok:         'HMS',
    tilbud:             'TILBUD',
    ordre:              'ORDRE',
    endringsmeldinger:  'ENDRINGSMELDINGER',
    faktura:            'FAKTURA',
    ansatte:            'ANSATTE',
    timelister:         'TIMELISTER',
    ressursplan:        'RESSURS',
    kalender:           'KALENDER',
    befaring:           'BEFARING',
    bildedok:           'BILDEDOK',
    fdv:                'FDV',
    bestillinger:       'BESTILLINGER',
    chat:               'CHAT',
    crm:                'CRM',
    minbedrift:         'ADMIN',
    brukeradmin:        'ADMIN',
    kompetanser:        'ADMIN',
    mottakskontroll:    'MOTTAKSKONTROLL',
};

/**
 * Hook: henter CompanyModuleAccess for et firma og eksponerer hasAccess(moduleKey)
 * 
 * Fallback: hvis ingen tilgangsdata finnes ennå, tillates alt (bakoverkompatibilitet).
 */
export function useCompanyModuleAccess(companyId) {
    const { data: moduleAccess = [], isLoading } = useQuery({
        queryKey: ['companyModuleAccess', companyId],
        queryFn: () => base44.entities.CompanyModuleAccess.filter({ companyId }),
        enabled: !!companyId,
        staleTime: 1000 * 60 * 5, // 5 min cache
    });

    /**
     * Sjekker om en frontend-modulnøkkel er tilgjengelig for firmaet.
     * Returnerer true dersom ingen tilgangsdata finnes (fallback).
     */
    function hasAccess(moduleKey) {
        // Ingen data ennå – tillat alt (bakoverkompatibilitet / laster inn)
        if (!companyId || moduleAccess.length === 0) return true;

        const moduleCode = FRONTEND_TO_MODULE_CODE[moduleKey];
        if (!moduleCode) return true; // Ukjent nøkkel – tillat

        const record = moduleAccess.find(a => a.moduleCode === moduleCode);
        if (!record) return false; // Ikke konfigurert

        // Sjekk validTo
        if (record.validTo) {
            const now = new Date();
            const validTo = new Date(record.validTo);
            if (now > validTo) return false;
        }

        return record.active === true;
    }

    return { hasAccess, moduleAccess, isLoading };
}