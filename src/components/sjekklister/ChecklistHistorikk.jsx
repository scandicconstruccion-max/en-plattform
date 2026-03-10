import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ChecklistHistorikk({ activityLog = [] }) {
  if (activityLog.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        Ingen historikk ennå.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...activityLog].reverse().map((entry, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
            </div>
            {i < activityLog.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="pb-3">
            <p className="text-slate-800">{entry.action}</p>
            {entry.details && <p className="text-slate-500 text-xs mt-0.5">{entry.details}</p>}
            <p className="text-slate-400 text-xs mt-0.5">
              {entry.user_name || entry.user_email} — {entry.timestamp ? format(new Date(entry.timestamp), 'dd.MM.yyyy HH:mm', { locale: nb }) : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}