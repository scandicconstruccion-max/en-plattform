import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/shared/PageHeader';
import { User, Building2, CreditCard, Bell, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const availableModules = [
  { key: 'dashboard', name: 'Dashboard', description: 'Oversikt og statistikk', price: 0, required: true },
  { key: 'prosjekter', name: 'Prosjekter', description: 'Prosjektadministrasjon', price: 299 },
  { key: 'avvik', name: 'Avvik', description: 'Avvikshåndtering og HMS', price: 199 },
  { key: 'endringsmeldinger', name: 'Endringsmeldinger', description: 'Endringshåndtering', price: 149 },
  { key: 'timelister', name: 'Timelister', description: 'Timeføring og rapportering', price: 199 },
  { key: 'bildedok', name: 'Bildedokumentasjon', description: 'Foto og dokumentasjon', price: 149 },
  { key: 'sjekklister', name: 'Sjekklister', description: 'Kvalitetskontroll', price: 149 },
  { key: 'tilbud', name: 'Tilbud', description: 'Tilbudsadministrasjon', price: 249 },
  { key: 'bestillinger', name: 'Bestillinger', description: 'Innkjøp og bestillinger', price: 199 },
  { key: 'chat', name: 'Intern Chat', description: 'Teamkommunikasjon', price: 99 },
  { key: 'ressursplan', name: 'Ressursplanlegger', description: 'Bemanning og allokering', price: 249 },
  { key: 'crm', name: 'CRM', description: 'Kundeadministrasjon', price: 199 },
  { key: 'kalender', name: 'Kalender', description: 'Hendelser og møter', price: 99 },
];

export default function Innstillinger() {
  const [activeTab, setActiveTab] = useState('profil');
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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
    return availableModules
      .filter(m => activeModules.includes(m.key))
      .reduce((sum, m) => sum + m.price, 0);
  };

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'bedrift', label: 'Bedrift', icon: Building2 },
    { id: 'moduler', label: 'Moduler', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Innstillinger"
        subtitle="Administrer konto og moduler"
      />

      <div className="px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <Card className="lg:w-64 border-0 shadow-sm p-2 h-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </Card>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profil' && (
              <Card className="border-0 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Din profil</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Navn</Label>
                    <Input
                      value={user?.full_name || ''}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>E-post</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Rolle</Label>
                    <Input
                      value={user?.role === 'admin' ? 'Administrator' : 'Bruker'}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'bedrift' && (
              <Card className="border-0 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Bedriftsinformasjon</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Bedriftsnavn</Label>
                    <Input
                      value={company?.name || ''}
                      placeholder="Ditt firma AS"
                      className="mt-1.5 rounded-xl"
                      onChange={(e) => updateCompanyMutation.mutate({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Org.nummer</Label>
                    <Input
                      value={company?.org_number || ''}
                      placeholder="123 456 789"
                      className="mt-1.5 rounded-xl"
                      onChange={(e) => updateCompanyMutation.mutate({ org_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={company?.address || ''}
                      placeholder="Gate 1, 0000 Sted"
                      className="mt-1.5 rounded-xl"
                      onChange={(e) => updateCompanyMutation.mutate({ address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={company?.phone || ''}
                      placeholder="+47 123 45 678"
                      className="mt-1.5 rounded-xl"
                      onChange={(e) => updateCompanyMutation.mutate({ phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>E-post</Label>
                    <Input
                      value={company?.email || ''}
                      placeholder="post@firma.no"
                      className="mt-1.5 rounded-xl"
                      onChange={(e) => updateCompanyMutation.mutate({ email: e.target.value })}
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'moduler' && (
              <div className="space-y-6">
                <Card className="border-0 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Velg moduler</h2>
                      <p className="text-slate-500 mt-1">Betal kun for det du trenger</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Månedlig kostnad</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {calculateMonthlyPrice().toLocaleString('nb-NO')} kr
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableModules.map((module) => {
                      const isActive = activeModules.includes(module.key);
                      return (
                        <div
                          key={module.key}
                          className={cn(
                            "p-4 rounded-xl border-2 cursor-pointer transition-all",
                            isActive 
                              ? "border-emerald-500 bg-emerald-50" 
                              : "border-slate-200 hover:border-slate-300",
                            module.required && "cursor-default"
                          )}
                          onClick={() => toggleModule(module.key)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-slate-900">{module.name}</h3>
                                {module.required && (
                                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                    Inkludert
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-900">
                                {module.price === 0 ? 'Gratis' : `${module.price} kr/mnd`}
                              </span>
                              {isActive && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
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
                      <p className="text-emerald-100 text-sm line-through">1 987 kr/mnd</p>
                      <p className="text-3xl font-bold">1 499 kr/mnd</p>
                      <Button 
                        className="mt-2 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}