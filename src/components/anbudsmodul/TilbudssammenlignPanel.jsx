import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, ArrowUpDown, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const invStatusConfig = {
  INVITED:     { label: 'Invitert',   classes: 'bg-blue-100 text-blue-700' },
  OPENED:      { label: 'Åpnet',      classes: 'bg-amber-100 text-amber-700' },
  RESPONDED:   { label: 'Svart',      classes: 'bg-emerald-100 text-emerald-700' },
  DECLINED:    { label: 'Avslått',    classes: 'bg-red-100 text-red-700' },
  NO_RESPONSE: { label: 'Ingen svar', classes: 'bg-red-100 text-red-700' },
};

export default function TilbudssammenlignPanel({ invitations, quotes, projectId }) {
  const [sortBy, setSortBy] = useState('price'); // price | date | status
  const [sortDir, setSortDir] = useState('asc');
  const queryClient = useQueryClient();

  const selectMutation = useMutation({
    mutationFn: async ({ quoteId, supplierId }) => {
      // Clear previous selection
      for (const q of quotes) {
        if (q.id !== quoteId) {
          await base44.entities.AnbudQuote.update(q.id, { isSelected: false });
        }
      }
      await base44.entities.AnbudQuote.update(quoteId, { isSelected: true });
      await base44.entities.AnbudProject.update(projectId, { status: 'CLOSED' });
      await base44.entities.AnbudActivityLog.create({
        anbudProjectId: projectId,
        activityType: 'SELECTED',
        activityText: `Leverandør valgt: ${quotes.find(q => q.id === quoteId)?.supplierName}`,
        createdBy: 'user',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anbudQuotes', projectId] });
      queryClient.invalidateQueries({ queryKey: ['anbudProjects'] });
    },
  });

  // Build rows: one per invitation
  const rows = invitations.map(inv => {
    const quote = quotes.find(q => q.supplierId === inv.supplierId);
    return { inv, quote };
  });

  // Sort
  const sorted = [...rows].sort((a, b) => {
    let va, vb;
    if (sortBy === 'price') {
      va = a.quote?.price ?? Infinity;
      vb = b.quote?.price ?? Infinity;
    } else if (sortBy === 'date') {
      va = a.quote?.submittedAt ? new Date(a.quote.submittedAt).getTime() : Infinity;
      vb = b.quote?.submittedAt ? new Date(b.quote.submittedAt).getTime() : Infinity;
    } else {
      va = a.inv.status;
      vb = b.inv.status;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const minPrice = Math.min(...quotes.filter(q => q.price).map(q => q.price));

  const SortBtn = ({ col, label }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (invitations.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Ingen leverandører invitert ennå</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        Tilbudssammenligning ({quotes.length} mottatt)
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2.5"><SortBtn col="status" label="Leverandør" /></th>
              <th className="text-left px-4 py-2.5"><SortBtn col="price" label="Pris" /></th>
              <th className="text-left px-4 py-2.5 hidden sm:table-cell"><SortBtn col="date" label="Mottatt" /></th>
              <th className="text-left px-4 py-2.5"><SortBtn col="status" label="Status" /></th>
              <th className="text-left px-4 py-2.5">Kommentar</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ inv, quote }) => {
              const isc = invStatusConfig[inv.status] || invStatusConfig.INVITED;
              const isLowest = quote?.price && quote.price === minPrice;
              const isSelected = quote?.isSelected;
              return (
                <tr key={inv.id} className={cn(
                  'border-t border-slate-100 dark:border-slate-800',
                  isSelected ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                )}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">
                        {inv.supplierName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{inv.supplierName}</p>
                        {isSelected && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5"><Trophy className="h-3 w-3" /> Valgt</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {quote?.price ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn('font-semibold text-sm', isLowest ? 'text-emerald-600' : 'text-slate-900 dark:text-white')}>
                          {quote.price.toLocaleString('nb-NO')} {quote.currency || 'NOK'}
                        </span>
                        {isLowest && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium">Lavest</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">
                    {quote?.submittedAt ? format(parseISO(quote.submittedAt), 'd. MMM yyyy', { locale: nb }) : '–'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('border-0 text-xs', isc.classes)}>{isc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-slate-500 truncate">{quote?.notes || '–'}</p>
                    {quote?.fileAttachments?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {quote.fileAttachments.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                            <FileText className="h-3 w-3" />{f.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {quote && !isSelected && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectMutation.mutate({ quoteId: quote.id, supplierId: inv.supplierId })}
                        disabled={selectMutation.isPending}
                        className="rounded-xl text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Velg
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}