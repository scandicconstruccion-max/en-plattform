import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Search, Building2, Mail, Phone, MapPin, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Leverandorer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({ company_name: '', contact_person: '', email: '', phone: '', trade: '', address: '', notes: '' });

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editingVendor
      ? base44.entities.Vendor.update(editingVendor.id, data)
      : base44.entities.Vendor.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); closeDialog(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });

  const openNew = () => {
    setEditingVendor(null);
    setFormData({ company_name: '', contact_person: '', email: '', phone: '', trade: '', address: '', notes: '' });
    setShowDialog(true);
  };

  const openEdit = (v) => {
    setEditingVendor(v);
    setFormData({ company_name: v.company_name, contact_person: v.contact_person || '', email: v.email, phone: v.phone || '', trade: v.trade || '', address: v.address || '', notes: v.notes || '' });
    setShowDialog(true);
  };

  const closeDialog = () => { setShowDialog(false); setEditingVendor(null); };

  const filtered = vendors.filter(v =>
    v.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.trade?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Anbudsmodul'))} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leverandørregister</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{vendors.length} leverandører</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Ny leverandør
          </Button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk på navn, fagområde, e-post..." className="pl-9 rounded-xl" />
        </div>

        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <div className="text-center py-16">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">Ingen leverandører ennå</p>
              <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Legg til leverandør
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(v => (
              <Card key={v.id} className="border-0 shadow-sm dark:bg-slate-900 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{v.company_name}</p>
                      {v.trade && <p className="text-xs text-slate-500">{v.trade}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {v.contact_person && <p className="font-medium text-slate-700 dark:text-slate-300">{v.contact_person}</p>}
                  {v.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{v.email}</p>}
                  {v.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{v.phone}</p>}
                  {v.address && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{v.address}</p>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Rediger leverandør' : 'Ny leverandør'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Firmanavn *</Label>
              <Input value={formData.company_name} onChange={e => setFormData(f => ({ ...f, company_name: e.target.value }))} placeholder="AS eller enkeltperson" required className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kontaktperson</Label>
                <Input value={formData.contact_person} onChange={e => setFormData(f => ({ ...f, contact_person: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Fagområde</Label>
                <Input value={formData.trade} onChange={e => setFormData(f => ({ ...f, trade: e.target.value }))} placeholder="Elektro, VVS..." className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-post *</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} required className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Notater</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1.5 rounded-xl" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl">Avbryt</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}