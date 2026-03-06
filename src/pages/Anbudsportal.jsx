import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, Clock, CheckCircle, AlertTriangle, Plus, ChevronRight, Building2 } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const rfqStatusConfig = {
  utkast:         { label: 'Utkast',          color: 'bg-slate-100 text-slate-700' },
  sendt:          { label: 'Sendt',            color: 'bg-blue-100 text-blue-700' },
  tilbud_mottas:  { label: 'Tilbud mottas',   color: 'bg-emerald-100 text-emerald-700' },
  evaluering:     { label: 'Evaluering',      color: 'bg-amber-100 text-amber-700' },
  tildelt:        { label: 'Tildelt',          color: 'bg-purple-100 text-purple-700' },
  lukket:         { label: 'Lukket',           color: 'bg-slate-200 text-slate-500' },
};

export default function Anbudsportal() {
  const { data: rfqs = [] } = useQuery({ queryKey: ['rfqs'], queryFn: () => base44.entities.RFQ.list('-created_date') });
  const { data: bids = [] } = useQuery({ queryKey: ['vendorBids'], queryFn: () => base44.entities.VendorBid.list() });
  const { data: invitations = [] } = useQuery({ queryKey: ['vendorInvitations'], queryFn: () => base44.entities.VendorInvitation.list() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });

  const today = new Date();
  const activeRfqs = rfqs.filter(r => !['lukket', 'utkast'].includes(r.status));
  const nearDeadline = rfqs.filter(r => {
    if (!r.deadline || r.status === 'lukket') return false;
    const days = differenceInDays(parseISO(r.deadline), today);
    return days >= 0 && days <= 7;
  });

  const stats = [
    { label: 'Aktive forespørsler', value: activeRfqs.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tilbud mottatt', value: bids.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Leverandører invitert', value: invitations.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Nær svarfrist', value: nearDeadline.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anbudsportal</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Forespørsler om tilbud og leverandørstyring</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Leverandorer')}>
              <Button variant="outline" className="rounded-xl gap-2">
                <Building2 className="h-4 w-4" /> Leverandører
              </Button>
            </Link>
            <Link to={createPageUrl('RFQDetaljer') + '?new=1'}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Ny forespørsel
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-0 shadow-sm dark:bg-slate-900 p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Near deadline warning */}
        {nearDeadline.length > 0 && (
          <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm">Forespørsler med snarlig svarfrist</p>
            </div>
            <div className="space-y-1">
              {nearDeadline.map(r => (
                <Link key={r.id} to={createPageUrl('RFQDetaljer') + `?id=${r.id}`} className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300 hover:underline">
                  <span>{r.title}</span>
                  <span className="text-xs">{format(parseISO(r.deadline), 'd. MMM', { locale: nb })}</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* All RFQs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-white">Alle forespørsler</h2>
            <Link to={createPageUrl('RFQListe')}>
              <Button variant="ghost" size="sm" className="gap-1 text-emerald-600">Se alle <ChevronRight className="h-4 w-4" /></Button>
            </Link>
          </div>
          <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
            {rfqs.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">Ingen forespørsler ennå</p>
                <Link to={createPageUrl('RFQDetaljer') + '?new=1'}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                    <Plus className="h-4 w-4" /> Opprett første forespørsel
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rfqs.slice(0, 10).map(rfq => {
                  const rfqBids = bids.filter(b => b.rfq_id === rfq.id);
                  const rfqInvitations = invitations.filter(i => i.rfq_id === rfq.id);
                  const status = rfqStatusConfig[rfq.status] || rfqStatusConfig.utkast;
                  const isOverdue = rfq.deadline && isAfter(today, parseISO(rfq.deadline)) && rfq.status !== 'lukket';
                  return (
                    <Link key={rfq.id} to={createPageUrl('RFQDetaljer') + `?id=${rfq.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{rfq.title}</p>
                          {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {rfq.project_name && <span>{rfq.project_name}</span>}
                          {rfq.trade && <span>· {rfq.trade}</span>}
                          {rfq.deadline && <span className={cn("flex items-center gap-1", isOverdue && "text-red-500")}>
                            <Clock className="h-3 w-3" /> {format(parseISO(rfq.deadline), 'd. MMM yyyy', { locale: nb })}
                          </span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{rfqBids.length}/{rfqInvitations.length}</p>
                          <p className="text-xs text-slate-400">tilbud</p>
                        </div>
                        <Badge className={cn("text-xs font-medium border-0", status.color)}>{status.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}