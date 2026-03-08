import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Inbox, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, addDays, parseISO } from 'date-fns';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function AnbudsKPI({ projects, invitations, quotes, onSelectProject }) {
  const activeProjects = projects.filter(p => p.status !== 'CLOSED');
  const activeIds = new Set(activeProjects.map(p => p.id));

  const totalInvitations = invitations.filter(i => activeIds.has(i.anbudProjectId)).length;
  const totalQuotes = quotes.filter(q => activeIds.has(q.anbudProjectId)).length;
  const svarprosent = totalInvitations > 0 ? Math.round((totalQuotes / totalInvitations) * 100) : 0;

  const today = new Date();
  const soon = addDays(today, 7);

  // Alerts
  const deadlineSoon = activeProjects.filter(p =>
    p.responseDeadline && !isPast(parseISO(p.responseDeadline)) && new Date(p.responseDeadline) <= soon
  );
  const noQuotes = activeProjects.filter(p =>
    p.status !== 'DRAFT' && quotes.filter(q => q.anbudProjectId === p.id).length === 0
  );
  const lowResponse = activeProjects.filter(p => {
    const inv = invitations.filter(i => i.anbudProjectId === p.id).length;
    const q = quotes.filter(q => q.anbudProjectId === p.id).length;
    return inv > 0 && (q / inv) < 0.3;
  });

  const stats = [
    { label: 'Aktive forespørsler', value: activeProjects.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Inviterte leverandører', value: totalInvitations, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Mottatte tilbud', value: totalQuotes, icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Gj.sn. svarprosent', value: `${svarprosent}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm dark:bg-slate-900 p-5 flex items-center gap-4">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                <Icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {(deadlineSoon.length > 0 || noQuotes.length > 0 || lowResponse.length > 0) && (
        <div className="space-y-2">
          {deadlineSoon.map(p => (
            <AlertRow
              key={`ds-${p.id}`}
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              bg="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              text={<>Frist om <strong>{format(parseISO(p.responseDeadline), 'd. MMM', { locale: nb })}</strong>: {p.title}</>}
              onOpen={() => onSelectProject && onSelectProject(p.projectId || '__none__')}
            />
          ))}
          {noQuotes.map(p => (
            <AlertRow
              key={`nq-${p.id}`}
              icon={<Inbox className="h-4 w-4 text-red-500" />}
              bg="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              text={<>Ingen tilbud mottatt: <strong>{p.title}</strong></>}
              onOpen={() => onSelectProject && onSelectProject(p.projectId || '__none__')}
            />
          ))}
          {lowResponse.map(p => (
            <AlertRow
              key={`lr-${p.id}`}
              icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
              bg="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              text={<>Lav svarprosent (&lt;30%): <strong>{p.title}</strong></>}
              onOpen={() => onSelectProject && onSelectProject(p.projectId || '__none__')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ icon, bg, text, onOpen }) {
  return (
    <div className={cn('flex items-center gap-3 p-3 border rounded-xl', bg)}>
      {icon}
      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{text}</p>
      <Button variant="ghost" size="sm" onClick={onOpen} className="text-xs h-7 px-2 rounded-lg">
        Åpne →
      </Button>
    </div>
  );
}