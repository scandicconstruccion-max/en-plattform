import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

export default function CustomerSelectField({ value, onChange }) {
  const [showNew, setShowNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', contact_person: '', email: '', phone: '' });
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onChange({
        name: created.name,
        contact: created.contact_person || '',
        email: created.email || '',
        phone: created.phone || '',
      });
      setShowNew(false);
      setNewCustomer({ name: '', contact_person: '', email: '', phone: '' });
    },
  });

  const handleSelect = (id) => {
    if (id === '__new__') {
      setShowNew(true);
      return;
    }
    const c = customers.find(c => c.id === id);
    if (!c) return;
    onChange({
      name: c.name || '',
      contact: c.contact_person || '',
      email: c.email || '',
      phone: c.phone || '',
    });
  };

  const selectedId = customers.find(c =>
    c.name === value?.name && (c.email === value?.email || !value?.email)
  )?.id || '';

  return (
    <div className="space-y-3">
      <div>
        <Label>Velg kunde</Label>
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="mt-1.5 rounded-xl">
            <SelectValue placeholder="Velg eksisterende kunde..." />
          </SelectTrigger>
          <SelectContent>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            <SelectItem value="__new__">
              <span className="flex items-center gap-2 text-emerald-600">
                <Plus className="h-3.5 w-3.5" /> Legg til ny kunde
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showNew && (
        <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
          <p className="text-sm font-medium text-slate-700">Ny kunde</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Kundenavn *</Label>
              <Input value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Kontaktperson</Label>
              <Input value={newCustomer.contact_person} onChange={e => setNewCustomer({...newCustomer, contact_person: e.target.value})} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="mt-1 rounded-xl" />
            </div>
            <div className="col-span-2">
              <Label>E-post</Label>
              <Input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="mt-1 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNew(false)} className="rounded-xl">Avbryt</Button>
            <Button
              type="button"
              size="sm"
              disabled={!newCustomer.name || createMutation.isPending}
              onClick={() => createMutation.mutate(newCustomer)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {createMutation.isPending ? 'Lagrer...' : 'Lagre kunde'}
            </Button>
          </div>
        </div>
      )}

      {value?.name && !showNew && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kontaktperson</Label>
            <Input value={value.contact || ''} onChange={e => onChange({...value, contact: e.target.value})} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={value.phone || ''} onChange={e => onChange({...value, phone: e.target.value})} className="mt-1.5 rounded-xl" />
          </div>
          <div className="col-span-2">
            <Label>E-post</Label>
            <Input type="email" value={value.email || ''} onChange={e => onChange({...value, email: e.target.value})} className="mt-1.5 rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}