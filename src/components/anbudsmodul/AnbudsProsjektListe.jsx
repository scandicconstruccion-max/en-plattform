import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, Inbox, Plus, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnbudsProsjektListe({ onSelectProject, onCreateRequest }) {
  const { data: anbudProjects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list('-created_date'),
  });
  const { data: sysProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations'],
    queryFn: () => base44.entities.AnbudInvitation.list(),
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes'],
    queryFn: () => base44.entities.AnbudQuote.list(),
  });

  // Group anbudProjects by projectId (system project)
  // Also handle forespørsler without a projectId as "Ingen prosjekt"
  const projectGroups = {};

  for (const ap of anbudProjects) {
    const key = ap.projectId || '__none__';
    if (!projectGroups[key]) {
      projectGroups[key] = { requests: [], projectId: key };
    }
    projectGroups[key].requests.push(ap);
  }

  const sysProjectMap = {};
  for (const sp of sysProjects) {
    sysProjectMap[sp.id] = sp;
  }

  const groups = Object.values(projectGroups).map(g => {
    const sysProject = g.projectId !== '__none__' ? sysProjectMap[g.projectId] : null;
    const allInv = invitations.filter(i => g.requests.some(r => r.id === i.anbudProjectId));
    const allQ = quotes.filter(q => g.requests.some(r => r.id === q.anbudProjectId));
    const hasActive = g.requests.some(r => r.status !== 'CLOSED');
    return {
      projectId: g.projectId,
      name: sysProject?.name || (g.projectId === '__none__' ? 'Uten prosjekttilknytning' : 'Ukjent prosjekt'),
      requestCount: g.requests.length,
      invitationCount: allInv.length,
      quoteCount: allQ.length,
      hasActive,
    };
  });

  // Sort: active first
  groups.sort((a, b) => (b.hasActive ? 1 : 0) - (a.hasActive ? 1 : 0));

  if (anbudProjects.length === 0) {
    return (
      <Card className="border-0 shadow-sm dark:bg-slate-900 p-12 text-center">
        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400 mb-4">Ingen forespørsler ennå</p>
        <Button onClick={onCreateRequest} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Opprett første forespørsel
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm dark:bg-slate-900">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-white">Prosjekter</h2>
        <Button onClick={onCreateRequest} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2" size="sm">
          <Plus className="h-4 w-4" /> Ny forespørsel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {['Prosjekt', 'Forespørsler', 'Inviterte', 'Tilbud mottatt', 'Status', ''].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr
                key={g.projectId}
                onClick={() => onSelectProject(g.projectId)}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{g.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{g.requestCount}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {g.invitationCount}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Inbox className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">{g.quoteCount}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={cn('border-0', g.hasActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {g.hasActive ? 'Aktiv' : 'Lukket'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <ChevronRight className="h-4 w-4 text-slate-400 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}