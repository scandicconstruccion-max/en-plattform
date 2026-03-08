import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, Inbox, TrendingDown, AlertCircle, Send, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { format, parseISO, isPast, addDays, differenceInDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const KRITISK_TYPER = {
  frist_snart:    { label: 'Frist innen 3 dager', color: 'yellow',  icon: Clock,         rowBg: 'bg-amber-50 dark:bg-amber-900/10',  badge: 'bg-amber-100 text-amber-800' },
  ingen_tilbud:   { label: 'Ingen tilbud mottatt', color: 'red',    icon: Inbox,          rowBg: 'bg-red-50 dark:bg-red-900/10',      badge: 'bg-red-100 text-red-700' },
  lav_svar:       { label: 'Lav svarprosent (<30%)', color: 'orange', icon: TrendingDown,  rowBg: 'bg-orange-50 dark:bg-orange-900/10', badge: 'bg-orange-100 text-orange-700' },
  forsinket:      { label: 'Forsinket',           color: 'red',     icon: AlertTriangle,  rowBg: 'bg-red-50 dark:bg-red-900/10',      badge: 'bg-red-100 text-red-700' },
};

export default function KritiskDashboard({ projects, invitations, quotes, systemProjects, onOpenProject }) {
  const [filterProject, setFilterProject] = useState('alle');
  const [filterTrade, setFilterTrade] = useState('alle');
  const [filterType, setFilterType] = useState('alle');
  const [expanded, setExpanded] = useState(true);
  const [resending, setResending] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Build kritiske items
  const kritiskeItems = useMemo(() => {
    const today = new Date();
    const in3days = addDays(today, 3);
    const items = [];

    for (const p of projects) {
      if (p.status === 'CLOSED' || p.status === 'DRAFT') continue;

      const projInvitations = invitations.filter(i => i.anbudProjectId === p.id);
      const projQuotes = quotes.filter(q => q.anbudProjectId === p.id);
      const invCount = projInvitations.length;
      const quoteCount = projQuotes.length;
      const svarprosent = invCount > 0 ? Math.round((quoteCount / invCount) * 100) : 0;
      const sysProject = systemProjects?.find(sp => sp.id === p.projectId);

      const base = {
        projectId: p.id,
        title: p.title,
        trade: p.tradeType || '–',
        projectName: sysProject?.name || 'Uten prosjekt',
        invCount,
        quoteCount,
        svarprosent,
        deadline: p.responseDeadline,
      };

      // Forsinket: deadline passert og status ikke CLOSED
      if (p.responseDeadline && isPast(new Date(p.responseDeadline + 'T23:59:59'))) {
        items.push({ ...base, type: 'forsinket', daysOverdue: differenceInDays(today, parseISO(p.responseDeadline)) });
      }
      // Frist innen 3 dager (ikke allerede forsinket)
      else if (p.responseDeadline && new Date(p.responseDeadline) <= in3days) {
        items.push({ ...base, type: 'frist_snart', daysLeft: differenceInDays(new Date(p.responseDeadline), today) });
      }

      // Ingen tilbud mottatt (sendt, men ingen svar)
      if (invCount > 0 && quoteCount === 0) {
        if (!items.find(i => i.projectId === p.id && i.type === 'ingen_tilbud')) {
          items.push({ ...base, type: 'ingen_tilbud' });
        }
      }

      // Lav svarprosent
      if (invCount > 0 && quoteCount > 0 && svarprosent < 30) {
        items.push({ ...base, type: 'lav_svar' });
      }
    }

    return items;
  }, [projects, invitations, quotes, systemProjects]);

  // Unique filter options
  const tradeOptions = useMemo(() => [...new Set(projects.map(p => p.tradeType).filter(Boolean))], [projects]);
  const projectOptions = useMemo(() => {
    const seen = new Set();
    return projects.filter(p => {
      if (seen.has(p.projectId || p.id)) return false;
      seen.add(p.projectId || p.id);
      return true;
    });
  }, [projects]);

  const filtered = kritiskeItems.filter(item => {
    if (filterProject !== 'alle' && item.projectId !== filterProject) return false;
    if (filterTrade !== 'alle' && item.trade !== filterTrade) return false;
    if (filterType !== 'alle' && item.type !== filterType) return false;
    return true;
  });

  // Summary counts per type
  const counts = useMemo(() => {
    const c = {};
    for (const t of Object.keys(KRITISK_TYPER)) {
      c[t] = kritiskeItems.filter(i => i.type === t).length;
    }
    return c;
  }, [kritiskeItems]);

  const handleResend = async (item, e) => {
    e.stopPropagation();
    setResending(item.projectId);
    try {
      const { base44 } = await import('@/api/base44Client');
      const projInvitations = invitations.filter(i => i.anbudProjectId === item.projectId && i.status !== 'RESPONDED');
      await base44.functions.invoke('anbudSendInvitations', {
        anbudProjectId: item.projectId,
        supplierIds: projInvitations.map(i => i.supplierId),
        resend: true,
        appUrl: window.location.origin,
      });
    } finally {
      setResending(null);
    }
  };

  if (kritiskeItems.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Kritisk dashboard</h3>
            <p className="text-xs text-slate-500">{kritiskeItems.length} forespørsel{kritiskeItems.length !== 1 ? 'er' : ''} krever oppfølging</p>
          </div>
          {/* Summary badges */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {Object.entries(KRITISK_TYPER).map(([key, cfg]) => counts[key] > 0 && (
              <span key={key} className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                {counts[key]} {cfg.label.split(' ').slice(0, 2).join(' ').toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </div>

      {expanded && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 text-xs w-44 rounded-lg border-slate-200">
                <SelectValue placeholder="Alle statustyper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle statustyper</SelectItem>
                {Object.entries(KRITISK_TYPER).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tradeOptions.length > 0 && (
              <Select value={filterTrade} onValueChange={setFilterTrade}>
                <SelectTrigger className="h-7 text-xs w-36 rounded-lg border-slate-200">
                  <SelectValue placeholder="Alle fagområder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle fagområder</SelectItem>
                  {tradeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {filtered.length !== kritiskeItems.length && (
              <button onClick={() => { setFilterType('alle'); setFilterTrade('alle'); setFilterProject('alle'); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline">Nullstill filter</button>
            )}
            <span className="ml-auto text-xs text-slate-400">{filtered.length} vises</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Forespørsel</th>
                  <th className="hidden md:table-cell text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prosjekt</th>
                  <th className="hidden lg:table-cell text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fag</th>
                  <th className="hidden lg:table-cell text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invitert</th>
                  <th className="hidden lg:table-cell text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tilbud</th>
                  <th className="hidden md:table-cell text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Frist</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handling</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">Ingen treff med valgte filtre</td>
                  </tr>
                ) : filtered.map((item, i) => {
                  const cfg = KRITISK_TYPER[item.type];
                  const Icon = cfg.icon;
                  const key = `${item.type}-${item.projectId}-${i}`;
                  return (
                    <tr
                      key={key}
                      className={cn('border-b border-slate-50 dark:border-slate-800 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 relative group', item.type === 'forsinket' || item.type === 'ingen_tilbud' ? 'hover:bg-red-50 dark:hover:bg-red-900/10' : item.type === 'frist_snart' ? 'hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'hover:bg-orange-50 dark:hover:bg-orange-900/10')}
                      onClick={() => onOpenProject && onOpenProject(item.projectId)}
                    >
                      {/* Status */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', {
                            'bg-amber-400': item.type === 'frist_snart',
                            'bg-red-500': item.type === 'ingen_tilbud' || item.type === 'forsinket',
                            'bg-orange-500': item.type === 'lav_svar',
                          })} />
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.badge)}>
                            {item.type === 'frist_snart'
                              ? item.daysLeft === 0 ? 'I dag!' : `${item.daysLeft}d igjen`
                              : item.type === 'forsinket'
                              ? `${item.daysOverdue}d over frist`
                              : cfg.label}
                          </span>
                        </div>
                      </td>
                      {/* Title */}
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-white max-w-[180px]">
                        <span className="truncate block">{item.title}</span>
                      </td>
                      {/* Project */}
                      <td className="hidden md:table-cell px-3 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[140px]">
                        <span className="truncate block">{item.projectName}</span>
                      </td>
                      {/* Trade */}
                      <td className="hidden lg:table-cell px-3 py-3 text-slate-500 dark:text-slate-400 text-xs">{item.trade}</td>
                      {/* Invited */}
                      <td className="hidden lg:table-cell px-3 py-3 text-center">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.invCount}</span>
                      </td>
                      {/* Quotes */}
                      <td className="hidden lg:table-cell px-3 py-3 text-center">
                        <span className={cn('text-xs font-semibold', item.quoteCount === 0 ? 'text-red-500' : 'text-emerald-600')}>
                          {item.quoteCount}
                          {item.invCount > 0 && <span className="text-slate-400 font-normal"> / {item.svarprosent}%</span>}
                        </span>
                      </td>
                      {/* Deadline */}
                      <td className="hidden md:table-cell px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {item.deadline ? format(parseISO(item.deadline), 'd. MMM yyyy', { locale: nb }) : '–'}
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.invCount > 0 && item.type !== 'lav_svar' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs rounded-lg border-slate-200 gap-1"
                              disabled={resending === item.projectId}
                              onClick={(e) => handleResend(item, e)}
                            >
                              <Send className="h-3 w-3" />
                              {resending === item.projectId ? 'Sender...' : 'Påminnelse'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs rounded-lg text-slate-600"
                            onClick={(e) => { e.stopPropagation(); onOpenProject && onOpenProject(item.projectId); }}
                          >
                            Åpne →
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}