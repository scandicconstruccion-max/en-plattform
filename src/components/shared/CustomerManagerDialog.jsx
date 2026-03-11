import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Pencil, Trash2, Building2, Phone, Mail, Globe, X } from 'lucide-react';

const emptyCustomer = { name: '', org_number: '', contact_person: '', email: '', phone: '', address: '', website: '', notes: '' };

export default function CustomerManagerDialog({ open, onClose }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null = list, 'new' or customer obj = form
  const [form, setForm] = useState(emptyCustomer);
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const startNew = () => { setForm(emptyCustomer); setEditing('new'); };
  const startEdit = (c) => { setForm({ ...c }); setEditing(c); };

  const handleSave = (e) => {
    e.preventDefault();
    if (editing === 'new') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: editing.id, data: form });
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.org_number?.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editing ? (editing === 'new' ? 'Ny kunde' : `Rediger: ${editing.name}`) : 'Kundeoversikt'}
          </DialogTitle>
        </DialogHeader>

        {!editing ? (
          <>
            {/* List view */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Søk etter kunde..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Button onClick={startNew} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1">
                <Plus className="h-4 w-4" /> Ny kunde
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Ingen kunder funnet</p>
                </div>
              ) : filtered.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {c.contact_person && <span>{c.contact_person}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)} className="h-8 w-8 text-slate-400 hover:text-emerald-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Slett "${c.name}"?`)) deleteMutation.mutate(c.id); }}
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Edit / Create form */
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Firmanavn *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Firmanavn" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Org.nummer</Label>
                <Input value={form.org_number} onChange={e => setForm({...form, org_number: e.target.value})} placeholder="000 000 000" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Kontaktperson</Label>
                <Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="Navn" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>E-post</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e-post" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Telefon" className="mt-1.5 rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Gateadresse, postnummer, by" className="mt-1.5 rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>Nettside</Label>
                <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://" className="mt-1.5 rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>Notater</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Interne notater om kunden..." className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Avbryt</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {createMutation.isPending || updateMutation.isPending ? 'Lagrer...' : 'Lagre'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}