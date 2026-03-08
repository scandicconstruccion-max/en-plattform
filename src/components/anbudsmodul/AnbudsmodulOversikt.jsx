import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, Inbox, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  DRAFT:       { label: 'Utkast',   classes: 'bg-slate-100 text-slate-600' },
  SENT:        { label: 'Sendt',    classes: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Pågående', classes: 'bg-amber-100 text-amber-700' },
  CLOSED:      { label: 'Lukket',   classes: 'bg-emerald-100 text-emerald-700' },
};

export default function AnbudsmodulOversikt({ onNavigate }) {
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

  const activeProjects = projects.filter(p => p.status !== 'CLOSED');
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const needsFollowUp = invitations.filter(i =>
    activeProjectIds.has(i.anbudProjectId) && (i.status === 'INVITED' || i.status === 'OPENED')
  ).length;

  const stats = [
    { label: 'Aktive forespørsler', value: activeProjects.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Inviterte leverandører', value: invitations.filter(i => activeProjectIds.has(i.anbudProjectId)).length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Mottatte tilbud', value: quotes.length, icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm dark:bg-slate-900 p-6 flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                <Icon className={cn('h-6 w-6', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Follow-up alert */}
      {needsFollowUp > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            <strong>{needsFollowUp} leverandør{needsFollowUp > 1 ? 'er' : ''}</strong> har ikke svart ennå og trenger oppfølging.
          </p>
          <Button variant="outline" size="sm" onClick={() => onNavigate('foresporsler')} className="rounded-xl border-amber-300 text-amber-700">
            Se forespørsler
          </Button>
        </div>
      )}

      {/* Recent projects */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Siste forespørsler</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('foresporsler')} className="text-emerald-600 gap-1">
            Se alle <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">Ingen forespørsler ennå</p>
            <Button onClick={() => onNavigate('foresporsler')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Opprett forespørsel
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Tittel', 'Fag', 'Svarfrist', 'Inviterte', 'Tilbud', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map(project => {
                  const projInvitations = invitations.filter(i => i.anbudProjectId === project.id);
                  const projQuotes = quotes.filter(q => q.anbudProjectId === project.id);
                  const sc = statusConfig[project.status] || statusConfig.DRAFT;
                  const isDeadlinePast = project.responseDeadline && isPast(parseISO(project.responseDeadline)) && project.status !== 'CLOSED';
                  return (
                    <tr
                      key={project.id}
                      onClick={() => onNavigate('foresporsler')}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">{project.title}</span>
                          {isDeadlinePast && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{project.tradeType || '–'}</td>
                      <td className="px-6 py-4">
                        <span className={cn('text-sm', isDeadlinePast ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400')}>
                          {project.responseDeadline ? format(parseISO(project.responseDeadline), 'd. MMM yyyy', { locale: nb }) : '–'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{projInvitations.length}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{projQuotes.length}</td>
                      <td className="px-6 py-4">
                        <Badge className={cn('border-0', sc.classes)}>{sc.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}