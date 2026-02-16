import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Mail, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function DeliveryStatus({ item }) {
  if (!item?.sent_to_customer) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3">
      <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Leveringsstatus
      </h4>
      
      <div className="space-y-2">
        {/* Sent */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            item.sent_to_customer ? "bg-emerald-100" : "bg-slate-200"
          )}>
            <CheckCircle2 className={cn(
              "h-4 w-4",
              item.sent_to_customer ? "text-emerald-600" : "text-slate-400"
            )} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Sendt</p>
            {item.sent_date && (
              <p className="text-xs text-slate-500">
                {format(new Date(item.sent_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
                {item.sent_to_email && ` til ${item.sent_to_email}`}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            Sendt
          </Badge>
        </div>

        {/* Delivery Confirmed */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            item.delivery_confirmed ? "bg-emerald-100" : "bg-slate-200"
          )}>
            {item.delivery_confirmed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Levert til innboks</p>
            {item.delivery_confirmed_date && (
              <p className="text-xs text-slate-500">
                {format(new Date(item.delivery_confirmed_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
              </p>
            )}
          </div>
          {item.delivery_confirmed ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              Bekreftet
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Venter
            </Badge>
          )}
        </div>

        {/* Downloaded */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            item.downloaded ? "bg-emerald-100" : "bg-slate-200"
          )}>
            {item.downloaded ? (
              <Download className="h-4 w-4 text-emerald-600" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Lastet ned</p>
            {item.downloaded_date && (
              <p className="text-xs text-slate-500">
                {format(new Date(item.downloaded_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
              </p>
            )}
          </div>
          {item.downloaded ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              Lastet ned
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              Ikke lastet ned
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}