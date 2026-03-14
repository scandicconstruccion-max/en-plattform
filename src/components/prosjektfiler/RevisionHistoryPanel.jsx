import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function RevisionHistoryPanel({ open, onClose, revisions = [], baseName }) {
  const sorted = [...revisions].sort((a, b) => {
    const vA = a.version || 'Rev00';
    const vB = b.version || 'Rev00';
    return vB.localeCompare(vA, undefined, { numeric: true });
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Revisjonshistorikk</SheetTitle>
          {baseName && <p className="text-sm text-slate-500 mt-1">{baseName}</p>}
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {sorted.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Ingen historikk tilgjengelig</p>
          )}
          {sorted.map((rev) => (
            <div key={rev.id} className={`p-4 rounded-xl border ${rev.active_flag ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {rev.active_flag ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Archive className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">{rev.version || 'Rev01'}</span>
                      {rev.active_flag && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0 h-5 border-0">
                          Gjeldende
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{rev.name}</p>
                    {rev.description && (
                      <p className="text-xs text-slate-600 mt-1 italic">"{rev.description}"</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {rev.uploaded_by_name || rev.uploaded_by}
                      {' · '}
                      {rev.created_date
                        ? format(new Date(rev.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })
                        : ''}
                    </p>
                  </div>
                </div>
                <Button asChild variant="ghost" size="icon" className="flex-shrink-0">
                  <a href={rev.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}