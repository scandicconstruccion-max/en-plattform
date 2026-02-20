import { format } from 'date-fns';
import { nbNO } from 'date-fns/locale';
import { CheckCircle2, Send, FileCheck, XCircle, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';

const actionIcons = {
  opprettet: <Lock className="w-4 h-4 text-slate-500" />,
  sendt_kunde: <Send className="w-4 h-4 text-blue-500" />,
  godkjent_kunde: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  avvist_kunde: <XCircle className="w-4 h-4 text-red-500" />,
  lukket: <FileCheck className="w-4 h-4 text-emerald-500" />
};

const actionLabels = {
  opprettet: 'Opprettet',
  sendt_kunde: 'Sendt til kunde',
  godkjent_kunde: 'Godkjent av kunde',
  avvist_kunde: 'Avvist av kunde',
  lukket: 'Avvik lukket'
};

export default function ActivityLog({ activityLog = [] }) {
  if (!activityLog || activityLog.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-slate-500">Ingen aktiviteter registrert</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4 text-slate-900">Aktivitetslogg</h4>
      <div className="space-y-3">
        {activityLog.map((activity, index) => (
          <div key={index} className="flex gap-3 pb-3 border-b last:border-b-0">
            <div className="flex-shrink-0 mt-1">
              {actionIcons[activity.action] || <Lock className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-slate-900">
                  {actionLabels[activity.action] || activity.action}
                </span>
                <span className="text-xs text-slate-500">
                  {format(new Date(activity.timestamp), 'dd.MM.yyyy HH:mm', { locale: nbNO })}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                Av: {activity.user_name || activity.user_email}
              </div>
              {activity.details && (
                <div className="text-xs text-slate-500 mt-1">
                  {activity.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}