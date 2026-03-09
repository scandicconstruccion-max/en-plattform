import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, LayoutDashboard, List, Users, Clock, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AnbudsmodulOversikt from '@/components/anbudsmodul/AnbudsmodulOversikt';
import AnbudsmodulForesporsler from '@/components/anbudsmodul/AnbudsmodulForesporsler';
import AnbudsmodulLeverandorer from '@/components/anbudsmodul/AnbudsmodulLeverandorer';
import AnbudsmodulHistorikk from '@/components/anbudsmodul/AnbudsmodulHistorikk';
import AnbudsStatistikk from '@/components/anbudsmodul/AnbudsStatistikk';

const tabs = [
  { key: 'oversikt', label: 'Oversikt', icon: LayoutDashboard },
  { key: 'foresporsler', label: 'Forespørsler', icon: List },
  { key: 'leverandorer', label: 'Leverandører', icon: Users },
  { key: 'statistikk', label: 'Statistikk', icon: BarChart2 },
  { key: 'historikk', label: 'Historikk', icon: Clock },
];

export default function Anbudsmodul() {
  const [activeTab, setActiveTab] = useState('oversikt');

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0];

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: moduleAccess = [], isLoading: moduleLoading } = useQuery({
    queryKey: ['companyModuleAccess', company?.id, 'ANBUDSMODUL'],
    queryFn: () => base44.entities.CompanyModuleAccess.filter({ companyId: company.id, moduleCode: 'ANBUDSMODUL' }),
    enabled: !!company?.id,
  });

  // UE_GUEST skal ikke se denne siden (de har egen portal)
  if (user?.role === 'UE_GUEST') {
    return null;
  }

  const isAdmin = user?.role === 'admin';
  const hasAccess = isAdmin || moduleAccess.some(m => m.active);

  if (!moduleLoading && !hasAccess && company) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Anbudsmodul</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Denne modulen er ikke aktivert for din bedrift. Aktiver modulen for å sende forespørsler til leverandører og samle inn tilbud.
          </p>
          <Link to={createPageUrl('MinBedrift')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-base font-semibold">
              Aktiver modul
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">Anbudsmodul</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8">
        {activeTab === 'oversikt' && <AnbudsmodulOversikt onNavigate={setActiveTab} />}
        {activeTab === 'foresporsler' && <AnbudsmodulForesporsler />}
        {activeTab === 'leverandorer' && <AnbudsmodulLeverandorer />}
        {activeTab === 'statistikk' && <AnbudsStatistikk />}
        {activeTab === 'historikk' && <AnbudsmodulHistorikk />}
      </div>
    </div>
  );
}