import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function AnbudsStatistikk() {
  const { data: projects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list('-created_date'),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations'],
    queryFn: () => base44.entities.AnbudInvitation.list(),
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes'],
    queryFn: () => base44.entities.AnbudQuote.list(),
  });

  // Kun data knyttet til eksisterende prosjekter
  const projectIds = new Set(projects.map(p => p.id));
  const validInvitations = invitations.filter(i => projectIds.has(i.anbudProjectId));

  // Svarprosent per fagområde
  const tradeStats = {};
  validInvitations.forEach(inv => {
    const project = projects.find(p => p.id === inv.anbudProjectId);
    const trade = project?.tradeType || 'Annet';
    if (!tradeStats[trade]) tradeStats[trade] = { trade, invitert: 0, svart: 0 };
    tradeStats[trade].invitert++;
    if (inv.status === 'RESPONDED') tradeStats[trade].svart++;
  });
  const tradeData = Object.values(tradeStats).map(t => ({
    ...t,
    svarprosent: t.invitert > 0 ? Math.round((t.svart / t.invitert) * 100) : 0,
  }));

  // Forespørsler over tid (siste 6 måneder)
  const monthMap = {};
  projects.forEach(p => {
    if (!p.created_date) return;
    const key = format(startOfMonth(parseISO(p.created_date)), 'MMM yyyy', { locale: nb });
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const timeData = Object.entries(monthMap).map(([month, count]) => ({ month, count })).slice(-6);

  // Svarsstatistikk totalt (kun gyldige invitasjoner)
  const invCounts = {
    INVITED: validInvitations.filter(i => i.status === 'INVITED').length,
    OPENED: validInvitations.filter(i => i.status === 'OPENED').length,
    RESPONDED: validInvitations.filter(i => i.status === 'RESPONDED').length,
    NO_RESPONSE: validInvitations.filter(i => i.status === 'NO_RESPONSE').length,
  };
  const total = validInvitations.length || 1;
  const svarprosent = Math.round((invCounts.RESPONDED / total) * 100);

  return (
    <div className="space-y-6">
      {/* KPI boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invitert', value: invCounts.INVITED, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' },
          { label: 'Åpnet', value: invCounts.OPENED, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' },
          { label: 'Svart', value: invCounts.RESPONDED, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' },
          { label: 'Ingen svar', value: invCounts.NO_RESPONSE, color: 'bg-red-50 dark:bg-red-900/20 text-red-700' },
        ].map((s, i) => (
          <Card key={i} className={`border-0 shadow-sm p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm font-medium opacity-80">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Svarprosent bar */}
      <Card className="border-0 shadow-sm dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total svarprosent</span>
          <span className="text-lg font-bold text-emerald-600">{svarprosent}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
          <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${svarprosent}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">{invCounts.RESPONDED} av {total} leverandører har svart</p>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Svarprosent per fag */}
        <Card className="border-0 shadow-sm dark:bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Svarprosent per fagområde</h3>
          {tradeData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Ingen data ennå</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tradeData} margin={{ left: -20, right: 10 }}>
                <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="svarprosent" fill="#10b981" radius={[4, 4, 0, 0]} name="Svarprosent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Forespørsler over tid */}
        <Card className="border-0 shadow-sm dark:bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Forespørsler over tid</h3>
          {timeData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Ingen data ennå</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Forespørsler" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}