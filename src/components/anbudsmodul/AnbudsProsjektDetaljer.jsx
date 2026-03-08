import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowLeft, Building2, ChevronRight } from 'lucide-react';
import { format, parseISO, isPast, addDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AnbudsprosjektDetaljer from './AnbudsprosjektDetaljer';

const TRADE_FILTERS = ['Alle', 'Elektro', 'Rør/VVS', 'Betong', 'Tømrer', 'Maler', 'HVAC', 'Graving/Anlegg', 'Annet'];

function getStatusConfig(project) {
  if (project.status === 'CLOSED') return { label: 'Lukket', classes: 'bg-slate-100 text-slate-600' };
  if (project.responseDeadline && isPast(parseISO(project.responseDeadline))) return { label: 'Frist utløpt', classes: 'bg-red-100 text-red-700' };
  if (project.status === 'IN_PROGRESS' || project.status === 'SENT') return { label: 'Pågående', classes: 'bg-amber-100 text-amber-700' };
  if (project.status === 'DRAFT') return { label: 'Utkast', classes: 'bg-slate-100 text-slate-600' };
  return { label: 'Aktiv', classes: 'bg-emerald-100 text-emerald-700' };
}

export default function AnbudsProsjektDetaljer({ projectId, onBack, onCreateRequest }) {
  const [tradeFilter, setTradeFilter] = useState('Alle');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { data: allAnbudProjects = [] } = useQuery({
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

  const requests = allAnbudProjects.filter(p =>
    projectId === '__none__' ? !p.projectId : p.projectId === projectId
  );

  const sysProject = sysProjects.find(p => p.id === projectId);
  const projectName = sysProject?.name || (projectId === '__none__' ? 'Uten prosjekttilknytning' : 'Ukjent prosjekt');

  const filtered = tradeFilter === 'Alle' ? requests : requests.filter(r => r.tradeType === tradeFilter);

  const today = new Date();
  const soon = addDays(today, 7);

  if (selectedRequest) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedRequest(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tilbake til forespørsler
        </button>
        <AnbudsprosjektDetaljer
          project={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Alle prosjekter
        </button>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-slate-900 dark:text-white">{projectName}</span>
        </div>
      </div>

      {/* Trade filter + action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {TRADE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTradeFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tradeFilter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button onClick={onCreateRequest} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2" size="sm">
          + Ny forespørsel
        </Button>
      </div>

      {/* Requests table */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            {requests.length === 0 ? 'Ingen forespørsler i dette prosjektet ennå.' : 'Ingen forespørsler for valgt fagområde.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Tittel', 'Fagområde', 'Inviterte', 'Tilbud', 'Svarfrist', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const reqInv = invitations.filter(i => i.anbudProjectId === req.id);
                  const reqQ = quotes.filter(q => q.anbudProjectId === req.id);
                  const sc = getStatusConfig(req);
                  const isDeadlinePast = req.responseDeadline && isPast(parseISO(req.responseDeadline)) && req.status !== 'CLOSED';
                  const deadlineSoon = req.responseDeadline && !isDeadlinePast && new Date(req.responseDeadline) <= soon;
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">{req.title}</span>
                          {isDeadlinePast && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          {deadlineSoon && !isDeadlinePast && <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{req.tradeType || '–'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{reqInv.length}</td>
                      <td className="px-6 py-4">
                        <span className={cn('font-medium', reqQ.length > 0 ? 'text-emerald-600' : 'text-slate-400')}>{reqQ.length}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-sm', isDeadlinePast ? 'text-red-500 font-semibold' : deadlineSoon ? 'text-amber-600 font-semibold' : 'text-slate-600 dark:text-slate-400')}>
                          {req.responseDeadline ? format(parseISO(req.responseDeadline), 'd. MMM yyyy', { locale: nb }) : '–'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn('border-0', sc.classes)}>{sc.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-400 ml-auto" />
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