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
  DialogFooter } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import CustomerDialog from '@/components/crm/CustomerDialog';
import { FileSpreadsheet, Search, Plus, Trash2, User, Mail, Phone, Download, Send, ChevronDown, ChevronUp, Copy, FileEdit, X, CheckCircle, FileText, Users, LayoutGrid, List } from 'lucide-react';
import CustomerSelector, { NewCustomerDialog } from '@/components/tilbud/CustomerSelector';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateQuotePDF } from '@/components/tilbud/QuotePDFGenerator';

export default function Tilbud() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showRejectedQuotes, setShowRejectedQuotes] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    quote_number: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    project_description: '',
    items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0 }],
    valid_until: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [sendAfterCreate, setSendAfterCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('quotes');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerView, setCustomerView] = useState('grid');
  const [customerSearch, setCustomerSearch] = useState('');

  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  const company = companies?.[0];

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: async (createdQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setShowDialog(false);
      resetForm();
      if (sendAfterCreate) {
        setSendAfterCreate(false);
        const email = createdQuote.customer_email;
        if (!email) {
          toast.error('Ingen e-postadresse på kunden – tilbudet ble opprettet men ikke sendt.');
          return;
        }
        try {
          const approvalToken = `tilbud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const approvalUrl = `${window.location.origin}/approve-quote?token=${approvalToken}`;
          const { generateQuoteEmailHTML } = await import('@/components/shared/generateEmailHTML');
          const htmlBody = generateQuoteEmailHTML({ ...createdQuote, approval_token: approvalToken }, approvalUrl);
          const now = new Date().toISOString();
          const updateData = {
            sent_to_customer: true,
            sent_date: now,
            sent_to_email: email,
            delivery_confirmed: true,
            delivery_confirmed_date: now,
            approval_token: approvalToken,
            status: 'sendt'
          };
          const res = await base44.functions.invoke('sendEmail', {
            toEmail: email,
            subject: `Tilbud #${createdQuote.quote_number}`,
            body: htmlBody,
            entityType: 'Quote',
            entityId: createdQuote.id,
            updateData
          });
          if (res?.data?.error) throw new Error(res.data.error);
          queryClient.invalidateQueries({ queryKey: ['quotes'] });
          toast.success(`Tilbud ${createdQuote.quote_number} er sendt til ${email}`, { duration: 6000 });
        } catch (error) {
          toast.error('Tilbudet ble opprettet, men e-post kunne ikke sendes: ' + error.message);
        }
      } else {
        setSendAfterCreate(false);
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    }
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
      setShowDetailDialog(false);
      setSelectedQuote(null);
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
    setAttachments([]);
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
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const handleSubmit = async (e, andSend = false) => {
    e.preventDefault();
    const total = calculateTotal(formData.items);
    const vat = total * 0.25;

    // Generate document number if new quote (not a revision)
    let quoteNumber = formData.quote_number;
    if (!formData.is_revision) {
      const res = await base44.functions.invoke('generateDocumentNumber', { type: 'quote' });
      quoteNumber = res.data.documentNumber;
    } else {
      // Generate revision number from parent base number
      const parentQuote = quotes.find(q => q.id === formData.parent_quote_id);
      const baseNumber = parentQuote?.base_number || parentQuote?.quote_number?.replace(/-REV\d+$/, '') || formData.quote_number;
      const res = await base44.functions.invoke('generateDocumentNumber', { type: 'quote_revision', baseNumber, currentRevision: formData.revision_number - 1 });
      quoteNumber = res.data.documentNumber;
    }

    const quoteData = {
      ...formData,
      quote_number: quoteNumber,
      items: formData.items.map((item) => ({
        ...item,
        total: item.quantity * item.unit_price
      })),
      total_amount: total,
      vat_amount: vat,
      status: 'utkast',
      revision_number: formData.revision_number || 0,
      is_revision: formData.is_revision || false,
      parent_quote_id: formData.parent_quote_id || null,
      attachment_urls: attachments.map(a => a.file_url).filter(Boolean)
    };

    setSendAfterCreate(andSend);
    createMutation.mutate(quoteData);
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

  const handleAcceptQuote = async (quote) => {
    updateMutation.mutate({
      id: quote.id,
      data: {
        status: 'godkjent',
        approved_date: new Date().toISOString(),
        approved_by_email: user?.email
      }
    });
    toast.success('Tilbud akseptert');
  };

  const handleSendToOrder = async (quote) => {
    try {
      const numRes = await base44.functions.invoke('generateDocumentNumber', { type: 'order' });
      const orderData = {
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        project_id: quote.project_id,
        project_name: projects.find((p) => p.id === quote.project_id)?.name || '',
        our_reference: user?.email,
        description: quote.project_description,
        items: quote.items,
        total_amount: quote.total_amount,
        vat_amount: quote.vat_amount,
        status: 'opprettet',
        source_type: 'quote',
        source_id: quote.id,
        order_number: numRes.data.documentNumber
      };

      await base44.entities.Order.create(orderData);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Ordre opprettet fra tilbud');
      setShowDetailDialog(false);
    } catch (error) {
      toast.error('Kunne ikke opprette ordre');
    }
  };

  const activeQuotes = useMemo(() => {
    return quotes.filter((q) => q.status !== 'avvist' && q.status !== 'utlopt');
  }, [quotes]);

  const rejectedQuotes = useMemo(() => {
    return quotes.filter((q) => q.status === 'avvist' || q.status === 'utlopt');
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return activeQuotes.filter((q) => {
      const matchesSearch = q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase());
      const matchesProject = projectFilter === 'all' || q.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [activeQuotes, search, projectFilter, statusFilter]);

  const toggleSelectQuote = (quoteId) => {
    setSelectedQuotes((prev) =>
    prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map((q) => q.id));
    }
  };

  const handleBulkSend = async () => {
    const quotesToSend = quotes.filter((q) => selectedQuotes.includes(q.id));
    for (const quote of quotesToSend) {
      handleSendEmail(quote);
    }
    toast.success(`Sender ${quotesToSend.length} tilbud`);
    setSelectedQuotes([]);
  };

  const handleBulkDownload = async () => {
    const quotesToDownload = quotes.filter((q) => selectedQuotes.includes(q.id));
    
    for (const quote of quotesToDownload) {
      try {
        await generateQuotePDF(quote, company);
        // Vent litt mellom hver PDF for å unngå problemer
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Feil ved generering av PDF for tilbud:', quote.quote_number, error);
      }
    }
    
    toast.success(`${quotesToDownload.length} PDF-er åpnet i nye faner`);
  };

  const handleDelete = () => {
    deleteMutation.mutate(selectedQuotes);
  };

  const generatePDF = async (quote) => {
    await generateQuotePDF(quote, company);
  };

  const handleReviseQuote = async (quote) => {
    const newRevisionNumber = (quote.revision_number || 0) + 1;
    const baseQuoteNumber = quote.parent_quote_id ?
    quotes.find((q) => q.id === quote.parent_quote_id)?.quote_number :
    quote.quote_number;

    const revisedQuote = {
      ...formData,
      quote_number: baseQuoteNumber,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      customer_phone: quote.customer_phone,
      project_description: quote.project_description,
      items: quote.items,
      valid_until: quote.valid_until,
      parent_quote_id: quote.parent_quote_id || quote.id,
      revision_number: newRevisionNumber,
      is_revision: true,
      status: 'utkast'
    };

    setFormData(revisedQuote);
    setShowDialog(true);
    toast.info(`Oppretter revisjon ${newRevisionNumber}`);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Tilbud"
        subtitle={`${activeQuotes.length} aktive tilbud${rejectedQuotes.length > 0 ? ` • ${rejectedQuotes.length} ikke akseptert` : ''}`}
        actions={
        <div className="flex gap-2">
            {activeTab === 'quotes' && selectedQuotes.length > 0 &&
          <>
                <Button
              variant="outline"
              onClick={handleBulkSend}
              className="rounded-xl gap-2">

                  <Send className="h-4 w-4" /> Send ({selectedQuotes.length})
                </Button>
                <Button
              variant="outline"
              onClick={handleBulkDownload}
              className="rounded-xl gap-2">

                  <Download className="h-4 w-4" /> Last ned
                </Button>
                






                






              </>
          }
            {activeTab === 'quotes' && (
              <Button
                onClick={() => { resetForm(); setShowDialog(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Nytt tilbud
              </Button>
            )}
            {activeTab === 'customers' && (
              <Button
                onClick={() => { setSelectedCustomer(null); setShowCustomerDialog(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <Users className="h-4 w-4" /> Ny kunde
              </Button>
            )}
          </div>
        } />


      <div className="px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="quotes">Tilbud</TabsTrigger>
            <TabsTrigger value="customers">Kunder</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'customers' ? (
          <div>
            <div className="flex gap-4 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Søk etter kunde..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCustomerView('grid')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerView === 'grid' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="h-4 w-4" /> Rubrikker
                </button>
                <button
                  onClick={() => setCustomerView('list')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerView === 'list' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="h-4 w-4" /> Linjer
                </button>
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Ingen kunder"
                description="Bygg opp kunderegisteret ditt"
                actionLabel="Ny kunde"
                onAction={() => { setSelectedCustomer(null); setShowCustomerDialog(true); }}
              />
            ) : customerView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="p-5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">{customer.name}</h3>
                    {customer.contact_person && <p className="text-sm text-slate-500 mb-2">{customer.contact_person}</p>}
                    {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
                    {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}
                    {customer.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="px-5 py-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-700 text-sm font-semibold">
                          {customer.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                        <span className="font-semibold text-slate-900 truncate">{customer.name}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.contact_person || '—'}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.email || '—'}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.phone || '—'}</span>
                      </div>
                      {customer.tags?.length > 0 && (
                        <div className="hidden md:flex gap-1">
                          {customer.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'quotes' && <>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Utkast', status: 'utkast', count: quotes.filter(q => q.status === 'utkast').length },
            { label: 'Sendt', status: 'sendt', count: quotes.filter(q => q.status === 'sendt').length },
            { label: 'Godkjent', status: 'godkjent', count: quotes.filter(q => q.status === 'godkjent').length },
            { label: 'Avvist', status: 'avvist', count: rejectedQuotes.length },
          ].map(({ label, status, count }) => (
            <Card
              key={status}
              className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md hover:ring-2 hover:ring-slate-200 transition-all"
              onClick={() => {
                if (status === 'avvist') {
                  setShowRejectedQuotes(true);
                } else {
                  // Filter by scrolling to section - use search as proxy via a status concept
                  // We scroll to list and visually show it
                }
              }}
            >
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter tilbud..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200" />

          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map((project) =>
              <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Quotes List */}
        {isLoading ?
        <div className="space-y-4">
            {[1, 2, 3].map((i) =>
          <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
          )}
          </div> :
        filteredQuotes.length === 0 ?
        <EmptyState
          icon={FileSpreadsheet}
          title="Ingen tilbud"
          description="Opprett tilbud til dine kunder"
          actionLabel="Nytt tilbud"
          onAction={() => {
            resetForm();
            setShowDialog(true);
          }} /> :


        <>
            <div className="space-y-4">
              {/* Bulk Select Header */}
              {filteredQuotes.length > 0 &&
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200">
                  <Checkbox
                checked={selectedQuotes.length === filteredQuotes.length}
                onCheckedChange={toggleSelectAll} />

                <span className="text-sm text-slate-600">
                  {selectedQuotes.length > 0 ? `${selectedQuotes.length} valgt` : 'Velg alle'}
                </span>
              </div>
            }

            <div className="grid gap-4">
              {filteredQuotes.map((quote) =>
              <Card
                key={quote.id}
                className="p-4 border-0 shadow-sm hover:shadow-md transition-all">

                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <Checkbox
                      checked={selectedQuotes.includes(quote.id)}
                      onCheckedChange={() => toggleSelectQuote(quote.id)} />

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
                    }}>

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">
                              #{quote.quote_number}
                              {quote.revision_number > 0 && `-REV${quote.revision_number}`}
                            </h3>
                            <StatusBadge status={quote.status || (quote.sent_to_customer ? 'sendt' : 'utkast')} />
                            {quote.is_revision &&
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                Revisjon
                              </span>
                          }
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
              )}
            </div>

            {/* Rejected/Expired Quotes Section */}
            {rejectedQuotes.length > 0 &&
            <Card className="border-0 shadow-sm mt-8">
                <button
                onClick={() => setShowRejectedQuotes(!showRejectedQuotes)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl">

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">Ikke aksepterte tilbud</h3>
                      <p className="text-sm text-slate-500">{rejectedQuotes.length} tilbud</p>
                    </div>
                  </div>
                  {showRejectedQuotes ?
                <ChevronUp className="h-5 w-5 text-slate-400" /> :

                <ChevronDown className="h-5 w-5 text-slate-400" />
                }
                </button>

                {showRejectedQuotes &&
              <div className="p-4 pt-0 space-y-2">
                    {rejectedQuotes.map((quote) =>
                <div
                  key={quote.id}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedQuote(quote);
                    setShowDetailDialog(true);
                  }}>

                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900">
                                #{quote.quote_number}
                                {quote.revision_number > 0 && `-REV${quote.revision_number}`}
                              </h4>
                              <StatusBadge status={quote.status} />
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{quote.customer_name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {quote.created_date && format(new Date(quote.created_date), 'd. MMM yyyy', { locale: nb })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {(quote.total_amount || 0).toLocaleString('nb-NO')} kr
                            </p>
                            <p className="text-xs text-slate-500">eks. mva</p>
                          </div>
                        </div>
                      </div>
                )}
                  </div>
              }
              </Card>
            }
            </div>
          </>
        }
        </>}
      </div>

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
                <CustomerSelector
                  customers={customers}
                  value={formData.customer_name}
                  onChange={(val) => setFormData(prev => ({ ...prev, customer_name: val }))}
                  onSelect={(customer) => {
                    if (customer) {
                      setFormData(prev => ({
                        ...prev,
                        customer_name: customer.name || '',
                        customer_email: customer.email || '',
                        customer_phone: customer.phone || '',
                      }));
                    }
                  }}
                  onRequestNewCustomer={() => setShowNewCustomerDialog(true)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gyldig til</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prosjektbeskrivelse</Label>
              <Textarea
                value={formData.project_description}
                onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                rows={3} />

            </div>

            {/* Items */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <span className="text-slate-900 text-base font-semibold">Beskrivelse</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-900 text-base font-semibold">Mengde</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-900 text-base font-semibold">Enhet</span>
                </div>
                <div className="text-slate-900 col-span-3">
                  <span className="text-slate-900 text-base font-semibold">Enhetspris</span>
                </div>
                <div className="col-span-1"></div>
              </div>
              {formData.items.map((item, index) =>
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Input
                    placeholder="Beskrivelse"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)} />

                  </div>
                  <div className="col-span-2">
                    <Input
                    type="number"
                    placeholder="Mengde"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} />

                  </div>
                  <div className="col-span-2">
                    <Select
                    value={item.unit}
                    onValueChange={(value) => handleItemChange(index, 'unit', value)}>

                      <SelectTrigger>
                        <SelectValue placeholder="Enhet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stk">stk</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="LM">LM</SelectItem>
                        <SelectItem value="RS">RS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                    type="number"
                    placeholder="Pris"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))} />

                  </div>
                  <div className="col-span-1">
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length === 1}>

                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full rounded-xl">

                <Plus className="h-4 w-4 mr-2" />
                Legg til linje
              </Button>
            </div>

            {/* File Upload Section */}
            <FileUploadSection
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projectId={null}
              moduleType="quote"
            />

            {/* Totals */}
            <div className="space-y-2 text-right">
              <div className="flex justify-end gap-8">
                <span className="text-slate-600">Subtotal:</span>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {createMutation.isPending && !sendAfterCreate ? 'Lagrer...' : 'Opprett tilbud'}
              </Button>
              <Button
                type="button"
                disabled={createMutation.isPending || !formData.customer_email}
                onClick={(e) => handleSubmit(e, true)}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">
                <Send className="h-4 w-4" />
                {createMutation.isPending && sendAfterCreate ? 'Sender...' : 'Opprett og send tilbud'}
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
          {selectedQuote &&
          <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{selectedQuote.customer_name}</span>
                </div>
                {selectedQuote.customer_email &&
              <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{selectedQuote.customer_email}</span>
                  </div>
              }
                {selectedQuote.customer_phone &&
              <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{selectedQuote.customer_phone}</span>
                  </div>
              }
              </div>

              {selectedQuote.project_description &&
            <div>
                  <h4 className="font-medium mb-2">Prosjekt</h4>
                  <p className="text-slate-600">{selectedQuote.project_description}</p>
                </div>
            }

              {/* Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beskrivelse</TableHead>
                    <TableHead className="text-center">Antall</TableHead>
                    <TableHead className="text-right">Enhetspris</TableHead>
                    <TableHead className="text-right">Totalt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedQuote.items?.map((item, idx) =>
                <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{item.unit_price.toLocaleString('nb-NO')} kr</TableCell>
                      <TableCell className="text-right">{(item.quantity * item.unit_price).toLocaleString('nb-NO')} kr</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="space-y-2 text-right">
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium w-32">{(selectedQuote.total_amount || 0).toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-slate-600">MVA (25%):</span>
                  <span className="font-medium w-32">{(selectedQuote.vat_amount || 0).toLocaleString('nb-NO')} kr</span>
                </div>
                <div className="flex justify-end gap-8 pt-2 border-t">
                  <span className="font-semibold">Totalt ink. mva:</span>
                  <span className="font-bold w-32">{((selectedQuote.total_amount || 0) + (selectedQuote.vat_amount || 0)).toLocaleString('nb-NO')} kr</span>
                </div>
              </div>

              {/* Delivery Status */}
              <DeliveryStatus item={selectedQuote} />

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                  onClick={() => generatePDF(selectedQuote)}
                  className="flex-1 rounded-xl gap-2"
                  variant="outline">

                    <Download className="h-4 w-4" />
                    Last ned PDF
                  </Button>
                  <Button
                  onClick={() => handleReviseQuote(selectedQuote)}
                  className="flex-1 rounded-xl gap-2"
                  variant="outline">

                    <FileEdit className="h-4 w-4" />
                    Opprett revisjon
                  </Button>
                  {!selectedQuote.sent_to_customer &&
                <Button
                  onClick={() => handleSendEmail(selectedQuote)}
                  className="flex-1 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700">

                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                }
                  <Button
                    onClick={() => {
                      setSelectedQuotes([selectedQuote.id]);
                      setDeleteDialogOpen(true);
                    }}
                    variant="outline"
                    className="rounded-xl gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                    <Trash2 className="h-4 w-4" />
                    Slett
                  </Button>
                </div>

                {/* Accept/Reject Quote Buttons */}
                {selectedQuote.sent_to_customer && selectedQuote.status === 'sendt' &&
              <div className="flex gap-2">
                    <Button
                      onClick={() => handleAcceptQuote(selectedQuote)}
                      className="flex-1 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="h-4 w-4" />
                      Tilbud akseptert
                    </Button>
                    <Button
                      onClick={() => {
                        updateMutation.mutate({
                          id: selectedQuote.id,
                          data: { status: 'avvist' }
                        });
                        setShowDetailDialog(false);
                        toast.success('Tilbud markert som ikke akseptert');
                      }}
                      variant="outline"
                      className="flex-1 rounded-xl gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                      <X className="h-4 w-4" />
                      Marker som ikke akseptert
                    </Button>
                  </div>
              }

                {/* Send to Order Button */}
                {selectedQuote.status === 'godkjent' &&
              <Button
                onClick={() => handleSendToOrder(selectedQuote)}
                className="w-full rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                    <FileText className="h-4 w-4" />
                    Send til ordre
                  </Button>
              }
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Customer Overview Dialog */}
      <CustomerDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        customer={selectedCustomer}
        onCustomerChange={setSelectedCustomer}
      />

      {/* New Customer Dialog */}
      <NewCustomerDialog
        open={showNewCustomerDialog}
        onOpenChange={setShowNewCustomerDialog}
        onCreated={(customer) => {
          setFormData(prev => ({
            ...prev,
            customer_name: customer.name || '',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
          }));
        }}
      />

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="tilbud"
        item={selectedQuote}
        defaultEmail={selectedQuote?.customer_email || ''}
        onSent={handleEmailSent} />


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette {selectedQuotes.length} {selectedQuotes.length === 1 ? 'tilbud' : 'tilbud'}? 
              Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700">

              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}