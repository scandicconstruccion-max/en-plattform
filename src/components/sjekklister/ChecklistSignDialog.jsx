import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenLine, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ChecklistSignDialog({ open, onOpenChange, onSign, existingSignatures = [], user }) {
  const [role, setRole] = useState('');

  const roleOptions = ['Kontrollør', 'Prosjektleder', 'Byggeleder', 'HMS-ansvarlig', 'Arbeidsleder', 'Fagarbeider'];

  const handleSign = () => {
    if (!role.trim()) return;
    onSign({ role: role.trim() });
    setRole('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-emerald-600" />
            Signer sjekkliste
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {existingSignatures.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Eksisterende signaturer:</p>
              <div className="space-y-2">
                {existingSignatures.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">{sig.signed_by_name || sig.signed_by}</p>
                      <p className="text-xs text-green-600">{sig.role} — {format(new Date(sig.signed_date), 'dd.MM.yyyy HH:mm', { locale: nb })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-600 mb-3">
              Du signerer som: <strong>{user?.full_name || user?.email}</strong>
            </p>
            <Label>Din rolle *</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              {roleOptions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                    role === r
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:border-emerald-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Eller skriv inn rolle..."
              className="rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button
              onClick={handleSign}
              disabled={!role.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <PenLine className="h-4 w-4" />
              Signer nå
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}