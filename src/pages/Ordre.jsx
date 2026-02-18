import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import { 
  FileText, Search, Plus, Building2, Calendar, 
  DollarSign, ChevronRight, Send, CheckCircle2, User
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Ordre() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sourceType, setSourceType] = useState('quote');

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date'),
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['changeNotifications'],
    queryFn: () => base44.entities.ChangeNotification.list('-created_date'),
  });

  const createFromSourceMutation = useMutation({
    mutationFn: async ({ sourceType, sourceId }) => {
      let sourceData;
      let orderData = {
        order_number: `ORD-${Date.now()}`,
        source_type: sourceType,
        source_id: sourceId,
        status: 'opprettet',
        approval_token: crypto.randomUUID()
      };

      if (sourceType === 'quote') {
        sourceData = quotes.find(q => q.id === sourceId);
        orderData = {
          ...orderData,
          customer_name: sourceData.customer_name,
          customer_email: sourceData.customer_email,
          customer_phone: sourceData.customer_phone,
          project_id: sourceData.project_id,
          description: sourceData.project_description,
          items: sourceData.items,
          total_amount: sourceData.total_amount,
          vat_amount: sourceData.vat_amount,
          due_date: sourceData.valid_until
        };
      } else if (sourceType === 'deviation') {
        sourceData = deviations.find(d => d.id === sourceId);
        const project = projects.find(p => p.id === sourceData.project_id);
        orderData = {
          ...orderData,
          customer_name: project?.client_name || '',
          customer_email: project?.client_email || '',
          customer_phone: project?.client_phone || '',
          project_id: sourceData.project_id,
          project_name: project?.name || '',
          description: sourceData.title + '\n\n' + sourceData.description,
          items: sourceData.has_cost_consequence ? [{
            description: sourceData.cost_description || sourceData.title,
            quantity: 1,
            unit: 'stk',
            unit_price: sourceData.cost_amount || 0,
            total: sourceData.cost_amount || 0
          }] : [],
          total_amount: sourceData.cost_amount || 0,
          vat_amount: (sourceData.cost_amount || 0) * 0.25
        };
      } else if (sourceType === 'change') {
        sourceData = changes.find(c => c.id === sourceId);
        const project = projects.find(p => p.id === sourceData.project_id);
        orderData = {
          ...orderData,
          customer_name: project?.client_name || '',
          customer_email: project?.client_email || '',
          customer_phone: project?.client_phone || '',
          project_id: sourceData.project_id,
          project_name: project?.name || '',
          description: sourceData.title + '\n\n' + sourceData.description,
          items: [{
            description: sourceData.title,
            quantity: 1,
            unit: 'stk',
            unit_price: sourceData.amount || 0,
            total: sourceData.amount || 0
          }],
          total_amount: sourceData.amount || 0,
          vat_amount: (sourceData.amount || 0) * 0.25
        };
      }

      return base44.entities.Order.create(orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowSourceDialog(false);
      toast.success('Ordre opprettet');
    },
  });

  const handleSendEmail = async (email) => {
    const approvalUrl = `${window.location.origin}/approve-order/${selectedOrder.approval_token}`;
    
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Ordre ${selectedOrder.order_number} - ${selectedOrder.customer_name}`,
      body: `Hei,\n\nDu har mottatt en ny ordre:\n\nOrdrenummer: ${selectedOrder.order_number}\nBeskrivelse: ${selectedOrder.description || ''}\nTotalbeløp: kr ${selectedOrder.total_amount?.toFixed(2) || '0.00'}\nForfall: ${selectedOrder.due_date ? format(new Date(selectedOrder.due_date), 'd. MMMM yyyy', { locale: nb }) : 'Ikke satt'}\n\nFor å godkjenne ordren, klikk på lenken nedenfor:\n${approvalUrl}\n\nMed vennlig hilsen`
    });

    await base44.entities.Order.update(selectedOrder.id, {
      sent_to_customer: true,
      sent_date: new Date().toISOString(),
      sent_to_email: email,
      status: 'sendt'
    });

    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Ukjent prosjekt';
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesProject = projectFilter === 'all' || order.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [orders, search, statusFilter, projectFilter]);

  // Stats
  const statusCounts = {
    opprettet: orders.filter(o => o.status === 'opprettet').length,
    sendt: orders.filter(o => o.status === 'sendt').length,
    godkjent: orders.filter(o => o.status === 'godkjent').length,
    utfort: orders.filter(o => o.status === 'utfort').length,
  };

  const totalValue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Get approved sources for creation
  const approvedQuotes = quotes.filter(q => q.status === 'godkjent');
  const approvedDeviations = deviations.filter(d => d.status === 'lukket' && d.has_cost_consequence);
  const approvedChanges = changes.filter(c => c.status === 'godkjent');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Ordre"
        subtitle="Administrer ordre og arbeidsordre"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowSourceDialog(true)}
              className="rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" /> Fra Tilbud/Avvik/Endring
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" /> Ny ordre
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.opprettet}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Opprettet</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.sendt}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sendt</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.godkjent}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Godkjent</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(totalValue / 1000).toFixed(0)}k
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total verdi</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter ordre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="opprettet">Opprettet</SelectItem>
              <SelectItem value="sendt">Sendt</SelectItem>
              <SelectItem value="godkjent">Godkjent</SelectItem>
              <SelectItem value="utfort">Utført</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Ingen ordre"
            description="Opprett en ny ordre eller importer fra tilbud, avvik eller endring"
            actionLabel="Ny ordre"
            onAction={() => setShowCreateDialog(true)}
          />
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {order.order_number}
                      </h3>
                      <StatusBadge status={order.status} />
                      {order.source_type !== 'manual' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          Fra {order.source_type === 'quote' ? 'Tilbud' : order.source_type === 'deviation' ? 'Avvik' : 'Endring'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {order.customer_name}
                      </span>
                      {order.project_id && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {getProjectName(order.project_id)}
                        </span>
                      )}
                      {order.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.due_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        kr {order.total_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(order.status === 'opprettet' || order.status === 'sendt') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowEmailDialog(true);
                        }}
                        className="rounded-xl gap-1"
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create from Source Dialog */}
      <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Opprett ordre fra eksisterende</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Fra Tilbud</SelectItem>
                  <SelectItem value="deviation">Fra Avvik</SelectItem>
                  <SelectItem value="change">Fra Endringsmelding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sourceType === 'quote' && approvedQuotes.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  Ingen godkjente tilbud
                </p>
              )}
              {sourceType === 'quote' && approvedQuotes.map(quote => (
                <Card 
                  key={quote.id}
                  className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 border-0 dark:bg-slate-800"
                  onClick={() => createFromSourceMutation.mutate({ sourceType: 'quote', sourceId: quote.id })}
                >
                  <p className="font-medium text-sm">{quote.quote_number}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{quote.customer_name}</p>
                </Card>
              ))}

              {sourceType === 'deviation' && approvedDeviations.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  Ingen godkjente avvik med kostnadskonsekvens
                </p>
              )}
              {sourceType === 'deviation' && approvedDeviations.map(dev => (
                <Card 
                  key={dev.id}
                  className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 border-0 dark:bg-slate-800"
                  onClick={() => createFromSourceMutation.mutate({ sourceType: 'deviation', sourceId: dev.id })}
                >
                  <p className="font-medium text-sm">{dev.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    kr {dev.cost_amount?.toFixed(2) || '0.00'}
                  </p>
                </Card>
              ))}

              {sourceType === 'change' && approvedChanges.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  Ingen godkjente endringsmeldinger
                </p>
              )}
              {sourceType === 'change' && approvedChanges.map(change => (
                <Card 
                  key={change.id}
                  className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 border-0 dark:bg-slate-800"
                  onClick={() => createFromSourceMutation.mutate({ sourceType: 'change', sourceId: change.id })}
                >
                  <p className="font-medium text-sm">{change.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    kr {change.amount?.toFixed(2) || '0.00'}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      {selectedOrder && (
        <SendEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          type="ordre"
          item={selectedOrder}
          onSent={handleSendEmail}
        />
      )}
    </div>
  );
}