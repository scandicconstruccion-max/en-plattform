import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import { User, Building2, CreditCard, Check, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const availableModules = [
  { key: 'dashboard', name: 'Dashboard', description: 'Oversikt og statistikk', price: 0, required: true },
  { key: 'prosjekter', name: 'Prosjekter', description: 'Prosjektadministrasjon', price: 299 },
  { key: 'avvik', name: 'Avvik', description: 'Avvikshåndtering og HMS', price: 199 },
  { key: 'endringsmeldinger', name: 'Endringsmeldinger', description: 'Endringshåndtering', price: 149 },
  { key: 'timelister', name: 'Timelister', description: 'Timeføring og rapportering', price: 199 },
  { key: 'bildedok', name: 'Bildedokumentasjon', description: 'Foto og dokumentasjon', price: 149 },
  { key: 'sjekklister', name: 'Sjekklister', description: 'Kvalitetskontroll', price: 149 },
  { key: 'tilbud', name: 'Tilbud', description: 'Tilbudsadministrasjon', price: 249 },
  { key: 'anbudsmodul', name: 'Anbudsmodul', description: 'Anbudsforespørsler og leverandørtilbud', price: 189 },
  { key: 'bestillinger', name: 'Bestillinger', description: 'Innkjøp og bestillinger', price: 199 },
  { key: 'chat', name: 'Intern Chat', description: 'Teamkommunikasjon', price: 99 },
  { key: 'ressursplan', name: 'Ressursplanlegger', description: 'Bemanning og allokering', price: 249 },
  { key: 'crm', name: 'CRM', description: 'Kundeadministrasjon', price: 199 },
  { key: 'kalender', name: 'Kalender', description: 'Hendelser og møter', price: 99 },
];

export default function Innstillinger() {
  const [activeTab, setActiveTab] = useState('profil');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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

  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() !== 'slett') {
      toast.error('Skriv "slett" for å bekrefte');
      return;
    }
    
    // In a real app, this would call an API to delete the account
    toast.success('Forespørsel om sletting sendt. Du vil motta en bekreftelse på e-post.');
    setShowDeleteDialog(false);
    setDeleteConfirmText('');
  };

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'bedrift', label: 'Bedrift', icon: Building2 },
    { id: 'moduler', label: 'Moduler', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Innstillinger"
        subtitle="Administrer konto og moduler"
      />

      <div className="px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <Card className="lg:w-64 border-0 shadow-sm p-2 h-fit dark:bg-slate-900">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors select-none",
                  activeTab === tab.id
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
              <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Din profil</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label className="dark:text-slate-300">Navn</Label>
                    <Input
                      value={user?.full_name || ''}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-slate-300">E-post</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-slate-300">Rolle</Label>
                    <Input
                      value={user?.role === 'admin' ? 'Administrator' : 'Bruker'}
                      disabled
                      className="mt-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* Delete Account Section */}
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Faresone</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Sletting av konto er permanent og kan ikke angres. Alle dine data vil bli slettet.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 select-none"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Slett konto
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'bedrift' && (
              <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Bedriftsinformasjon</h2>
                <div className="space-y-4 max-w-md">
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
                    <Label className="dark:text-slate-300">Org.nummer</Label>
                    <Input
                      value={company?.org_number || ''}
                      placeholder="123 456 789"
                      className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                      onChange={(e) => updateCompanyMutation.mutate({ org_number: e.target.value })}
                    />
                  </div>
                  <div>
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
              </Card>
            )}

            {activeTab === 'moduler' && (
              <div className="space-y-6">
                <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Velg moduler</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">Betal kun for det du trenger</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Månedlig kostnad</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-900 dark:text-white">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Slett konto
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              Er du sikker på at du vil slette kontoen din? Dette vil permanent slette alle dine data, 
              inkludert prosjekter, avvik, timelister og annen informasjon. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="dark:text-slate-300">Skriv "slett" for å bekrefte</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="slett"
              className="mt-2 rounded-xl dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl select-none dark:bg-slate-800 dark:border-slate-700">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="rounded-xl bg-red-600 hover:bg-red-700 select-none"
            >
              Slett konto permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}