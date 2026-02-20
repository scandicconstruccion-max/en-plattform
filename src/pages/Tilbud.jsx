import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import { FileSpreadsheet, Search, Plus, Trash2, User, Mail, Phone, Download, Send } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Tilbud() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    quote_number: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    project_description: '',
    items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0 }],
    valid_until: ''
  });

  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.Quote.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setSelectedQuotes([]);
      setDeleteDialogOpen(false);
      toast.success('Tilbud slettet');
    },
    onError: () => {
      toast.error('Kunne ikke slette tilbud');
    }
  });

  const resetForm = () => {
    setFormData({
      quote_number: `T-${Date.now().toString().slice(-6)}`,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      project_description: '',
      items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0 }],
      valid_until: ''
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit: 'stk', unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = calculateTotal(formData.items);
    const vat = total * 0.25;
    createMutation.mutate({
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        total: item.quantity * item.unit_price
      })),
      total_amount: total,
      vat_amount: vat,
      status: 'utkast'
    });
  };

  const handleSendEmail = (quote) => {
    setSelectedQuote(quote);
    setShowEmailDialog(true);
  };

  const handleEmailSent = (updateData) => {
    updateMutation.mutate({ 
      id: selectedQuote.id, 
      data: updateData 
    });
    setSelectedQuote(null);
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      return q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
             q.quote_number?.toLowerCase().includes(search.toLowerCase());
    });
  }, [quotes, search]);

  const toggleSelectQuote = (quoteId) => {
    setSelectedQuotes(prev =>
      prev.includes(quoteId) ? prev.filter(id => id !== quoteId) : [...prev, quoteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map(q => q.id));
    }
  };

  const handleBulkSend = async () => {
    const quotesToSend = quotes.filter(q => selectedQuotes.includes(q.id));
    for (const quote of quotesToSend) {
      handleSendEmail(quote);
    }
    toast.success(`Sender ${quotesToSend.length} tilbud`);
    setSelectedQuotes([]);
  };

  const handleBulkDownload = async () => {
    const quotesToDownload = quotes.filter(q => selectedQuotes.includes(q.id));
    for (const quote of quotesToDownload) {
      await generatePDF(quote);
    }
    toast.success(`Lastet ned ${quotesToDownload.length} tilbud`);
  };

  const handleDelete = () => {
    deleteMutation.mutate(selectedQuotes);
  };

  const generatePDF = async (quote) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif;">
        <h1 style="color: #1e293b; margin-bottom: 10px;">Tilbud #${quote.quote_number}</h1>
        <p style="color: #64748b; margin-bottom: 30px;">${format(new Date(), 'd. MMMM yyyy', { locale: nb })}</p>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; margin-bottom: 10px;">Kunde</h3>
          <p>${quote.customer_name}</p>
          ${quote.customer_email ? `<p>${quote.customer_email}</p>` : ''}
          ${quote.customer_phone ? `<p>${quote.customer_phone}</p>` : ''}
        </div>

        ${quote.project_description ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin-bottom: 10px;">Prosjekt</h3>
            <p>${quote.project_description}</p>
          </div>
        ` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Beskrivelse</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Antall</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Enhetspris</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Totalt</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items?.map(item => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity} ${item.unit}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${item.unit_price.toLocaleString('nb-NO')} kr</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${(item.quantity * item.unit_price).toLocaleString('nb-NO')} kr</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align: right; margin-bottom: 10px;">
          <p><strong>Subtotal:</strong> ${(quote.total_amount || 0).toLocaleString('nb-NO')} kr</p>
          <p><strong>MVA (25%):</strong> ${(quote.vat_amount || 0).toLocaleString('nb-NO')} kr</p>
          <p style="font-size: 20px; color: #1e293b;"><strong>Totalt:</strong> ${((quote.total_amount || 0) + (quote.vat_amount || 0)).toLocaleString('nb-NO')} kr</p>
        </div>

        ${quote.valid_until ? `<p style="color: #64748b; margin-top: 30px;">Gyldig til ${format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: nb })}</p>` : ''}
      </div>
    `;
    
    document.body.appendChild(element);
    const canvas = await html2canvas(element);
    document.body.removeChild(element);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`tilbud-${quote.quote_number}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Tilbud"
        subtitle={`${quotes.length} tilbud totalt`}
        actions={
          <div className="flex gap-2">
            {selectedQuotes.length > 0 && (
              <>
                <Button 
                  variant="outline"
                  onClick={handleBulkSend}
                  className="rounded-xl gap-2"
                >
                  <Send className="h-4 w-4" /> Send ({selectedQuotes.length})
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleBulkDownload}
                  className="rounded-xl gap-2"
                >
                  <Download className="h-4 w-4" /> Last ned
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Slett
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedQuotes([])}
                  className="rounded-xl"
                >
                  Avbryt
                </Button>
              </>
            )}
            <Button 
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" /> Nytt tilbud
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk etter tilbud..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Quotes List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredQuotes.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Ingen tilbud"
            description="Opprett tilbud til dine kunder"
            actionLabel="Nytt tilbud"
            onAction={() => {
              resetForm();
              setShowDialog(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Bulk Select Header */}
            {filteredQuotes.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200">
                <Checkbox
                  checked={selectedQuotes.length === filteredQuotes.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-slate-600">
                  {selectedQuotes.length > 0 ? `${selectedQuotes.length} valgt` : 'Velg alle'}
                </span>
              </div>
            )}

            <div className="grid gap-4">
              {filteredQuotes.map((quote) => (
                <Card
                  key={quote.id}
                  className="p-4 border-0 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedQuotes.includes(quote.id)}
                        onCheckedChange={() => toggleSelectQuote(quote.id)}
                      />
                    </div>

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedQuote(quote);
                        setShowDetailDialog(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">#{quote.quote_number}</h3>
                            <StatusBadge status={quote.status} />
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{quote.customer_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {quote.created_date && format(new Date(quote.created_date), 'd. MMM yyyy', { locale: nb })}
                            {quote.valid_until && ` • Gyldig til ${format(new Date(quote.valid_until), 'd. MMM', { locale: nb })}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {(quote.total_amount || 0).toLocaleString('nb-NO')} kr
                          </p>
                          <p className="text-xs text-slate-500">eks. mva</p>
                        </div>
                      </div>

                      {/* Delivery Status */}
                      <DeliveryStatus item={quote} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nytt tilbud</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kundenavn *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-post</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gyldig til</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prosjektbeskrivelse</Label>
                <Textarea
                  value={formData.project_description}
                  onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <Label>Linjer</Label>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input
                        placeholder="Beskrivelse"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Antall"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Enhet"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Enhetspris"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                          updateMutation.mutate({ id: quote.id, data: { status: 'godkjent' } });
                        }}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      >
                        Godkjent
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nytt tilbud</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Tilbudsnummer</Label>
                <Input
                  value={formData.quote_number}
                  onChange={(e) => setFormData({...formData, quote_number: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Gyldig til</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label>Kundenavn *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  placeholder="Firma eller privatperson"
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label>Prosjektbeskrivelse</Label>
                <Textarea
                  value={formData.project_description}
                  onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  placeholder="Kort beskrivelse av arbeidet..."
                  rows={2}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Linjer</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-1" />
                  Legg til linje
                </Button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[40%]">Beskrivelse</TableHead>
                      <TableHead className="w-[15%]">Antall</TableHead>
                      <TableHead className="w-[15%]">Enhet</TableHead>
                      <TableHead className="w-[15%]">Pris</TableHead>
                      <TableHead className="w-[15%] text-right">Sum</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Beskrivelse"
                            className="border-0 p-0 h-8 focus-visible:ring-0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(item.quantity * item.unit_price).toLocaleString('nb-NO')}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={formData.items.length === 1}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Totals */}
              <div className="mt-4 space-y-2 text-right">
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">Sum eks. mva:</span>
                  <span className="font-medium w-32">{calculateTotal(formData.items).toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">MVA (25%):</span>
                  <span className="font-medium w-32">{(calculateTotal(formData.items) * 0.25).toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8 pt-2 border-t">
                  <span className="font-semibold">Totalt ink. mva:</span>
                  <span className="font-bold w-32">{(calculateTotal(formData.items) * 1.25).toLocaleString('nb-NO')} kr</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Opprett tilbud'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tilbud #{selectedQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{selectedQuote.customer_name}</span>
                </div>
                {selectedQuote.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{selectedQuote.customer_email}</span>
                  </div>
                )}
                {selectedQuote.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{selectedQuote.customer_phone}</span>
                  </div>
                )}
              </div>

              {selectedQuote.project_description && (
                <div>
                  <Label className="text-slate-500">Prosjektbeskrivelse</Label>
                  <p className="mt-1">{selectedQuote.project_description}</p>
                </div>
              )}

              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Beskrivelse</TableHead>
                      <TableHead className="text-right">Antall</TableHead>
                      <TableHead className="text-right">Pris</TableHead>
                      <TableHead className="text-right">Sum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuote.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.unit_price?.toLocaleString('nb-NO')} kr</TableCell>
                        <TableCell className="text-right font-medium">{item.total?.toLocaleString('nb-NO')} kr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-right">
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">Sum eks. mva:</span>
                  <span className="font-medium w-32">{selectedQuote.total_amount?.toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">MVA (25%):</span>
                  <span className="font-medium w-32">{selectedQuote.vat_amount?.toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8 pt-2 border-t">
                  <span className="font-semibold">Totalt ink. mva:</span>
                  <span className="font-bold w-32">{((selectedQuote.total_amount || 0) + (selectedQuote.vat_amount || 0)).toLocaleString('nb-NO')} kr</span>
                </div>
              </div>

              {/* Delivery Status */}
              <DeliveryStatus item={selectedQuote} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="tilbud"
        item={selectedQuote}
        defaultEmail={selectedQuote?.customer_email || ''}
        onSent={handleEmailSent}
      />
    </div>
  );
}