import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp } from 'lucide-react';

export default function LeverandorHistorikk({ supplier }) {
  const [open, setOpen] = useState(false);

  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations'],
    queryFn: () => base44.entities.AnbudInvitation.list(),
    enabled: open,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes'],
    queryFn: () => base44.entities.AnbudQuote.list(),
    enabled: open,
  });

  const supplierInvitations = invitations.filter(i => i.supplierId === supplier.id);
  const supplierQuotes = quotes.filter(q => q.supplierId === supplier.id);
  const selectedCount = supplierQuotes.filter(q => q.isSelected).length;
  const avgPrice = supplierQuotes.filter(q => q.price).length > 0
    ? Math.round(supplierQuotes.filter(q => q.price).reduce((s, q) => s + q.price, 0) / supplierQuotes.filter(q => q.price).length)
    : null;

  const statsData = [
    { name: 'Invitert', value: supplierInvitations.length, fill: '#60a5fa' },
    { name: 'Svart', value: supplierQuotes.length, fill: '#10b981' },
    { name: 'Valgt', value: selectedCount, fill: '#f59e0b' },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-emerald-600 hover:underline font-medium"
      >
        Se historikk
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-sm font-bold text-emerald-700">
                {supplier.name?.charAt(0)}
              </div>
              {supplier.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Invitasjoner', value: supplierInvitations.length, color: 'text-blue-600' },
                { label: 'Tilbud levert', value: supplierQuotes.length, color: 'text-emerald-600' },
                { label: 'Ganger valgt', value: selectedCount, color: 'text-amber-600' },
              ].map((s, i) => (
                <div key={i} className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {avgPrice && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Gjennomsnittspris</p>
                  <p className="text-xs text-emerald-600">{avgPrice.toLocaleString('nb-NO')} NOK</p>
                </div>
              </div>
            )}

            {/* Bar chart */}
            {supplierInvitations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Aktivitetsoversikt</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={statsData} margin={{ left: -30, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statsData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {supplierInvitations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Ingen aktivitet ennå for denne leverandøren</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}