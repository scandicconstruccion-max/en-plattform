import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import { FileText, Plus, Search, Filter, Download, AlertCircle, Send, Mail, ShoppingCart, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { formatAmount, formatNumber } from '@/components/shared/formatNumber';
import { downloadInvoicePDF } from '@/components/faktura/InvoicePDFGenerator';

export default function Faktura() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.filter({ status: 'godkjent' }),
    initialData: []
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list(),
    initialData: []
  });

  const availableDeviations = deviations.filter(d => 
    d.status === 'utfort' && 
    d.has_cost_consequence && 
    !d.invoice_id
  );

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: []
  });
  const company = companies?.[0];

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
    invoice.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.project_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || invoice.customer_id === customerFilter;
    const matchesProject = projectFilter === 'all' || invoice.project_id === projectFilter;

    const isPaid = invoice.status === 'betalt';
    const matchesPayment =
    paymentFilter === 'all' ||
    paymentFilter === 'betalt' && isPaid ||
    paymentFilter === 'ikke_betalt' && !isPaid;

    return matchesSearch && matchesStatus && matchesCustomer && matchesPayment && matchesProject;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'kladd').length,
    unpaid: invoices.filter((i) => i.status !== 'betalt' && i.status !== 'kladd' && i.status !== 'kreditert').length,
    overdue: invoices.filter((i) => {
      if (i.status === 'betalt' || i.status === 'kladd') return false;
      return new Date(i.due_date) < new Date();
    }).length,
    totalAmount: invoices.
    filter((i) => i.status !== 'kladd' && i.status !== 'kreditert').
    reduce((sum, i) => sum + (i.total_amount || 0), 0)
  };

  const toggleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectableInvoices = filteredInvoices.filter(inv => 
    inv.status === 'sendt' || inv.status === 'apnet' || inv.status === 'lastet_ned'
  );

  const handleBulkResend = async () => {
    const invoicesToSend = invoices.filter(inv => selectedInvoices.includes(inv.id));
    for (const invoice of invoicesToSend) {
      try {
        await base44.integrations.Core.SendEmail({
          to: invoice.sent_to_email || invoice.customer_email,
          subject: `Faktura ${invoice.invoice_number} - På nytt`,
          body: `Hei,\n\nDette er en påminnelse om faktura ${invoice.invoice_number}.\n\nBeløp: ${formatAmount(invoice.total_amount)}\nForfallsdato: ${format(new Date(invoice.due_date), 'dd.MM.yyyy')}\nKID: ${invoice.kid_number}\n\nVennligst betal innen forfallsdato.\n\nMed vennlig hilsen`
        });
      } catch (error) {
        console.error('Feil ved sending av faktura:', error);
      }
    }
    toast.success(`${selectedInvoices.length} faktura(er) sendt på nytt`);
    setSelectedInvoices([]);
  };

  const handleBulkDownload = () => {
    toast.info('Last ned funksjonalitet kommer snart');
    // TODO: Implement PDF generation and download
  };

  const handleBulkExternalSend = async () => {
    toast.info('Send til ekstern part funksjonalitet kommer snart');
    // TODO: Implement external party sending
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fakturaer</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Håndter fakturering og betalinger</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedInvoices.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkResend}
                  variant="outline"
                  className="rounded-xl gap-2">
                  <Send className="h-4 w-4" />
                  Send på nytt ({selectedInvoices.length})
                </Button>
                <Button
                  onClick={handleBulkDownload}
                  variant="outline"
                  className="rounded-xl gap-2">
                  <Download className="h-4 w-4" />
                  Last ned
                </Button>
                <Button
                  onClick={handleBulkExternalSend}
                  variant="outline"
                  className="rounded-xl gap-2">
                  <Mail className="h-4 w-4" />
                  Send til ekstern
                </Button>
              </div>
            )}
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Ny faktura
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Totalt</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Kladd</p>
              <p className="text-2xl font-bold text-blue-600">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Ubetalt</p>
              <p className="text-2xl font-bold text-amber-600">{stats.unpaid}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Forfalt</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Omsetning</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatAmount(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Søk faktura, kunde..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl" />

              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="kladd">Kladd</SelectItem>
                  <SelectItem value="sendt">Sendt</SelectItem>
                  <SelectItem value="betalt">Betalt</SelectItem>
                  <SelectItem value="forfalt">Forfalt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Kunde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kunder</SelectItem>
                  {customers.map((customer) =>
                  <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prosjekter</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Betaling" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="betalt">Betalt</SelectItem>
                  <SelectItem value="ikke_betalt">Ikke betalt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <div className="space-y-3">
          {filteredInvoices.length === 0 ?
          <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Ingen fakturaer funnet
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Opprett din første faktura for å komme i gang
                </p>
              </CardContent>
            </Card> :

          filteredInvoices.map((invoice) => {
            const isOverdue = new Date(invoice.due_date) < new Date() &&
            invoice.status !== 'betalt' &&
            invoice.status !== 'kladd';

            const canSelect = invoice.status === 'sendt' || invoice.status === 'apnet' || invoice.status === 'lastet_ned';
            
            return (
              <Card key={invoice.id} className="border-0 shadow-sm dark:bg-slate-900 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {canSelect && (
                      <div className="flex items-center pt-2">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <Link
                      to={createPageUrl(`FakturaDetaljer?id=${invoice.id}`)}
                      className="flex-1">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {invoice.invoice_number || 'N/A'}
                            </span>
                            <StatusBadge status={invoice.status} />
                            {isOverdue &&
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                <AlertCircle className="h-3 w-3" />
                                Forfalt
                              </span>
                          }
                            {invoice.is_credit_note &&
                          <span className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                                Kreditnota
                              </span>
                          }
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Kunde:</span>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {invoice.customer_name}
                              </p>
                            </div>
                            {invoice.project_name &&
                          <div>
                                <span className="text-slate-500 dark:text-slate-400">Prosjekt:</span>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {invoice.project_name}
                                </p>
                              </div>
                          }
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Fakturadato:</span>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Forfallsdato:</span>
                              <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                                {format(new Date(invoice.due_date), 'dd.MM.yyyy')}
                              </p>
                            </div>
                          </div>
                          {invoice.kid_number &&
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                              KID: {invoice.kid_number}
                            </div>
                        }
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatAmount(invoice.total_amount)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            eks. mva: {formatAmount(invoice.amount_excluding_vat)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>);

          })
          }
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-2xl">Opprett ny faktura</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Velg hvordan du vil opprette fakturaen
              </p>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Link to={createPageUrl('FakturaDetaljer?new=manual')} className="group">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-300 h-full p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      Manuell faktura
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Opprett en faktura fra bunnen av med full kontroll over alle detaljer
                    </p>
                  </div>
                </div>
              </Link>
              <Link to={createPageUrl('FakturaDetaljer?new=order')} className="group">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 h-full p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                      <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      Fra ordre
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Velg en godkjent ordre og generer faktura automatisk
                    </p>
                  </div>
                </div>
              </Link>
              <Link to={createPageUrl('FakturaDetaljer?new=deviation')} className="group">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all duration-300 h-full p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                      <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      Fra avvik
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Velg et utført avvik med kostnad og opprett faktura
                    </p>
                    {availableDeviations.length > 0 && (
                      <div className="mt-3 text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {availableDeviations.length} avvik tilgjengelig
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}