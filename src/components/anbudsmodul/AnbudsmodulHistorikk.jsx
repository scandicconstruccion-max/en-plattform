import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function AnbudsmodulHistorikk() {
  const { data: logs = [] } = useQuery({
    queryKey: ['anbudActivityLogs'],
    queryFn: () => base44.entities.AnbudActivityLog.list('-created_date', 100),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list(),
  });

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historikk</h2>
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Ingen aktivitet registrert ennå</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(log => (
              <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white">{log.activityText}</p>
                  {log.anbudProjectId && projectMap[log.anbudProjectId] && (
                    <p className="text-xs text-emerald-600 mt-0.5">{projectMap[log.anbudProjectId]}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {log.created_date ? format(parseISO(log.created_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb }) : ''}
                    {log.createdBy && ` · ${log.createdBy}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}