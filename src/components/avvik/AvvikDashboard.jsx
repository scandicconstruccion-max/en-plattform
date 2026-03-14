import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { nb } from 'date-fns/locale';

const STATUS_COLORS = {
  opprettet: '#ef4444',
  sendt_kunde: '#3b82f6',
  godkjent_kunde: '#f59e0b',
  utfort: '#10b981',
  fakturert: '#8b5cf6',
};

const STATUS_LABELS = {
  opprettet: 'Ikke startet',
  sendt_kunde: 'Sendt kunde',
  godkjent_kunde: 'Pågående',
  utfort: 'Utført',
  fakturert: 'Fakturert',
};

const CATEGORY_LABELS = {
  sikkerhet: 'Sikkerhet',
  kvalitet: 'Kvalitet',
  miljo: 'Miljø',
  fremdrift: 'Fremdrift',
  prosjektering: 'Prosjektering',
  dokumentasjon: 'Dokumentasjon',
  hms: 'HMS',
  annet: 'Annet',
};

export default function AvvikDashboard({ deviations }) {
  const now = new Date();

  const open = deviations.filter(d => d.status !== 'utfort' && d.status !== 'fakturert');
  const closed = deviations.filter(d => d.status === 'utfort' || d.status === 'fakturert');
  const overdue = deviations.filter(d =>
    d.due_date && isAfter(now, new Date(d.due_date)) && d.status !== 'utfort' && d.status !== 'fakturert'
  );
  const critical = deviations.filter(d => d.severity === 'kritisk' && d.status !== 'utfort');

  // Status distribution for pie
  const statusData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: deviations.filter(d => d.status === key).length,
    color: STATUS_COLORS[key],
  })).filter(d => d.value > 0);

  // Category distribution for bar
  const categoryData = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    name: label,
    count: deviations.filter(d => d.category === key).length,
  })).filter(d => d.count > 0);

  // Assignee distribution
  const assigneeMap = {};
  deviations.filter(d => d.assigned_to && d.status !== 'utfort').forEach(d => {
    assigneeMap[d.assigned_to] = (assigneeMap[d.assigned_to] || 0) + 1;
  });
  const assigneeData = Object.entries(assigneeMap)
    .map(([name, count]) => ({ name: name.split('@')[0], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const KPICard = ({ icon: Icon, label, value, color, sub }) => (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={AlertTriangle} label="Åpne avvik" value={open.length} color="bg-red-500" />
        <KPICard icon={CheckCircle2} label="Lukkede avvik" value={closed.length} color="bg-emerald-500" />
        <KPICard icon={Clock} label="Forsinkede" value={overdue.length} color="bg-orange-500" sub="Forfalt frist" />
        <KPICard icon={TrendingUp} label="Kritiske" value={critical.length} color="bg-purple-500" sub="Aktive kritiske" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
        <Card className="p-5 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Fordeling per status</h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Ingen data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category bar */}
        <Card className="p-5 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Avvik per kategori</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Ingen data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Assignee bar */}
        {assigneeData.length > 0 && (
          <Card className="p-5 border-0 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-slate-800 mb-4">Åpne avvik per ansvarlig</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assigneeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}