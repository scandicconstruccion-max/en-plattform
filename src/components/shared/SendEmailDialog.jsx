import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateOrderEmailHTML, generateQuoteEmailHTML } from './generateEmailHTML';

export default function SendEmailDialog({ 
  open, 
  onOpenChange, 
  type, // 'avvik' | 'tilbud' | 'endringsmelding'
  item,
  defaultEmail,
  onSent 
}) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  React.useEffect(() => {
    if (open && item) {
      setEmail(defaultEmail || item.customer_email || item.sent_to_email || '');
      const typeLabels = {
        avvik: 'Avvik',
        tilbud: 'Tilbud',
        endringsmelding: 'Endringsmelding',
        ordre: 'Ordre'
      };
      setSubject(`${typeLabels[type]}: ${item.title || item.quote_number || item.order_number || ''}`);
      setMessage(getDefaultMessage());
    }
  }, [open, item, type, defaultEmail]);

  const getDefaultMessage = () => {
    if (type === 'avvik') {
      return `Hei,\n\nVedlagt finner du avviksrapport for: ${item?.title}\n\nKategori: ${item?.category || 'Ikke spesifisert'}\nAlvorlighetsgrad: ${item?.severity || 'Ikke spesifisert'}\n\nBeskrivelse:\n${item?.description || 'Ingen beskrivelse'}\n\n${item?.has_cost_consequence ? `Kostnadskonsekvens: ${item?.cost_amount?.toLocaleString('nb-NO')} kr\n` : ''}\nMed vennlig hilsen`;
    } else if (type === 'tilbud') {
      return `Hei,\n\nVedlagt finner du tilbud ${item?.quote_number}.\n\nTotal sum: ${item?.total_amount?.toLocaleString('nb-NO')} kr eks. mva\nGyldig til: ${item?.valid_until || 'Ikke spesifisert'}\n\nBeskrivelse:\n${item?.project_description || 'Ingen beskrivelse'}\n\nMed vennlig hilsen`;
    } else if (type === 'ordre') {
      const approvalUrl = `${window.location.origin}/approve-order/${item?.approval_token}`;
      return `Hei,\n\nDu har mottatt en ny ordre:\n\nOrdrenummer: ${item?.order_number}\nBeskrivelse: ${item?.description || 'Ingen beskrivelse'}\nTotalbeløp: kr ${item?.total_amount?.toFixed(2) || '0.00'}\nForfall: ${item?.due_date || 'Ikke satt'}\n\nFor å godkjenne ordren, klikk på lenken nedenfor:\n${approvalUrl}\n\nMed vennlig hilsen`;
    } else {
      const typeLabels = { tillegg: 'Tillegg', fradrag: 'Fradrag', endring: 'Endring' };
      return `Hei,\n\nVedlagt finner du endringsmelding: ${item?.title}\n\nType: ${typeLabels[item?.change_type] || 'Endring'}\nBeløp: ${item?.amount?.toLocaleString('nb-NO')} kr\n\nBeskrivelse:\n${item?.description || 'Ingen beskrivelse'}\n\nMed vennlig hilsen`;
    }
  };

  const handleSend = async () => {
    if (!email) {
      toast.error('Vennligst fyll inn e-postadresse');
      return;
    }

    setSending(true);
    
    try {
      let approvalToken = item?.approval_token;
      
      // Generate approval token if not exists and type is ordre or tilbud
      if ((type === 'ordre' || type === 'tilbud') && !approvalToken) {
        approvalToken = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Generate approval URL
      const approvalUrl = (type === 'ordre' || type === 'tilbud') 
        ? `${window.location.origin}/${type === 'ordre' ? 'approve-order' : 'approve-quote'}?token=${approvalToken}`
        : null;

      // Generate HTML email for ordre and tilbud
      let htmlBody = null;
      if (type === 'ordre' && approvalUrl) {
        htmlBody = generateOrderEmailHTML({ ...item, approval_token: approvalToken }, approvalUrl);
      } else if (type === 'tilbud' && approvalUrl) {
        htmlBody = generateQuoteEmailHTML({ ...item, approval_token: approvalToken }, approvalUrl);
      }

      const now = new Date().toISOString();
      const updateData = {
        sent_to_customer: true,
        sent_date: now,
        sent_to_email: email,
        delivery_confirmed: true,
        delivery_confirmed_date: now,
        ...(approvalToken ? { approval_token: approvalToken } : {}),
        ...(type === 'tilbud' || type === 'ordre' ? { status: 'sendt' } : {})
      };

      const entityTypeMap = { tilbud: 'Quote', ordre: 'Order', avvik: 'Deviation', endringsmelding: 'ChangeNotification' };

      // Send via backend function (Resend) which supports external emails
      const response = await base44.functions.invoke('sendEmail', {
        toEmail: email,
        subject: subject,
        body: htmlBody || message.replace(/\n/g, '<br>'),
        entityType: entityTypeMap[type],
        entityId: item?.id,
        updateData
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      onSent(updateData);

      toast.success('E-post sendt!', {
        description: `Sendt til ${email}`
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('Kunne ikke sende e-post', {
        description: error.message
      });
    } finally {
      setSending(false);
    }
  };

  const typeLabels = {
    avvik: 'avvik',
    tilbud: 'tilbud',
    endringsmelding: 'endringsmelding',
    ordre: 'ordre'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            Send {typeLabels[type]} på e-post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Mottaker e-post *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@firma.no"
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Emne</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Melding</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="rounded-xl"
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sending || !email}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Sender...' : 'Send e-post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}