import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, Send, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AnbudsmodulHistorikk() {
  const [filter, setFilter] = useState('all');

  const { data: logs = [] } = useQuery({
    queryKey: ['anbudActivityLogs'],
    queryFn: () => base44.entities.AnbudActivityLog.list('-created_date', 100)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list()
  });

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.title]));

  const getActivityIcon = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'sent':
        return Send;
      case 'withdrawn':
      case 'deleted':
        return XCircle;
      case 'completed':
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'sent':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'withdrawn':
      case 'deleted':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'completed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
    }
  };

  const getActivityIconColor = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'sent':
        return 'text-blue-600 dark:text-blue-400';
      case 'withdrawn':
      case 'deleted':
        return 'text-red-600 dark:text-red-400';
      case 'completed':
        return 'text-emerald-600 dark:text-emerald-400';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'withdrawn') {
      return log.activityType?.toLowerCase() === 'withdrawn' || log.activityType?.toLowerCase() === 'deleted';
    }
    return log.activityType?.toLowerCase() === filter;
  });

  const Icon = getActivityIcon('sent');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historikk</h2>
      </div>

      {/* Filterknapper */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="text-xs"
        >
          Alle
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('sent')}
          className="text-xs">

          Sendt
        </Button>
        <Button
          variant={filter === 'withdrawn' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('withdrawn')}
          className="text-xs gap-1.5">

          <AlertCircle className="h-3.5 w-3.5" />
          Tilbaketrukket
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
          className="text-xs">

          Avsluttet
        </Button>
      </div>

      <Card className="border-0 shadow-sm dark:bg-slate-900">
        {filteredLogs.length === 0 ?
        <div className="p-12 text-center">
            <Icon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {filter === 'all' ? 'Ingen aktivitet registrert ennå' : 'Ingen aktivitet av denne typen'}
            </p>
          </div> :

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => {
            const ActivityIcon = getActivityIcon(log.activityType);
            return (
              <div
                key={log.id}
                className={cn(
                  'px-6 py-4 flex items-start gap-4 border-l-4 transition-colors',
                  getActivityColor(log.activityType)
                )}>

                  <div className="flex-shrink-0 mt-0.5">
                    <ActivityIcon className={cn('h-5 w-5', getActivityIconColor(log.activityType))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                      {log.activityText}
                    </p>
                    {log.anbudProjectId && projectMap[log.anbudProjectId] &&
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                        {projectMap[log.anbudProjectId]}
                      </p>
                  }
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {log.created_date ? format(parseISO(log.created_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb }) : ''}
                      </span>
                      {log.createdBy &&
                    <>
                          <span>·</span>
                          <span>{log.createdBy}</span>
                        </>
                    }
                    </div>
                  </div>
                </div>);

          })}
          </div>
        }
      </Card>
    </div>);

}