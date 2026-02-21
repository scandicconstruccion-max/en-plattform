import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { 
  ShieldAlert, ClipboardCheck, AlertCircle, FileCheck, BookOpen, 
  AlertTriangle, Calendar, TrendingUp, CheckCircle2 
} from 'lucide-react';

export default function HMS() {
  const navigate = useNavigate();

  // Fetch data for HMS dashboard
  const { data: sjaList = [] } = useQuery({
    queryKey: ['sja'],
    queryFn: () => base44.entities.SJA.list()
  });

  const { data: ruhList = [] } = useQuery({
    queryKey: ['ruh'],
    queryFn: () => base44.entities.RUH.list()
  });

  const { data: risikoList = [] } = useQuery({
    queryKey: ['risikoanalyse'],
    queryFn: () => base44.entities.Risikoanalyse.list()
  });

  // Calculate statistics
  const openRUH = ruhList.filter(r => r.status !== 'lukket').length;
  const activeRisks = risikoList.filter(r => r.status === 'aktiv').length;
  const pendingSJA = sjaList.filter(s => s.status === 'opprettet').length;
  const highRisks = risikoList.filter(r => r.risikonivå >= 6).length;

  const modules = [
    {
      key: 'sja',
      title: 'SJA - Sikker Jobb Analyse',
      description: 'Opprett og administrer sikre jobb analyser',
      icon: ClipboardCheck,
      page: 'SJA',
      color: 'bg-blue-500',
      stats: `${sjaList.length} SJA registrert`,
      alert: pendingSJA > 0 ? `${pendingSJA} venter godkjenning` : null
    },
    {
      key: 'ruh',
      title: 'RUH - Uønskede hendelser',
      description: 'Rapporter og følg opp uønskede hendelser',
      icon: AlertCircle,
      page: 'RUH',
      color: 'bg-red-500',
      stats: `${ruhList.length} hendelser registrert`,
      alert: openRUH > 0 ? `${openRUH} åpne` : null
    },
    {
      key: 'risikoanalyse',
      title: 'Risikoanalyse',
      description: 'Risikoregister og vurderinger',
      icon: FileCheck,
      page: 'Risikoanalyse',
      color: 'bg-amber-500',
      stats: `${risikoList.length} risikoer registrert`,
      alert: activeRisks > 0 ? `${activeRisks} aktive risikoer` : null
    },
    {
      key: 'hmshandbok',
      title: 'HMS-håndbok',
      description: 'Bedriftens HMS-håndbok og rutiner',
      icon: BookOpen,
      page: 'HMSHandbok',
      color: 'bg-emerald-500',
      stats: 'Dokumentasjon og rutiner'
    }
  ];

  const stats = [
    {
      label: 'Åpne RUH',
      value: openRUH,
      icon: AlertCircle,
      color: openRUH > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: openRUH > 0 ? 'bg-red-50' : 'bg-green-50'
    },
    {
      label: 'Aktive risikoer',
      value: activeRisks,
      icon: AlertTriangle,
      color: activeRisks > 0 ? 'text-amber-600' : 'text-green-600',
      bgColor: activeRisks > 0 ? 'bg-amber-50' : 'bg-green-50'
    },
    {
      label: 'SJA venter godkjenning',
      value: pendingSJA,
      icon: Calendar,
      color: pendingSJA > 0 ? 'text-blue-600' : 'text-green-600',
      bgColor: pendingSJA > 0 ? 'bg-blue-50' : 'bg-green-50'
    },
    {
      label: 'Høyrisiko-områder',
      value: highRisks,
      icon: TrendingUp,
      color: highRisks > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: highRisks > 0 ? 'bg-red-50' : 'bg-green-50'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="HMS & Risiko"
        subtitle="Helse, miljø og sikkerhet"
        icon={ShieldAlert}
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">{stat.label}</p>
                      <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.key}
                className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(createPageUrl(module.page))}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-4 ${module.color} rounded-xl`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                      <p className="text-sm text-slate-600">{module.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{module.stats}</p>
                    {module.alert && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {module.alert}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Info */}
        <Card className="mt-8 border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Systematisk HMS-arbeid
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Hold oversikt over sikkerhet, risikoer og hendelser på alle prosjekter. 
                  Dokumenter systematisk HMS-arbeid i henhold til gjeldende krav.
                </p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>✓ Digital SJA før oppstart av arbeidsoperasjoner</li>
                  <li>✓ Rapporter og følg opp uønskede hendelser</li>
                  <li>✓ Identifiser og håndter risikoer systematisk</li>
                  <li>✓ Tilgjengelig HMS-håndbok for alle ansatte</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}