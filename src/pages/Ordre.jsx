import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import OrderForm from '@/components/ordre/OrderForm';
import {
  FileText, Search, Plus, Building2, Calendar,
  ChevronRight, Send, CheckCircle2, User, Trash2, AlertTriangle
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Ordre() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSentConfirmDialog, setShowSentConfirmDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sourceType, setSourceType] = useState(null);

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date')
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date')
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['changeNotifications'],
    queryFn: () => base44.entities.ChangeNotification.list('-created_date')
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.order_number) {
        const res = await base44.functions.invoke('generateDocumentNumber', { type: 'order' });
        data = { ...data, order_number: res.data.documentNumber };
      }
      return base44.entities.Order.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowCreateDialog(false);
      toast.success('Ordre opprettet');
    }
  });

  const createFromSourceMutation = useMutation({
    mutationFn: async ({ sourceType, sourceId }) => {
      let sourceData;
      const numRes = await base44.functions.invoke('generateDocumentNumber', { type: 'order' });
      let orderData = {
        order_number: numRes.data.documentNumber,
        source_type: sourceType,
        source_id: sourceId,
        status: 'opprettet',
        approval_token: crypto.randomUUID()
      };

      if (sourceType === 'quote') {
        sourceData = quotes.find((q) => q.id === sourceId);
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
        sourceData = deviations.find((d) => d.id === sourceId);
        const project = projects.find((p) => p.id === sourceData.project_id);
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
        sourceData = changes.find((c) => c.id === sourceId);
        const project = projects.find((p) => p.id === sourceData.project_id);
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
    }
  });

  const handleSendEmail = async (updateData) => {
    await base44.entities.Order.update(selectedOrder.id, updateData);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setShowEmailDialog(false);
    setShowSentConfirmDialog(true);
  };

  const handleSubmitAndSend = async (orderData) => {
    const created = await base44.entities.Order.create(orderData);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setShowCreateDialog(false);
    setSelectedOrder(created);
    setShowEmailDialog(true);
  };

  const handleBulkDelete = async () => {
    for (const orderId of selectedOrders) {
      await base44.entities.Order.delete(orderId);
    }
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setSelectedOrders([]);
    setShowDeleteConfirmDialog(false);
    toast.success(`${selectedOrders.length} ordre slettet`);
  };

  const handleBulkSend = async () => {
    for (const orderId of selectedOrders) {
      const order = orders.find((o) => o.id === orderId);
      if (order && order.customer_email) {
        await base44.integrations.Core.SendEmail({
          to: order.customer_email,
          subject: `Ordre ${order.order_number}`,
          body: `Hei,\n\nVedlagt finner du ordre ${order.order_number}.\n\nMed vennlig hilsen`
        });
        await base44.entities.Order.update(orderId, {
          sent_to_customer: true,
          sent_date: new Date().toISOString(),
          sent_to_email: order.customer_email,
          status: 'sendt'
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setSelectedOrders([]);
    toast.success(`${selectedOrders.length} ordre sendt`);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  const getProjectName = (projectId) => {
    return projects.find((p) => p.id === projectId)?.name || 'Ukjent prosjekt';
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesProject = projectFilter === 'all' || order.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [orders, search, statusFilter, projectFilter]);

  const statusCounts = {
    opprettet: orders.filter((o) => o.status === 'opprettet').length,
    sendt: orders.filter((o) => o.status === 'sendt').length,
    godkjent: orders.filter((o) => o.status === 'godkjent').length,
    utfort: orders.filter((o) => o.status === 'utfort').length
  };

  const totalValue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const approvedQuotes = quotes.filter((q) => q.status === 'godkjent');
  const approvedDeviations = deviations.filter((d) => d.status === 'lukket' && d.has_cost_consequence);
  const approvedChanges = changes.filter((c) => c.status === 'godkjent');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Ordre"
        subtitle="Administrer ordre og arbeidsordre"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            {selectedOrders.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSend}
                  className="rounded-xl gap-1.5">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                  <span>({selectedOrders.length})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirmDialog(true)}
                  className="rounded-xl gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Slett</span>
                  <span>({selectedOrders.length})</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSourceDialog(true)}
              className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Hent Fra Tilbud/Avvik/Endring</span>
              <span className="lg:hidden">Importer</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ny ordre</span>
              <span className="sm:hidden">Ny</span>
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card
            className="p-3 sm:p-4 border-0 shadow-sm dark:bg-slate-900 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700 transition-all"
            onClick={() => setStatusFilter(statusFilter === 'opprettet' ? 'all' : 'opprettet')}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.opprettet}</p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Opprettet</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-3 sm:p-4 border-0 shadow-sm dark:bg-slate-900 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
            onClick={() => setStatusFilter(statusFilter === 'sendt' ? 'all' : 'sendt')}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.sendt}</p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Sendt</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-3 sm:p-4 border-0 shadow-sm dark:bg-slate-900 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-200 dark:hover:ring-emerald-800 transition-all"
            onClick={() => setStatusFilter(statusFilter === 'godkjent' ? 'all' : 'godkjent')}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.godkjent}</p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Godkjent</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">Kr.</span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {(totalValue / 1000).toFixed(0)}k
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Total verdi</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter ordre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-40 rounded-xl dark:bg-slate-900 dark:border-slate-700">
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
              <SelectTrigger className="flex-1 sm:w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
                <SelectValue placeholder="Prosjekt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle prosjekter</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 sm:p-6 animate-pulse border-0 shadow-sm">
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
          <div className="space-y-3 sm:space-y-4">
            {/* Bulk Actions Header */}
            <div className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <Checkbox
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedOrders.length > 0 ? `${selectedOrders.length} valgt` : 'Velg alle'}
              </span>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="p-3 sm:p-4 border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        window.location.href = createPageUrl(`OrdreDetaljer?id=${order.id}`);
                      }}>
                      {/* Top row: number + status */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                          {order.order_number}
                        </h3>
                        <StatusBadge status={order.status} />
                        {order.source_type && order.source_type !== 'manual' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            Fra {order.source_type === 'quote' ? 'Tilbud' : order.source_type === 'deviation' ? 'Avvik' : 'Endring'}
                          </span>
                        )}
                      </div>

                      {/* Sent badge — own row on mobile */}
                      {order.sent_to_customer && (
                        <div className="mb-1.5">
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sendt {format(new Date(order.sent_date), 'd. MMM HH:mm', { locale: nb })}
                          </span>
                        </div>
                      )}

                      {/* Meta info: wraps gracefully on mobile */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[120px] sm:max-w-none">{order.customer_name}</span>
                        </span>
                        {order.project_id && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{getProjectName(order.project_id)}</span>
                          </span>
                        )}
                        {order.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            {format(new Date(order.due_date), 'd. MMM yyyy', { locale: nb })}
                          </span>
                        )}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          kr {order.total_amount?.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(order.status === 'opprettet' || order.status === 'sendt') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowEmailDialog(true);
                          }}
                          className="rounded-xl gap-1 h-8 px-2.5">
                          <Send className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Send</span>
                        </Button>
                      )}
                      <ChevronRight
                        className="h-5 w-5 text-slate-400 cursor-pointer"
                        onClick={() => { window.location.href = createPageUrl(`OrdreDetaljer?id=${order.id}`); }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create from Source Dialog */}
      <Dialog open={showSourceDialog} onOpenChange={(v) => { setShowSourceDialog(v); if (!v) setSourceType(null); }}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Opprett ordre fra eksisterende</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Velg kilde for den nye ordren</p>
          </DialogHeader>

          {!sourceType ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
              <button onClick={() => setSourceType('quote')} className="group text-left">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-300 h-full p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2">Fra tilbud</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Velg et godkjent tilbud og opprett ordre automatisk</p>
                    {approvedQuotes.length > 0 && (
                      <div className="mt-2 sm:mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {approvedQuotes.length} tilbud tilgjengelig
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <button onClick={() => setSourceType('deviation')} className="group text-left">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all duration-300 h-full p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2">Fra avvik</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Velg et godkjent avvik med kostnadskonsekvens</p>
                    {approvedDeviations.length > 0 && (
                      <div className="mt-2 sm:mt-3 text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {approvedDeviations.length} avvik tilgjengelig
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <button onClick={() => setSourceType('change')} className="group text-left">
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 h-full p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                      <Send className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2">Fra endringsmelding</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Velg en godkjent endringsmelding og opprett ordre</p>
                    {approvedChanges.length > 0 && (
                      <div className="mt-2 sm:mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {approvedChanges.length} endringer tilgjengelig
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setSourceType(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-2"
              >
                ← Tilbake
              </button>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {sourceType === 'quote' && approvedQuotes.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Ingen godkjente tilbud</p>
                )}
                {sourceType === 'quote' && approvedQuotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className="p-4 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-none transition-colors"
                    onClick={() => { createFromSourceMutation.mutate({ sourceType: 'quote', sourceId: quote.id }); setShowSourceDialog(false); setSourceType(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{quote.quote_number}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{quote.customer_name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Card>
                ))}

                {sourceType === 'deviation' && approvedDeviations.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Ingen godkjente avvik med kostnadskonsekvens</p>
                )}
                {sourceType === 'deviation' && approvedDeviations.map((dev) => (
                  <Card
                    key={dev.id}
                    className="p-4 cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-none transition-colors"
                    onClick={() => { createFromSourceMutation.mutate({ sourceType: 'deviation', sourceId: dev.id }); setShowSourceDialog(false); setSourceType(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{dev.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">kr {dev.cost_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Card>
                ))}

                {sourceType === 'change' && approvedChanges.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Ingen godkjente endringsmeldinger</p>
                )}
                {sourceType === 'change' && approvedChanges.map((change) => (
                  <Card
                    key={change.id}
                    className="p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-none transition-colors"
                    onClick={() => { createFromSourceMutation.mutate({ sourceType: 'change', sourceId: change.id }); setShowSourceDialog(false); setSourceType(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{change.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">kr {change.amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <OrderForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createOrderMutation.mutate(data)}
        onSubmitAndSend={handleSubmitAndSend}
      />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett {selectedOrders.length} ordre?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette {selectedOrders.length} ordre? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)} className="rounded-xl">Avbryt</Button>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 rounded-xl">Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sent Confirmation Dialog */}
      <AlertDialog open={showSentConfirmDialog} onOpenChange={setShowSentConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Ordre sendt!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ordren er opprettet og e-post er sendt til mottaker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSentConfirmDialog(false)} className="bg-emerald-600 hover:bg-emerald-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}