import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

export default function QuoteFollowUpDialog({ open, onOpenChange, customers }) {
  const [formData, setFormData] = useState({
    customer_id: '',
    quote_reference: '',
    quote_amount: '',
    sent_date: '',
    responsible_user: '',
    phase: 'utarbeidet',
    next_followup_date: '',
    description: '',
    documents: []
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (open && user) {
      setFormData(prev => ({
        ...prev,
        responsible_user: user.email,
        sent_date: new Date().toISOString().split('T')[0]
      }));
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const customer = customers.find(c => c.id === data.customer_id);
      return base44.entities.QuoteFollowUp.create({
        ...data,
        customer_name: customer?.name || '',
        responsible_name: user?.full_name || user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: '',
      quote_reference: '',
      quote_amount: '',
      sent_date: new Date().toISOString().split('T')[0],
      responsible_user: user?.email || '',
      phase: 'utarbeidet',
      next_followup_date: '',
      description: '',
      documents: []
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quote_amount: parseFloat(formData.quote_amount) || 0
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        documents: [...formData.documents, file_url]
      });
    } catch (error) {
      alert('Feil ved opplasting av fil');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nytt tilbud for oppfølging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Kunde *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(v) => setFormData({...formData, customer_id: v})}
              required
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Velg kunde..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tilbudsnummer *</Label>
              <Input
                value={formData.quote_reference}
                onChange={(e) => setFormData({...formData, quote_reference: e.target.value})}
                placeholder="TIL-2024-001"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Tilbudsbeløp *</Label>
              <Input
                type="number"
                value={formData.quote_amount}
                onChange={(e) => setFormData({...formData, quote_amount: e.target.value})}
                placeholder="100000"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dato for utsendelse *</Label>
              <Input
                type="date"
                value={formData.sent_date}
                onChange={(e) => setFormData({...formData, sent_date: e.target.value})}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
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
                  <SelectItem value="utarbeidet">Utarbeidet</SelectItem>
                  <SelectItem value="sendt">Sendt</SelectItem>
                  <SelectItem value="under_vurdering">Under vurdering</SelectItem>
                  <SelectItem value="godkjent">Godkjent</SelectItem>
                  <SelectItem value="avslatt">Avslått</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div>
            <Label>Beskrivelse</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Kort beskrivelse av tilbudet..."
              rows={3}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Dokumenter</Label>
            <div className="mt-1.5">
              <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <Upload className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">
                  {uploading ? 'Laster opp...' : 'Last opp dokument'}
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
              {formData.documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.documents.map((doc, idx) => (
                    <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                      <span>📄 Dokument {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          documents: formData.documents.filter((_, i) => i !== idx)
                        })}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Fjern
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {createMutation.isPending ? 'Oppretter...' : 'Opprett tilbud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}