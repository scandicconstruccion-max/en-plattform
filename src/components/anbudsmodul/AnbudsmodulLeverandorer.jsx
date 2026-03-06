import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Search, X } from 'lucide-react';

const TRADE_TYPES = ['Elektro', 'Rør/VVS', 'Betong', 'Tømrer', 'Maler', 'Gulvlegger', 'Tak', 'Stål/Sveis', 'HVAC', 'Graving/Anlegg', 'Annet'];

const emptyForm = { name: '', contactPerson: '', email: '', phone: '', tradeTypes: [] };

export default function AnbudsmodulLeverandorer() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['anbudSuppliers'],
    queryFn: () => base44.entities.AnbudSupplier.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnbudSupplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anbudSuppliers'] });
      setShowDialog(false);
      setForm(emptyForm);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const toggleTrade = (trade) => {
    setForm(f => ({
      ...f,
      tradeTypes: f.tradeTypes.includes(trade)
        ? f.tradeTypes.filter(t => t !== trade)
        : [...f.tradeTypes, trade]
    }));
  };

  const filtered = suppliers.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk leverandør..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Legg til leverandør
        </Button>
      </div>

      <Card className="border-0 shadow-sm dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {search ? 'Ingen leverandører funnet' : 'Ingen leverandører ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Navn', 'Kontaktperson', 'E-post', 'Telefon', 'Fagområder'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(supplier => (
                  <tr key={supplier.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{supplier.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{supplier.contactPerson || '–'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{supplier.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{supplier.phone || '–'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(supplier.tradeTypes || []).map(t => (
                          <Badge key={t} className="bg-slate-100 text-slate-700 border-0 text-xs">{t}</Badge>
                        ))}
                        {(!supplier.tradeTypes || supplier.tradeTypes.length === 0) && <span className="text-slate-400">–</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Legg til leverandør</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Firmanavn *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Firmanavn" required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Kontaktperson</Label>
              <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Navn" className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-post *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="epost@firma.no" required className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefonnummer" className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Fagområder</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TRADE_TYPES.map(trade => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => toggleTrade(trade)}
                    className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                      form.tradeTypes.includes(trade)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
                    }`}
                  >
                    {trade}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Avbryt</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {createMutation.isPending ? 'Lagrer...' : 'Legg til'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}