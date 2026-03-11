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
import { generateChangeEmailHTML } from '@/components/shared/generateEmailHTML';
import { generateApprovalToken, buildApprovalUrl } from '@/components/shared/approvalEmailTemplate';

export default function SendEndringsmeldingerDialog({ open, onOpenChange, selectedChanges, changeList, projects, getProjectName, changeTypeLabels }) {
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
        for (const changeId of selectedChanges) {
          const change = changeList.find(c => c.id === changeId);
          const project = projects.find(p => p.id === change?.project_id);

          // Generer token og lagre på endringsmeldingen
          const token = generateApprovalToken();
          await base44.entities.ChangeNotification.update(changeId, { approval_token: token });

          const approvalUrl = buildApprovalUrl('change', changeId, token);
          const htmlBody = generateChangeEmailHTML(change, project, approvalUrl);

          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Endringsmelding til godkjenning: ${change?.title || 'Ukjent'}`,
            body: htmlBody,
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(`Endringsmelding sendt til ${recipients.length} mottaker(e)`);
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

    const projectNames = [...new Set(selectedChanges.map(id => {
      const change = changeList.find(c => c.id === id);
      const project = projects.find(p => p.id === change?.project_id);
      return project?.name || 'Ukjent';
    }))].join(', ');

    toast.info(`Endringsmelding for prosjekt ${projectNames} sendes på nytt...`);
    sendMutation.mutate(recipients);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send endringsmelding på nytt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Sender {selectedChanges.length} endringsmelding(er)
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
                  {employees.filter(e => e.is_active !== false).map(emp => (
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