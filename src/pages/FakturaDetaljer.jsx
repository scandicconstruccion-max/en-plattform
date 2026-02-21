import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Send, FileText, Download, CheckCircle, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import InvoicePreview from '@/components/faktura/InvoicePreview';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { formatAmount } from '@/components/shared/formatNumber';

export default function FakturaDetaljer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');
  const newType = urlParams.get('new');

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    project_id: '',
    project_name: '',
    order_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    payment_terms_days: 30,
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    comment: '',
    status: 'kladd',
    our_reference: '',
    our_reference_name: '',
    their_reference: ''
  });

  const [lines, setLines] = useState([
  { description: '', quantity: 1, unit: 'stk', unit_price: 0, vat_rate: 25 }]
  );
  const [attachments, setAttachments] = useState([]);

  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeviationDialog, setShowDeviationDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_reference: ''
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => base44.entities.Invoice.filter({ id: invoiceId }).then((res) => res[0]),
    enabled: !!invoiceId
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoiceLines', invoiceId],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_id: invoiceId }),
    enabled: !!invoiceId
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list()
  });

  const availableDeviations = deviations.filter(d => 
    d.status === 'utfort' && 
    d.has_cost_consequence && 
    !d.invoice_id
  );

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        customer_id: invoice.customer_id || '',
        customer_name: invoice.customer_name || '',
        customer_email: invoice.customer_email || '',
        project_id: invoice.project_id || '',
        project_name: invoice.project_name || '',
        order_id: invoice.order_id || '',
        invoice_date: invoice.invoice_date || '',
        payment_terms_days: invoice.payment_terms_days || 30,
        due_date: invoice.due_date || '',
        comment: invoice.comment || '',
        status: invoice.status || 'kladd',
        our_reference: invoice.our_reference || '',
        our_reference_name: invoice.our_reference_name || '',
        their_reference: invoice.their_reference || ''
      });
    }
  }, [invoice]);

  useEffect(() => {
    if (invoiceLines.length > 0) {
      setLines(invoiceLines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        vat_rate: line.vat_rate
      })));
    }
  }, [invoiceLines]);

  const calculateTotals = () => {
    let totalExclVat = 0;
    let totalVat = 0;

    lines.forEach((line) => {
      const lineTotal = line.quantity * line.unit_price;
      totalExclVat += lineTotal;
      totalVat += lineTotal * (line.vat_rate / 100);
    });

    return {
      amount_excluding_vat: totalExclVat,
      vat_amount: totalVat,
      total_amount: totalExclVat + totalVat
    };
  };

  const generateKID = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
  };

  const generateInvoiceNumber = async () => {
    const allInvoices = await base44.entities.Invoice.list();
    const lastNumber = allInvoices.length > 0 ?
    Math.max(...allInvoices.map((inv) => {
      const num = parseInt(inv.invoice_number?.replace(/\D/g, '') || '0');
      return isNaN(num) ? 0 : num;
    })) : 0;
    return `INV-${String(lastNumber + 1).padStart(5, '0')}`;
  };

  const saveMutation = useMutation({
    mutationFn: async (saveAsDraft = false) => {
      const totals = calculateTotals();
      const invoiceNumber = invoice?.invoice_number || (await generateInvoiceNumber());
      const kidNumber = invoice?.kid_number || generateKID();

      const invoiceData = {
        ...formData,
        invoice_number: invoiceNumber,
        kid_number: kidNumber,
        status: saveAsDraft ? 'kladd' : formData.status,
        ...totals
      };

      let savedInvoice;
      if (invoiceId) {
        savedInvoice = await base44.entities.Invoice.update(invoiceId, invoiceData);
      } else {
        savedInvoice = await base44.entities.Invoice.create(invoiceData);
      }

      // Delete existing lines if updating
      if (invoiceId) {
        for (const line of invoiceLines) {
          await base44.entities.InvoiceLine.delete(line.id);
        }
      }

      // Create new lines
      for (const line of lines) {
        const lineTotal = line.quantity * line.unit_price;
        await base44.entities.InvoiceLine.create({
          invoice_id: savedInvoice.id,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unit_price,
          vat_rate: line.vat_rate,
          line_total: lineTotal
        });
      }

      // Update deviation if this invoice was created from one
      if (newType === 'deviation' && formData.comment?.includes('Opprettet fra avvik:')) {
        try {
          const deviation = deviations.find(d => 
            formData.comment.includes(d.title) && d.status === 'utfort'
          );
          
          if (deviation) {
            const user = await base44.auth.me();
            const newActivityLog = deviation.activity_log || [];
            newActivityLog.push({
              action: 'fakturert',
              timestamp: new Date().toISOString(),
              user_email: user.email,
              user_name: user.full_name,
              details: `Faktura opprettet (ID: ${savedInvoice.id})`
            });

            await base44.entities.Deviation.update(deviation.id, {
              status: 'fakturert',
              invoice_id: savedInvoice.id,
              invoiced_date: new Date().toISOString(),
              activity_log: newActivityLog
            });

            queryClient.invalidateQueries({ queryKey: ['deviations'] });
            toast.success('Flott 👌 Avviket ligger nå klart i fakturamodulen.', { duration: 5000 });
          }
        } catch (error) {
          console.error('Kunne ikke oppdatere avvik:', error);
        }
      }

      return savedInvoice;
    },
    onSuccess: (savedInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      if (newType !== 'deviation') {
        toast.success('Faktura lagret');
      }
      if (!invoiceId) {
        navigate(createPageUrl(`FakturaDetaljer?id=${savedInvoice.id}`));
      }
    }
  });

  const sendMutation = useMutation({
    mutationFn: async (email) => {
      await base44.entities.Invoice.update(invoiceId, {
        status: 'sendt',
        sent_date: new Date().toISOString(),
        sent_to_email: email
      });

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Faktura ${invoice.invoice_number}`,
        body: `
Hei,

Vedlagt finner du faktura ${invoice.invoice_number}.

Fakturadetaljer:
- Fakturanummer: ${invoice.invoice_number}
- Fakturadato: ${format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}
- Forfallsdato: ${format(new Date(invoice.due_date), 'dd.MM.yyyy')}
- Beløp: ${formatAmount(invoice.total_amount)}
- KID-nummer: ${invoice.kid_number}

Vennligst betal innen forfallsdato.

Med vennlig hilsen,
${base44.auth.me().then((u) => u.full_name)}
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowSendDialog(false);
      toast.success('Faktura sendt');
      // Automatisk tilbake til hovedsiden
      setTimeout(() => {
        navigate(createPageUrl('Faktura'));
      }, 1000);
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Invoice.update(invoiceId, {
        status: 'betalt',
        paid_date: new Date(paymentData.payment_date).toISOString(),
        payment_reference: paymentData.payment_reference
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      setShowPaymentDialog(false);
      toast.success('Faktura markert som betalt');
    }
  });

  const importFromOrder = (order) => {
    const selectedCustomer = customers.find((c) => c.id === order.customer_id);
    const selectedProject = projects.find((p) => p.id === order.project_id);

    setFormData({
      ...formData,
      customer_id: selectedCustomer?.id || '',
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      project_id: selectedProject?.id || '',
      project_name: order.project_name,
      order_id: order.id
    });

    setLines(order.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      vat_rate: 25
    })) || []);

    setShowOrderDialog(false);
    toast.success('Ordre importert');
  };

  const importFromDeviation = async (deviation) => {
    const selectedProject = projects.find((p) => p.id === deviation.project_id);

    setFormData({
      ...formData,
      customer_name: selectedProject?.client_name || '',
      customer_email: selectedProject?.client_email || '',
      project_id: selectedProject?.id || '',
      project_name: selectedProject?.name || '',
      comment: `Opprettet fra avvik: ${deviation.title}\n\n${deviation.cost_description || ''}`
    });

    setLines([{
      description: deviation.cost_description || deviation.title,
      quantity: 1,
      unit: 'stk',
      unit_price: deviation.cost_amount || 0,
      vat_rate: 25
    }]);

    setShowDeviationDialog(false);
    toast.success('Avvik importert');

    // Update deviation with activity log
    try {
      const user = await base44.auth.me();
      const newActivityLog = deviation.activity_log || [];
      newActivityLog.push({
        action: 'sendt_fakturering',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: 'Faktura påbegynt fra avvik'
      });
      
      await base44.entities.Deviation.update(deviation.id, {
        activity_log: newActivityLog
      });
    } catch (error) {
      console.error('Kunne ikke oppdatere avvik:', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit: 'stk', unit_price: 0, vat_rate: 25 }]);
  };

  const removeLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email
      });
    }
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setFormData({
        ...formData,
        project_id: project.id,
        project_name: project.name
      });
    }
  };

  const handleOurReferenceChange = (employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        our_reference: employee.id,
        our_reference_name: `${employee.first_name} ${employee.last_name}`
      });
    }
  };

  const getProjectContacts = () => {
    if (!formData.project_id) return [];
    const project = projects.find((p) => p.id === formData.project_id);
    if (!project) return [];
    
    const contacts = [];
    if (project.client_contact) {
      contacts.push({ name: project.client_contact, label: `${project.client_contact} (Kunde)` });
    }
    if (project.project_manager_name) {
      contacts.push({ name: project.project_manager_name, label: `${project.project_manager_name} (Prosjektleder)` });
    }
    return contacts;
  };

  const totals = calculateTotals();
  const isEditable = !invoice || invoice.status === 'kladd';

  useEffect(() => {
    if (newType === 'order' && !showOrderDialog) {
      setShowOrderDialog(true);
    }
    if (newType === 'deviation' && !showDeviationDialog) {
      setShowDeviationDialog(true);
    }
  }, [newType]);

  const handlePreview = () => {
    if (!formData.customer_name || lines.length === 0 || !lines[0].description) {
      toast.error('Vennligst fyll ut fakturainformasjon og minst én linje');
      return;
    }
    setShowPreviewDialog(true);
  };

  const handleSaveDraft = async () => {
    if (!formData.customer_name) {
      toast.error('Vennligst velg en kunde');
      return;
    }
    await saveMutation.mutateAsync(true);
  };

  const handleClose = () => {
    if (confirm('Er du sikker på at du vil lukke uten å lagre?')) {
      navigate(createPageUrl('Faktura'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={invoice ? `Faktura ${invoice.invoice_number}` : 'Ny faktura'}
          subtitle={invoice ? `Opprettet ${format(new Date(invoice.created_date), 'dd.MM.yyyy')}` : 'Opprett en ny faktura'}
          backUrl={createPageUrl('Faktura')} />


        {/* Invoice Info */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Fakturainformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kunde *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={handleCustomerChange}
                  disabled={!isEditable}>

                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Velg kunde" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) =>
                    <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prosjekt</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={handleProjectChange}
                  disabled={!isEditable}>

                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Velg prosjekt" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) =>
                    <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fakturadato *</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  disabled={!isEditable} />

              </div>
              <div>
                <Label>Betalingsvilkår (dager)</Label>
                <Input
                  type="number"
                  value={formData.payment_terms_days}
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    const dueDate = new Date(formData.invoice_date);
                    dueDate.setDate(dueDate.getDate() + days);
                    setFormData({
                      ...formData,
                      payment_terms_days: days,
                      due_date: format(dueDate, 'yyyy-MM-dd')
                    });
                  }}
                  className="mt-1.5 rounded-xl"
                  disabled={!isEditable} />

              </div>
              <div>
                <Label>Forfallsdato *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  disabled={!isEditable} />

              </div>
              {invoice?.kid_number &&
              <div>
                  <Label>KID-nummer</Label>
                  <Input
                  value={invoice.kid_number}
                  className="mt-1.5 rounded-xl"
                  disabled />

                </div>
              }
              <div>
                <Label>Vår referanse</Label>
                <Select
                  value={formData.our_reference}
                  onValueChange={handleOurReferenceChange}
                  disabled={!isEditable}>

                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Velg ansatt" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) =>
                    <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deres referanse</Label>
                {formData.project_id && getProjectContacts().length > 0 ? (
                  <Select
                    value={formData.their_reference}
                    onValueChange={(value) => setFormData({ ...formData, their_reference: value })}
                    disabled={!isEditable}>

                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Velg kontaktperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {getProjectContacts().map((contact, idx) =>
                      <SelectItem key={idx} value={contact.name}>
                          {contact.label}
                        </SelectItem>
                      )}
                      <SelectItem value="custom">Annet (skriv inn)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.their_reference}
                    onChange={(e) => setFormData({ ...formData, their_reference: e.target.value })}
                    className="mt-1.5 rounded-xl"
                    placeholder="Navn på kontaktperson"
                    disabled={!isEditable} />

                )}
              </div>
            </div>
            <div>
              <Label>Kommentar</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Valgfri kommentar til fakturaen"
                disabled={!isEditable} />

            </div>
          </CardContent>
        </Card>

        {/* Invoice Lines */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fakturalinjer</CardTitle>
              {isEditable &&
              <Button onClick={addLine} size="sm" className="bg-green-600 text-primary-foreground px-3 text-xs font-medium rounded-xl inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-8 gap-2">
                  <Plus className="h-4 w-4" />
                  Legg til linje
                </Button>
              }
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, index) =>
            <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Beskrivelse</Label>
                    <Input
                    value={line.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    placeholder="Beskrivelse"
                    className="mt-1 rounded-lg"
                    disabled={!isEditable} />

                  </div>
                  <div>
                    <Label className="text-xs">Antall</Label>
                    <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))}
                    className="mt-1 rounded-lg"
                    disabled={!isEditable} />

                  </div>
                  <div>
                    <Label className="text-xs">Pris (eks. mva)</Label>
                    <Input
                    type="number"
                    value={line.unit_price}
                    onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value))}
                    className="mt-1 rounded-lg"
                    disabled={!isEditable} />

                  </div>
                  <div>
                    <Label className="text-xs">MVA %</Label>
                    <Select
                    value={String(line.vat_rate)}
                    onValueChange={(value) => updateLine(index, 'vat_rate', parseInt(value))}
                    disabled={!isEditable}>

                      <SelectTrigger className="mt-1 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Sum: {formatAmount(line.quantity * line.unit_price * (1 + line.vat_rate / 100))} (inkl. mva)
                  </p>
                  {isEditable && lines.length > 1 &&
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLine(index)}
                  className="text-red-600 hover:text-red-700">

                      <Trash2 className="h-4 w-4" />
                    </Button>
                }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload Section */}
        {isEditable && (
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-6">
              <FileUploadSection
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                projectId={formData.project_id}
                moduleType="invoice"
              />
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sum eks. mva:</span>
                <span className="font-semibold">{formatAmount(totals.amount_excluding_vat)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>MVA:</span>
                <span className="font-semibold">{formatAmount(totals.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t">
                <span>Totalt:</span>
                <span>{formatAmount(totals.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {isEditable &&
          <>
              <Button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {saveMutation.isPending ? 'Lagrer...' : 'Lagre faktura'}
              </Button>
              <Button
              onClick={handlePreview}
              variant="outline"
              className="rounded-xl gap-2">
                <Eye className="h-4 w-4" />
                Forhåndsvis
              </Button>
              <Button
              onClick={handleSaveDraft}
              disabled={saveMutation.isPending}
              variant="outline"
              className="rounded-xl">
                Lagre kladd
              </Button>
              <button
                onClick={handleClose}
                className="text-blue-600 hover:text-blue-700 font-medium px-4 py-2">
                Lukk
              </button>
            </>
          }
          {invoice && invoice.status === 'kladd' &&
          <Button
            onClick={() => setShowSendDialog(true)}
            variant="outline"
            className="rounded-xl gap-2">
              <Send className="h-4 w-4" />
              Send faktura
            </Button>
          }
          {invoice && invoice.status !== 'kladd' && invoice.status !== 'betalt' &&
          <Button
            onClick={() => setShowPaymentDialog(true)}
            variant="outline"
            className="rounded-xl gap-2">
              <CheckCircle className="h-4 w-4" />
              Registrer betaling
            </Button>
          }
        </div>

        {/* Order Selection Dialog */}
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Velg ordre</DialogTitle>
            </DialogHeader>
            {orders.length === 0 ? (
            <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Ingen tilgjengelige ordre</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Ordre må være opprettet i ordre-modulen for å vises her
                </p>
              </div>
            ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => importFromOrder(order)}
                className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {order.order_number}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {order.customer_name} - {order.project_name || 'Uten prosjekt'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            order.status === 'godkjent' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                            order.status === 'sendt' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatAmount(order.total_amount)}
                      </p>
                    </div>
                  </button>
              ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Deviation Selection Dialog */}
        <Dialog open={showDeviationDialog} onOpenChange={setShowDeviationDialog}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Velg avvik</DialogTitle>
            </DialogHeader>
            {availableDeviations.length === 0 ? (
            <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Ingen tilgjengelige avvik</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Avvik må være utført og ha kostnadskonsekvensar for å vises her
                </p>
              </div>
            ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableDeviations.map((deviation) => {
                  const project = projects.find(p => p.id === deviation.project_id);
                  return (
                    <button
                      key={deviation.id}
                      onClick={() => importFromDeviation(deviation)}
                      className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {deviation.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {project?.name || 'Ukjent prosjekt'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {deviation.cost_description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                              Utført
                            </span>
                          </div>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatAmount(deviation.cost_amount)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Forhåndsvisning - Faktura</DialogTitle>
            </DialogHeader>
            <InvoicePreview
              invoice={{
                ...formData,
                invoice_number: invoice?.invoice_number || 'PREVIEW',
                kid_number: invoice?.kid_number || 'PREVIEW-KID'
              }}
              lines={lines}
              totals={totals} />

          </DialogContent>
        </Dialog>

        {/* Send Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Send faktura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>E-postadresse</Label>
                <Input
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  placeholder="kunde@example.com" />

              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Faktura vil bli sendt som PDF til kundens e-postadresse.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
                className="rounded-xl">

                Avbryt
              </Button>
              <Button
                onClick={() => sendMutation.mutate(formData.customer_email)}
                disabled={sendMutation.isPending || !formData.customer_email}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

                {sendMutation.isPending ? 'Sender...' : 'Send faktura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Registrer betaling</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Betalingsdato</Label>
                <Input
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  className="mt-1.5 rounded-xl" />

              </div>
              <div>
                <Label>Betalingsreferanse (valgfri)</Label>
                <Input
                  value={paymentData.payment_reference}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_reference: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  placeholder="Referansenummer fra bank" />

              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="rounded-xl">

                Avbryt
              </Button>
              <Button
                onClick={() => markAsPaidMutation.mutate()}
                disabled={markAsPaidMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

                {markAsPaidMutation.isPending ? 'Registrerer...' : 'Registrer betaling'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}