import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors = {
  // General statuses
  ny: 'bg-blue-100 text-blue-700',
  aktiv: 'bg-emerald-100 text-emerald-700',
  pause: 'bg-amber-100 text-amber-700',
  fullfort: 'bg-slate-100 text-slate-700',
  lukket: 'bg-slate-100 text-slate-700',
  
  // Document statuses
  utkast: 'bg-slate-100 text-slate-600',
  sendt: 'bg-blue-100 text-blue-700',
  godkjent: 'bg-emerald-100 text-emerald-700',
  avvist: 'bg-red-100 text-red-700',
  utlopt: 'bg-amber-100 text-amber-700',
  
  // Processing
  under_behandling: 'bg-amber-100 text-amber-700',
  pagarende: 'bg-blue-100 text-blue-700',
  ikke_startet: 'bg-slate-100 text-slate-600',
  
  // Order statuses
  bestilt: 'bg-blue-100 text-blue-700',
  levert: 'bg-emerald-100 text-emerald-700',
  kansellert: 'bg-red-100 text-red-700',
  
  // Severity
  lav: 'bg-slate-100 text-slate-600',
  middels: 'bg-amber-100 text-amber-700',
  hoy: 'bg-orange-100 text-orange-700',
  kritisk: 'bg-red-100 text-red-700',
  
  // Project
  planlagt: 'bg-blue-100 text-blue-700',
  
  // Invoice
  kladd: 'bg-slate-100 text-slate-600',
  mottatt: 'bg-blue-100 text-blue-700',
  apnet: 'bg-amber-100 text-amber-700',
  lastet_ned: 'bg-purple-100 text-purple-700',
  betalt: 'bg-emerald-100 text-emerald-700',
  forfalt: 'bg-red-100 text-red-700',
  kreditert: 'bg-purple-100 text-purple-700',
};

const statusLabels = {
  ny: 'Ny',
  aktiv: 'Påbegynt',
  pause: 'På pause',
  fullfort: 'Fullført',
  lukket: 'Lukket',
  utkast: 'Utkast',
  sendt: 'Sendt',
  godkjent: 'Godkjent',
  avvist: 'Avvist',
  utlopt: 'Utløpt',
  under_behandling: 'Under behandling',
  pagarende: 'Pågående',
  ikke_startet: 'Ikke startet',
  bestilt: 'Bestilt',
  levert: 'Levert',
  kansellert: 'Kansellert',
  lav: 'Lav',
  middels: 'Middels',
  hoy: 'Høy',
  kritisk: 'Kritisk',
  planlagt: 'Planlagt',
  kladd: 'Kladd',
  mottatt: 'Mottatt',
  apnet: 'Åpnet',
  lastet_ned: 'Lastet ned',
  betalt: 'Betalt',
  forfalt: 'Forfalt',
  kreditert: 'Kreditert',
};

export default function StatusBadge({ status, className }) {
  if (!status) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "font-medium rounded-lg px-2.5 py-0.5",
        statusColors[status] || 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}