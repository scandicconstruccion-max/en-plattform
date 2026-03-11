import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SendAvvikDialog({ deviation, isOpen, onClose, onSent }) {
  const [email, setEmail] = useState(deviation?.sent_to_email || '');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email || !message.trim()) {
      toast.error('Vennligst fyll inn e-post og melding');
      return;
    }

    setIsSending(true);
    try {
      // Generate approval token
      const approvalToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create approval URL (user can customize this)
      const approvalUrl = `${window.location.origin}/ApproveDeviation?token=${approvalToken}&deviationId=${deviation.id}`;

      // Update deviation with approval token and activity log
      const newActivityLog = deviation.activity_log || [];
      const user = await base44.auth.me();
      newActivityLog.push({
        action: 'sendt_kunde',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: `Avvik sendt til ${email}`
      });

      await base44.entities.Deviation.update(deviation.id, {
        approval_token: approvalToken,
        sent_to_customer: true,
        sent_to_email: email,
        sent_date: new Date().toISOString(),
        status: 'sendt_kunde',
        activity_log: newActivityLog
      });

      // Send email
      const emailBody = `
Hei,

${message}

Avvik: ${deviation.title}
Beskrivelse: ${deviation.description}
Kostnad: ${deviation.cost_amount} Kr

Vennligst godkjenn eller avvis avviket ved å klikke linken nedenfor:
${approvalUrl}

Med vennlig hilsen
${user.full_name}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Godkjenning av avvik: ${deviation.title}`,
        body: emailBody,
        from_name: 'Avvik-system'
      });

      toast.success('Avvik sendt til kunde');
      setEmail('');
      setMessage('');
      onSent();
      onClose();
    } catch (error) {
      console.error('Feil ved sending:', error);
      toast.error('Feil ved sending av avvik');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send avvik til kunde</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1">
          <div>
            <Label>Kunde e-post</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@example.com"
            />
          </div>
          
          <div>
            <Label>Melding</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Legg inn melding til kunden..."
              rows={4}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <strong>Avvik:</strong> {deviation.title}<br />
            <strong>Kostnad:</strong> {deviation.cost_amount} Kr<br />
            Kunde vil motta e-post med godkjenningslenke.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 flex-wrap mt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
            {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send til kunde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}