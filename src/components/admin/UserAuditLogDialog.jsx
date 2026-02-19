import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const actionLabels = {
  role_changed: 'Rolle endret',
  projects_assigned: 'Prosjekter tildelt',
  projects_removed: 'Prosjekter fjernet',
  modules_changed: 'Moduler endret',
  user_invited: 'Bruker invitert',
  user_deactivated: 'Bruker deaktivert',
  user_activated: 'Bruker aktivert'
};

export default function UserAuditLogDialog({ user, onClose }) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', user.email],
    queryFn: () => base44.entities.UserAuditLog.filter({ user_email: user.email }, '-created_date', 50)
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Endringslogg - {user.full_name}</DialogTitle>
          <p className="text-sm text-slate-600">{user.email}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Laster...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Ingen endringer registrert
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {actionLabels[log.action_type] || log.action_type}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          av {log.changed_by_name || log.changed_by}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-sm text-slate-700 mt-2">{log.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                    </div>
                  </div>

                  {(log.old_value || log.new_value) && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-xs">
                      {log.old_value && (
                        <div>
                          <p className="font-medium text-slate-600 mb-1">Tidligere:</p>
                          <pre className="bg-slate-50 p-2 rounded text-slate-700 overflow-auto">
                            {JSON.stringify(JSON.parse(log.old_value), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div>
                          <p className="font-medium text-slate-600 mb-1">Ny:</p>
                          <pre className="bg-slate-50 p-2 rounded text-slate-700 overflow-auto">
                            {JSON.stringify(JSON.parse(log.new_value), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button onClick={onClose}>Lukk</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}