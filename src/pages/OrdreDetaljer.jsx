import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, CheckCircle, FileText, Clock, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import { formatAmount } from '@/components/shared/formatNumber';

export default function OrdreDetaljer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }).then((res) => res[0]),
    enabled: !!orderId
  });

  const { data: project } = useQuery({
    queryKey: ['project', order?.project_id],
    queryFn: () => base44.entities.Project.filter({ id: order.project_id }).then((res) => res[0]),
    enabled: !!order?.project_id
  });

  const handleSendEmail = async (updateData) => {
    await base44.entities.Order.update(orderId, updateData);
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setShowSendDialog(false);
  };

  const markAsApprovedMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Order.update(orderId, {
        status: 'godkjent',
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Ordre godkjent');
    }
  });

  const markAsCompletedMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Order.update(orderId, {
        status: 'utfort'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Ordre markert som utført');
    }
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-slate-500">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={`Ordre ${order.order_number}`}
          subtitle={`Opprettet ${format(new Date(order.created_date), 'dd.MM.yyyy', { locale: nb })}`}
          backUrl={createPageUrl('Ordre')}
        />

        {/* Status */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <StatusBadge status={order.status} />
                {order.source_type !== 'manual' && (
                  <span className="text-xs px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    Fra {order.source_type === 'quote' ? 'Tilbud' : order.source_type === 'deviation' ? 'Avvik' : 'Endring'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {order.status === 'opprettet' && (
                  <Button
                    onClick={() => setShowSendDialog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send ordre
                  </Button>
                )}
                {order.status === 'sendt' && (
                  <>
                    <Button
                      onClick={() => setShowSendDialog(true)}
                      variant="outline"
                      className="rounded-xl gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send på nytt
                    </Button>
                    <Button
                      onClick={() => markAsApprovedMutation.mutate()}
                      disabled={markAsApprovedMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marker som godkjent
                    </Button>
                  </>
                )}
                {order.status === 'godkjent' && (
                  <Button
                    onClick={() => markAsCompletedMutation.mutate()}
                    disabled={markAsCompletedMutation.isPending}
                    variant="outline"
                    className="rounded-xl gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marker som utført
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status */}
        {order.sent_to_customer && (
          <DeliveryStatus
            sentDate={order.sent_date}
            sentToEmail={order.sent_to_email}
            deliveryConfirmed={order.delivery_confirmed}
            deliveryConfirmedDate={order.delivery_confirmed_date}
            downloaded={order.downloaded}
            downloadedDate={order.downloaded_date}
          />
        )}

        {/* Order Info */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Ordreinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Kunde</p>
                <p className="font-medium text-slate-900 dark:text-white">{order.customer_name}</p>
              </div>
              {order.customer_email && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">E-post</p>
                  <p className="font-medium text-slate-900 dark:text-white">{order.customer_email}</p>
                </div>
              )}
              {order.customer_phone && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Telefon</p>
                  <p className="font-medium text-slate-900 dark:text-white">{order.customer_phone}</p>
                </div>
              )}
              {project && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prosjekt</p>
                  <p className="font-medium text-slate-900 dark:text-white">{project.name}</p>
                </div>
              )}
              {order.due_date && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Forfallsdato</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {format(new Date(order.due_date), 'd. MMMM yyyy', { locale: nb })}
                  </p>
                </div>
              )}
              {order.approved_date && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Godkjent dato</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {format(new Date(order.approved_date), 'd. MMMM yyyy HH:mm', { locale: nb })}
                  </p>
                </div>
              )}
            </div>
            {order.description && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Beskrivelse</p>
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{order.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Ordrelinjer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-slate-900 dark:text-white">{item.description}</p>
                      <p className="font-bold text-slate-900 dark:text-white">{formatAmount(item.total)}</p>
                    </div>
                    <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span>{item.quantity} {item.unit}</span>
                      <span>×</span>
                      <span>{formatAmount(item.unit_price)} per {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sum eks. mva:</span>
                <span className="font-semibold">{formatAmount(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>MVA (25%):</span>
                <span className="font-semibold">{formatAmount(order.vat_amount || order.total_amount * 0.25)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t">
                <span>Totalt:</span>
                <span>{formatAmount((order.total_amount || 0) + (order.vat_amount || order.total_amount * 0.25))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Email Dialog */}
      {order && (
        <SendEmailDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          type="ordre"
          item={order}
          onSent={handleSendEmail}
        />
      )}
    </div>
  );
}