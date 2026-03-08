import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Send, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InviterLeverandorDialog({ open, onClose, project, existingInvitations = [], onDone }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['anbudSuppliers'],
    queryFn: () => base44.entities.AnbudSupplier.list(),
  });

  const alreadyInvited = existingInvitations.map(i => i.supplierId);

  const filtered = suppliers.filter(s => {
    if (alreadyInvited.includes(s.id)) return false;
    if (!search) return true;
    return s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.tradeTypes?.some(t => t.toLowerCase().includes(search.toLowerCase()));
  });

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await base44.functions.invoke('anbudSendInvitations', {
        anbudProjectId: project.id,
        supplierIds: selected,
        appUrl: window.location.origin,
      });
      setDone(true);
      setTimeout(() => {
        onDone();
        onClose();
        setDone(false);
        setSelected([]);
        setSearch('');
        setError(null);
      }, 2000);
    } catch (e) {
      console.error(e);
      setError('Noe gikk galt ved sending. Prøv igjen.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Inviter leverandører</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 dark:text-white">Invitasjoner sendt!</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Forespørsel: <span className="font-medium text-slate-900 dark:text-white">{project?.title}</span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Søk leverandør eller fag..."
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">{alreadyInvited.length === suppliers.length ? 'Alle leverandører er allerede invitert' : 'Ingen leverandører funnet'}</p>
                </div>
              )}
              {filtered.map(supplier => {
                const isSelected = selected.includes(supplier.id);
                return (
                  <button
                    key={supplier.id}
                    onClick={() => toggle(supplier.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0',
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}>
                      {supplier.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{supplier.name}</p>
                      <p className="text-xs text-slate-500 truncate">{supplier.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(supplier.tradeTypes || []).slice(0, 2).map(t => (
                        <Badge key={t} className="bg-slate-100 text-slate-600 border-0 text-xs">{t}</Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-2">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{selected.length} valgt</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl">Avbryt</Button>
                <Button
                  onClick={handleSend}
                  disabled={selected.length === 0 || sending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sender...' : 'Send invitasjoner'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}