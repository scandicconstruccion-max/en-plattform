import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { generateEmailHTML } from '@/components/shared/generateEmailHTML';

export default function SendMottakDialog({ open, onOpenChange, selectedMottaks, mottakList, projects }) {
  const [recipients, setRecipients] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }) => {
      return base44.integrations.Core.SendEmail({
        to,
        subject,
        body
      });
    }
  });

  const addEmailRecipient = () => {
    if (!emailInput.trim()) return;
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ugyldig e-postadresse');
      return;
    }
    if (recipients.includes(email)) {
      toast.error('E-postadresse allerede lagt til');
      return;
    }
    setRecipients([...recipients, email]);
    setEmailInput('');
  };

  const addEmployeeRecipient = () => {
    if (!selectedEmployee) return;
    const employee = employees.find(e => e.email === selectedEmployee);
    if (!employee) return;
    if (recipients.includes(employee.email)) {
      toast.error('E-postadresse allerede lagt til');
      setSelectedEmployee('');
      return;
    }
    setRecipients([...recipients, employee.email]);
    setSelectedEmployee('');
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Legg til minst én mottaker');
      return;
    }

    try {
      const promises = recipients.map(async (recipientEmail) => {
        for (const mottakId of selectedMottaks) {
          const mottak = mottakList.find(m => m.id === mottakId);
          if (!mottak) continue;

          const project = projects.find(p => p.id === mottak.project_id);
          const projectName = project?.name || 'Ukjent prosjekt';

          const subject = `Mottakskontroll for ${projectName}`;
          
          const emailBody = generateEmailHTML({
            title: 'Mottakskontroll',
            content: `
              <p style="margin-bottom: 15px;">En mottakskontroll for prosjekt <strong>${projectName}</strong> sendes til deg.</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #10b981;">Detaljer</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; width: 40%;">Leverandør:</td>
                    <td style="padding: 8px 0;">${mottak.leverandor || '-'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Ordre/Lev.nr:</td>
                    <td style="padding: 8px 0;">${mottak.ordre_leveransenummer || '-'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Beskrivelse:</td>
                    <td style="padding: 8px 0;">${mottak.beskrivelse_leveranse || '-'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Kontrollert:</td>
                    <td style="padding: 8px 0;">${mottak.kontrollert ? 'Ja' : 'Nei'}</td>
                  </tr>
                  ${mottak.har_avvik ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 0;">
                      <div style="background-color: #fee; padding: 12px; border-radius: 6px; border-left: 4px solid #dc2626;">
                        <strong style="color: #dc2626;">Avvik registrert</strong><br/>
                        ${mottak.avvik_beskrivelse || ''}
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            `,
            companyName: company?.name,
            companyLogo: company?.logo_url
          });

          await sendEmailMutation.mutateAsync({
            to: recipientEmail,
            subject,
            body: emailBody
          });
        }
      });

      await Promise.all(promises);

      toast.success(`Mottakskontroll sendt til ${recipients.length} mottaker(e)`);
      setRecipients([]);
      setEmailInput('');
      setSelectedEmployee('');
      onOpenChange(false);
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Feil ved sending av e-post');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send mottakskontroll</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Skriv inn e-postadresse</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type="email"
                placeholder="navn@eksempel.no"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmailRecipient())}
                className="rounded-xl"
              />
              <Button
                type="button"
                onClick={addEmailRecipient}
                size="icon"
                variant="outline"
                className="rounded-xl shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Eller velg ansatt</Label>
            <div className="flex gap-2 mt-1.5">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.email}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={addEmployeeRecipient}
                size="icon"
                variant="outline"
                className="rounded-xl shrink-0"
                disabled={!selectedEmployee}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {recipients.length > 0 && (
            <div>
              <Label className="mb-2 block">Mottakere ({recipients.length})</Label>
              <div className="flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    <Mail className="h-3 w-3" />
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{selectedMottaks.length}</strong> mottakskontroll(er) vil bli sendt til{' '}
              <strong>{recipients.length}</strong> mottaker(e).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSend}
            disabled={recipients.length === 0 || sendEmailMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            {sendEmailMutation.isPending ? 'Sender...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}