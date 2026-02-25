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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedQuote) return;

    // Find customer
    const customer = customers.find(c => 
      c.name === selectedQuote.customer_name || 
      c.email === selectedQuote.customer_email
    );

    createMutation.mutate({
      customer_id: customer?.id || '',
      customer_name: selectedQuote.customer_name,
      quote_reference: selectedQuote.quote_number,
      quote_amount: selectedQuote.total_amount,
      sent_date: selectedQuote.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      responsible_user: user?.email || '',
      phase: formData.phase,
      next_followup_date: formData.next_followup_date,
      internal_quote_id: selectedQuote.id,
      description: selectedQuote.project_description
    });
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