import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const generateQuotePDFBlob = async (quote) => {
  const element = document.createElement('div');
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.innerHTML = `
    <div style="padding: 40px; font-family: Arial, sans-serif; max-width: 800px; background: white;">
      <div style="border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 24px;">Tilbud ${quote.quote_number || ''}</h2>
        <p style="color: #64748b; margin: 0;">${format(new Date(), 'd. MMMM yyyy', { locale: nb })}</p>
      </div>
      <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
        <h3 style="color: #1e293b; margin: 0 0 10px 0;">Kunde</h3>
        <p style="margin: 3px 0;"><strong>${quote.customer_name}</strong></p>
        ${quote.customer_email ? `<p style="margin: 3px 0; color: #64748b;">${quote.customer_email}</p>` : ''}
        ${quote.customer_phone ? `<p style="margin: 3px 0; color: #64748b;">${quote.customer_phone}</p>` : ''}
      </div>
      ${quote.project_description ? `<div style="margin-bottom: 30px;"><h3 style="color: #1e293b; margin: 0 0 10px 0;">Prosjektbeskrivelse</h3><p style="color: #334155; line-height: 1.6;">${quote.project_description}</p></div>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead><tr style="background: #10b981; color: white;">
          <th style="padding: 12px; text-align: left;">Beskrivelse</th>
          <th style="padding: 12px; text-align: center;">Mengde</th>
          <th style="padding: 12px; text-align: center;">Enhet</th>
          <th style="padding: 12px; text-align: right;">Enhetspris</th>
          <th style="padding: 12px; text-align: right;">Sum</th>
        </tr></thead>
        <tbody>
          ${(quote.items || []).map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px;">${item.description}</td>
              <td style="padding: 12px; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; text-align: center;">${item.unit || 'stk'}</td>
              <td style="padding: 12px; text-align: right;">${(item.unit_price || 0).toLocaleString('nb-NO')} kr</td>
              <td style="padding: 12px; text-align: right; font-weight: 600;">${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('nb-NO')} kr</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align: right; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 8px 0;">Subtotal: <strong>${(quote.total_amount || 0).toLocaleString('nb-NO')} kr</strong></p>
        <p style="margin: 8px 0;">MVA (25%): <strong>${(quote.vat_amount || 0).toLocaleString('nb-NO')} kr</strong></p>
        <p style="margin: 0; font-size: 18px;">Totalt: <strong>${((quote.total_amount || 0) + (quote.vat_amount || 0)).toLocaleString('nb-NO')} kr</strong></p>
      </div>
    </div>
  `;
  document.body.appendChild(element);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
  document.body.removeChild(element);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  return pdf.output('blob');
};

export default function FetchQuoteDialog({ open, onOpenChange, existingQuotes, customers }) {
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    phase: 'sendt',
    next_followup_date: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.QuoteFollowUp.create({
        ...data,
        responsible_name: user?.full_name || user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
      onOpenChange(false);
      setSelectedQuote(null);
      setSearch('');
      setFormData({ phase: 'sendt', next_followup_date: '' });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;

    const customer = customers.find(c => 
      c.name === selectedQuote.customer_name || 
      c.email === selectedQuote.customer_email
    );

    const baseData = {
      customer_id: customer?.id || '',
      customer_name: selectedQuote.customer_name,
      quote_reference: selectedQuote.quote_number,
      quote_amount: selectedQuote.total_amount,
      sent_date: selectedQuote.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      responsible_user: user?.email || '',
      phase: formData.phase,
      next_followup_date: formData.next_followup_date,
      internal_quote_id: selectedQuote.id,
      description: selectedQuote.project_description,
      documents: []
    };

    // Close dialog immediately
    onOpenChange(false);
    setSelectedQuote(null);
    setSearch('');
    setFormData({ phase: 'sendt', next_followup_date: '' });

    // Create the follow-up first without PDF
    const created = await base44.entities.QuoteFollowUp.create({
      ...baseData,
      responsible_name: user?.full_name || user?.email
    });
    queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });

    // Then upload PDF in background and update
    try {
      const pdfBlob = await generateQuotePDFBlob(selectedQuote);
      const file = new File([pdfBlob], `Tilbud-${selectedQuote.quote_number || 'ukjent'}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.QuoteFollowUp.update(created.id, { documents: [file_url] });
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
    } catch (err) {
      console.error('PDF upload failed', err);
    }
  };

  const filteredQuotes = existingQuotes.filter(q => {
    return q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
           q.quote_number?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hent tilbud fra modulen</DialogTitle>
        </DialogHeader>

        {!selectedQuote ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk etter tilbud..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredQuotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Ingen tilbud funnet</p>
                </div>
              ) : (
                filteredQuotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">
                            {quote.customer_name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {quote.quote_number}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {quote.total_amount?.toLocaleString('nb-NO')} kr
                        </p>
                        {quote.project_description && (
                          <p className="text-sm text-slate-500 line-clamp-2">
                            {quote.project_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Kunde</p>
                  <p className="font-medium">{selectedQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tilbudsnummer</p>
                  <p className="font-medium">{selectedQuote.quote_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Beløp</p>
                  <p className="font-medium">{selectedQuote.total_amount?.toLocaleString('nb-NO')} kr</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Opprettet</p>
                  <p className="font-medium">
                    {selectedQuote.created_date && format(parseISO(selectedQuote.created_date), 'dd.MM.yyyy', { locale: nb })}
                  </p>
                </div>
              </div>
            </Card>

            <div>
              <Label>Fase *</Label>
              <Select
                value={formData.phase}
                onValueChange={(v) => setFormData({...formData, phase: v})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sendt">Sendt</SelectItem>
                  <SelectItem value="under_vurdering">Under vurdering</SelectItem>
                  <SelectItem value="godkjent">Godkjent</SelectItem>
                  <SelectItem value="avslatt">Avslått</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Neste oppfølging</Label>
              <Input
                type="date"
                value={formData.next_followup_date}
                onChange={(e) => setFormData({...formData, next_followup_date: e.target.value})}
                className="mt-1.5 rounded-xl"
              />
              <p className="text-xs text-slate-500 mt-1">
                Du vil få varsel dagen før og på dagen hvis ikke markert som fullført
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedQuote(null)} 
                className="rounded-xl"
              >
                Tilbake
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Legger til...' : 'Legg til i oppfølging'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}