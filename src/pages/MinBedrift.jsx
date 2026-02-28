import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import { Building2, CreditCard, Check, MapPin, Phone, Mail, FileText, Globe, User, Users2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const grunnpakkeModules = ['dashboard', 'prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms'];
const grunnpakkePrice = 109;

const availableModules = [
  { key: 'tilbud', name: 'Tilbudsmodul', description: 'Tilbudsadministrasjon', price: 29 },
  { key: 'timelister', name: 'Timelister', description: 'Timeføring og rapportering', price: 39 },
  { key: 'ressursplan', name: 'Ressursplanlegger', description: 'Bemanning og allokering', price: 89 },
  { key: 'kalender', name: 'Kalender', description: 'Hendelser og møter', price: 12 },
  { key: 'chat', name: 'Intern Chat', description: 'Teamkommunikasjon', price: 89 },
  { key: 'befaring', name: 'Befaring', description: 'Befaringer og oppfølging', price: 49 },
  { key: 'bildedok', name: 'Bildedokumentasjon', description: 'Foto og dokumentasjon', price: 79 },
  { key: 'fdv', name: 'FDV', description: 'Forvaltning, drift og vedlikehold', price: 109 },
  { key: 'crm', name: 'CRM', description: 'Kundeadministrasjon', price: 149 },
];

export default function MinBedrift() {
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0];
  const activeModules = company?.active_modules || availableModules.map(m => m.key);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data) => {
      if (company) {
        return base44.entities.Company.update(company.id, data);
      } else {
        return base44.entities.Company.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const toggleModule = (moduleKey) => {
    const module = availableModules.find(m => m.key === moduleKey);
    if (module?.required) return;

    const newModules = activeModules.includes(moduleKey)
      ? activeModules.filter(m => m !== moduleKey)
      : [...activeModules, moduleKey];

    updateCompanyMutation.mutate({ active_modules: newModules });
  };

  const calculateMonthlyPrice = () => {
    const addons = availableModules
      .filter(m => activeModules.includes(m.key))
      .reduce((sum, m) => sum + m.price, 0);
    return grunnpakkePrice + addons;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Min bedrift"
        subtitle="Administrer bedriftsinformasjon og moduler"
      />

      <div className="px-6 lg:px-8 py-6">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
              <Building2 className="h-4 w-4 mr-2" />
              Bedriftsinformasjon
            </TabsTrigger>
            <TabsTrigger value="modules" className="rounded-lg data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
              <CreditCard className="h-4 w-4 mr-2" />
              Moduler og priser
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0">
            <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Bedriftsinformasjon</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div>
                  <Label className="dark:text-slate-300">Bedriftsnavn</Label>
                  <Input
                    value={company?.name || ''}
                    placeholder="Ditt firma AS"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="dark:text-slate-300">Organisasjonsnummer</Label>
                  <Input
                    value={company?.org_number || ''}
                    placeholder="123 456 789"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ org_number: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="dark:text-slate-300">Adresse</Label>
                  <Input
                    value={company?.address || ''}
                    placeholder="Gate 1, 0000 Sted"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ address: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="dark:text-slate-300">Telefon</Label>
                  <Input
                    value={company?.phone || ''}
                    placeholder="+47 123 45 678"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="dark:text-slate-300">E-post</Label>
                  <Input
                    value={company?.email || ''}
                    placeholder="post@firma.no"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ email: e.target.value })}
                  />
                </div>
              </div>

              {/* Kontaktpersoner */}
              <div className="mt-8 pt-8 border-t dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Nøkkelpersoner
                </h3>
                
                {/* Daglig leder */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Daglig leder
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.ceo_name || ''}
                        placeholder="Ola Nordmann"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.ceo_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.ceo_email || ''}
                        placeholder="daglig.leder@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Styreformann */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Styreformann
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.chairman_name || ''}
                        placeholder="Kari Hansen"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.chairman_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.chairman_email || ''}
                        placeholder="styreformann@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Økonomiansvarlig */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Økonomiansvarlig
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.finance_contact_name || ''}
                        placeholder="Per Jensen"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.finance_contact_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.finance_contact_email || ''}
                        placeholder="okonomi@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {company?.name && (
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-4">Sammendrag</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {company.name && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Building2 className="h-4 w-4" />
                        {company.name}
                      </div>
                    )}
                    {company.org_number && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <FileText className="h-4 w-4" />
                        Org.nr: {company.org_number}
                      </div>
                    )}
                    {company.address && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4" />
                        {company.address}
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="h-4 w-4" />
                        {company.phone}
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4" />
                        {company.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="mt-0 space-y-6">
            <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aktive moduler</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Velg moduler for din bedrift</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Månedlig kostnad</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {calculateMonthlyPrice().toLocaleString('nb-NO')} kr
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableModules.map((module) => {
                  const isActive = activeModules.includes(module.key);
                  return (
                    <div
                      key={module.key}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all select-none",
                        isActive 
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                        module.required && "cursor-default"
                      )}
                      onClick={() => toggleModule(module.key)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900 dark:text-white">{module.name}</h3>
                            {module.required && (
                              <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                Inkludert
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">
                            {module.price === 0 ? 'Gratis' : `${module.price} kr/mnd`}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-0 shadow-sm p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Alle moduler</h3>
                  <p className="text-emerald-100 mt-1">Få tilgang til hele systemet med rabatt</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100 text-sm line-through">2 186 kr/mnd</p>
                  <p className="text-3xl font-bold">1 499 kr/mnd</p>
                  <Button 
                    className="mt-2 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl select-none"
                    onClick={() => {
                      const allModuleKeys = availableModules.map(m => m.key);
                      updateCompanyMutation.mutate({ active_modules: allModuleKeys });
                    }}
                  >
                    Velg alle
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}