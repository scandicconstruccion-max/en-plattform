import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar, Clock, User, Briefcase, MessageSquare, History } from 'lucide-react';

export default function AssignmentDetailsDialog({
  open,
  onOpenChange,
  assignment,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  isHoverMode
}) {
  if (!assignment) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'bekreftet': return 'bg-green-100 text-green-800';
      case 'fullfort': return 'bg-blue-100 text-blue-800';
      case 'kansellert': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'bekreftet': return 'Bekreftet';
      case 'fullfort': return 'Fullført';
      case 'kansellert': return 'Kansellert';
      default: return 'Planlagt';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl"
        onMouseLeave={() => {
          if (isHoverMode) {
            onOpenChange(false);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ressursplanlegging detaljer</span>
            <Badge className={getStatusColor(assignment.status)}>
              {getStatusLabel(assignment.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <User className="h-4 w-4" />
                <span>Ressurs</span>
              </div>
              <p className="font-medium">{assignment.resource_navn}</p>
              <p className="text-xs text-slate-500">
                {assignment.resource_type === 'employee' ? 'Ansatt' : 'Ekstern'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Briefcase className="h-4 w-4" />
                <span>Prosjekt</span>
              </div>
              <p className="font-medium">{assignment.prosjekt_navn}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                <span>Start</span>
              </div>
              <p className="font-medium">
                {format(parseISO(assignment.start_dato_tid), 'dd.MM.yyyy HH:mm', { locale: nb })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Slutt</span>
              </div>
              <p className="font-medium">
                {format(parseISO(assignment.slutt_dato_tid), 'dd.MM.yyyy HH:mm', { locale: nb })}
              </p>
            </div>
          </div>

          {assignment.rolle_pa_prosjekt && (
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Rolle på prosjekt</p>
              <p className="font-medium">{assignment.rolle_pa_prosjekt}</p>
            </div>
          )}

          {assignment.kommentar && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MessageSquare className="h-4 w-4" />
                <span>Kommentar</span>
              </div>
              <p className="text-slate-700">{assignment.kommentar}</p>
            </div>
          )}

          {assignment.change_log && assignment.change_log.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <History className="h-4 w-4" />
                <span>Endringslogg</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {assignment.change_log.map((log, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-slate-300 pl-3">
                    <p className="font-medium text-slate-700">{log.action}</p>
                    <p className="text-slate-500">
                      {log.user_name} • {format(parseISO(log.timestamp), 'dd.MM.yyyy HH:mm', { locale: nb })}
                    </p>
                    {log.changes && <p className="text-slate-600 mt-1">{log.changes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-slate-500">
              Opprettet av {assignment.opprettet_av_navn} • {format(parseISO(assignment.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
            </div>
            <div className="flex gap-2">
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onDelete(assignment);
                    onOpenChange(false);
                  }}
                  className="text-red-600 hover:text-red-700 rounded-xl"
                >
                  Slett
                </Button>
              )}
              {canEdit && (
                <Button
                  onClick={() => {
                    onEdit(assignment);
                    onOpenChange(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Rediger
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}