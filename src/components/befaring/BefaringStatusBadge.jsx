import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  utkast: { label: 'Utkast', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  aktiv: { label: 'Aktiv', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  signert: { label: 'Signert', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  sendt: { label: 'Sendt', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  fullfort: { label: 'Fullført', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
};

const punktStatusConfig = {
  ikke_startet: { label: 'Ikke startet', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  pagaende: { label: 'Pågående', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  utfort: { label: 'Utført', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
};

export function BefaringStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.utkast;
  return (
    <Badge className={cn(config.bg, config.text, 'border-0')}>
      {config.label}
    </Badge>
  );
}

export function PunktStatusBadge({ status }) {
  const config = punktStatusConfig[status] || punktStatusConfig.ikke_startet;
  return (
    <Badge className={cn(config.bg, config.text, 'border-0')}>
      {config.label}
    </Badge>
  );
}