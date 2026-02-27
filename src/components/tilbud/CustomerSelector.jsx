import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, UserPlus, ChevronDown, X } from 'lucide-react';

// Inline new-customer form inside a dialog
function NewCustomerDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '' });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onCreated(created);
      onOpenChange(false);
      setForm({ name: '', contact_person: '', email: '', phone: '' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ny kunde</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div>
            <Label>Firmanavn *</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Firma eller privatperson"
              required
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kontaktperson</Label>
              <Input
                value={form.contact_person}
                onChange={e => setForm({ ...form, contact_person: e.target.value })}
                placeholder="Navn"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+47 000 00 000"
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          <div>
            <Label>E-post</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="kunde@firma.no"
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Avbryt</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              {createMutation.isPending ? 'Lagrer...' : 'Opprett og bruk'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerSelector({ customers = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (customer) => {
    setSelected(customer);
    setSearch('');
    setOpen(false);
    onSelect(customer);
  };

  const handleCreated = (customer) => {
    handleSelect(customer);
  };

  const handleClear = () => {
    setSelected(null);
    onSelect(null);
  };

  return (
    <>
      <div ref={ref} className="relative">
        <Label>Velg kunde</Label>
        <div className="mt-1.5 relative">
          {selected ? (
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-emerald-50">
              <span className="flex-1 text-sm font-medium text-emerald-800">{selected.name}</span>
              <button onClick={handleClear} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-emerald-300 transition-colors bg-white"
              onClick={() => setOpen(true)}
            >
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
                placeholder="Søk etter registrert kunde..."
                value={search}
                onChange={e => { setSearch(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </div>
          )}
        </div>

        {open && !selected && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-sm text-slate-400 px-4 py-3">Ingen kunder funnet</p>
              )}
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  onClick={() => handleSelect(c)}
                >
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  {(c.contact_person || c.email) && (
                    <p className="text-xs text-slate-400">{[c.contact_person, c.email].filter(Boolean).join(' • ')}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                onClick={() => { setOpen(false); setShowNewDialog(true); }}
              >
                <UserPlus className="h-4 w-4" />
                Opprett ny kunde
              </button>
            </div>
          </div>
        )}
      </div>

      <NewCustomerDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={handleCreated}
      />
    </>
  );
}