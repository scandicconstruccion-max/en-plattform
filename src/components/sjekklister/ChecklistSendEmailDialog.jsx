import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ChecklistSendEmailDialog({ open, onOpenChange, checklist, project }) {
  const [recipients, setRecipients] = useState([{ label: '', email: '' }]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const presets = [
    { label: 'Prosjektleder', email: project?.manager_email || '' },
    { label: 'Kunde', email: project?.customer_email || '' },
  ].filter(p => p.email);

  const addRecipient = () => setRecipients(r => [...r, { label: '', email: '' }]);
  const removeRecipient = (i) => setRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i, field, value) => {
    setRecipients(r => r.map((rec, idx) => idx === i ? { ...rec, [field]: value } : rec));
  };

  const handleSend = async () => {
    const validRecipients = recipients.filter(r => r.email?.includes('@'));
    if (validRecipients.length === 0) return;

    setSending(true);
    const totalItems = checklist.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || checklist.items?.length || 0;
    const completedItems = checklist.responses?.filter(r => r.status && r.status !== 'ikke_kontrollert').length || 0;
    const avvikItems = checklist.responses?.filter(r => r.status === 'avvik' || r.status === 'ikke_ok').length || 0;

    for (const recipient of validRecipients) {
      await base44.integrations.Core.SendEmail({
        to: recipient.email,
        subject: `Sjekkliste: ${checklist.name}`,
        body: `
Hei ${recipient.label || ''},

Sjekklisten "${checklist.name}" er nå ferdigstilt.

Prosjekt: ${checklist.project_name || 'N/A'}
Dato: ${checklist.date || 'N/A'}
Fremdrift: ${completedItems} av ${totalItems} punkter kontrollert
Avvik: ${avvikItems} punkt(er)
Status: ${checklist.status === 'fullfort' ? 'Fullført' : 'Pågående'}

${checklist.signatures?.length > 0 ? 'Signert av: ' + checklist.signatures.map(s => `${s.signed_by_name} (${s.role})`).join(', ') : ''}

Hilsen
En Plattform
        `.trim()
      });
    }

    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            Send sjekkliste på e-post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {presets.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Hurtigvalg:</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!recipients.find(r => r.email === p.email)) {
                        setRecipients(r => [...r.filter(x => x.email), { label: p.label, email: p.email }]);
                      }
                    }}
                    className="px-3 py-1 rounded-lg text-sm border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mottakere</Label>
            {recipients.map((rec, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={rec.label}
                  onChange={e => updateRecipient(i, 'label', e.target.value)}
                  placeholder="Navn (valgfritt)"
                  className="w-1/3 rounded-xl text-sm"
                />
                <Input
                  type="email"
                  value={rec.email}
                  onChange={e => updateRecipient(i, 'email', e.target.value)}
                  placeholder="epost@firma.no"
                  className="flex-1 rounded-xl text-sm"
                />
                {recipients.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeRecipient(i)} className="shrink-0 text-slate-400">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addRecipient} className="gap-2 text-slate-500 text-xs">
              <Plus className="h-3 w-3" /> Legg til mottaker
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button
              onClick={handleSend}
              disabled={sending || sent || !recipients.some(r => r.email?.includes('@'))}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {sent ? '✓ Sendt!' : sending ? 'Sender...' : <><Mail className="h-4 w-4" /> Send e-post</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}