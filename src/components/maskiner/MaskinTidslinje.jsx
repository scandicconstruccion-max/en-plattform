import React from 'react';
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarRange, Pencil, Trash2, Users, Briefcase, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MaskinTidslinje({ reservasjoner = [], onEdit, onDelete, canEdit }) {
  const aktive = reservasjoner
    .filter((r) => r.status !== 'kansellert')
    .sort((a, b) => new Date(a.start_dato_tid) - new Date(b.start_dato_tid));

  if (aktive.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400 text-xs">
        Ingen reservasjoner
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {aktive.map((r) => {
        const start = parseISO(r.start_dato_tid);
        const end = parseISO(r.slutt_dato_tid);
        const isNow = !isFuture(start) && !isPast(end);
        const isDone = isPast(end);
        const isFromRessursplan = r.kilde === 'ressursplan';

        return (
          <div
            key={r.id}
            className={cn(
              'flex items-start gap-2 p-2.5 rounded-lg border text-xs',
              isNow && 'bg-blue-50 border-blue-200',
              !isNow && !isDone && 'bg-slate-50 border-slate-200',
              isDone && 'bg-slate-50 border-slate-100 opacity-60'
            )}
          >
            <CalendarRange className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', isNow ? 'text-blue-600' : 'text-slate-400')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800">
                  {format(start, 'd. MMM', { locale: nb })} – {format(end, 'd. MMM yyyy', { locale: nb })}
                </span>
                {isNow && <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1 py-0">Pågår nå</Badge>}
                {isFromRessursplan && (
                  <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1 py-0 flex items-center gap-0.5">
                    <Link className="h-2.5 w-2.5" /> Ressursplan
                  </Badge>
                )}
              </div>
              {r.prosjekt_navn && (
                <div className="flex items-center gap-1 text-slate-600 mt-0.5">
                  <Briefcase className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{r.prosjekt_navn}</span>
                </div>
              )}
              {r.reservert_av_navn && (
                <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{r.reservert_av_navn}</span>
                </div>
              )}
              {r.kommentar && <p className="text-slate-400 mt-0.5 truncate">{r.kommentar}</p>}
            </div>
            {canEdit && !isFromRessursplan && (
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(r)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => onDelete(r)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}