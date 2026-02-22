import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ViewDeviationsDialog({ open, onOpenChange, selectedDeviations, deviationList, projects }) {
  const [recipients, setRecipients] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: open
  });

  const sendMutation = useMutation({
    mutationFn: async (emailList) => {
      const promises = emailList.map(async (email) => {
        for (const deviationId of selectedDeviations) {
          const deviation = deviationList.find(d => d.id === deviationId);
          const project = projects.find(p => p.id === deviation?.project_id);
          
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Avvik - ${project?.name || 'Prosjekt'}`,
            body: `
              <h2>Avvik</h2>
              <p><strong>Prosjekt:</strong> ${project?.name || 'Ukjent'}</p>
              <p><strong>Tittel:</strong> ${deviation.title || 'Ingen tittel'}</p>
              <p><strong>Alvorlighetsgrad:</strong> ${deviation.severity}</p>
              <p><strong>Status:</strong> ${deviation.status}</p>
              <br>
              <p>Se vedlagt avvik for mer informasjon.</p>
            `
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(`Avvik sendt til ${recipients.length} mottaker(e)`);
      setRecipients([]);
      setEmailInput('');
      setSelectedEmployee('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Feil ved sending av e-post');
    }
  });

  const addEmailRecipient = () => {
    if (emailInput && emailInput.includes('@')) {
      if (!recipients.includes(emailInput)) {
        setRecipients([...recipients, emailInput]);
      }
      setEmailInput('');
    }
  };

  const addEmployeeRecipient = () => {
    if (selectedEmployee) {
      const employee = employees.find(e => e.id === selectedEmployee);
      if (employee?.email && !recipients.includes(employee.email)) {
        setRecipients([...recipients, employee.email]);
      }
      setSelectedEmployee('');
    }
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSend = () => {
    if (recipients.length === 0) {
      toast.error('Legg til minst én mottaker');
      return;
    }

    const projectNames = [...new Set(selectedDeviations.map(id => {
      const deviation = deviationList.find(d => d.id === id);
      const project = projects.find(p => p.id === deviation?.project_id);
      return project?.name || 'Ukjent';
    }))].join(', ');

    toast.info(`Avvik for prosjekt ${projectNames} sendes...`);
    sendMutation.mutate(recipients);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Se avvik</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Sender {selectedDeviations.length} avvik
          </p>

          {/* Manual Email Input */}
          <div className="space-y-2">
            <Label>E-postadresse</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="navn@eksempel.no"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
              />
              <Button onClick={addEmailRecipient} variant="outline">
                Legg til
              </Button>
            </div>
          </div>

          {/* Employee Selector */}
          <div className="space-y-2">
            <Label>Velg ansatt</Label>
            <div className="flex gap-2">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addEmployeeRecipient} variant="outline">
                Legg til
              </Button>
            </div>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label>Mottakere ({recipients.length})</Label>
              <div className="flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                    <button onClick={() => removeRecipient(email)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={recipients.length === 0 || sendMutation.isPending}
          >
            {sendMutation.isPending ? 'Sender...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}