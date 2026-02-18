import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function ApproveOrder() {
  const [approving, setApproving] = useState(false);
  const [status, setStatus] = useState('loading'); // loading, success, error, already_approved
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || window.location.pathname.split('/').pop();

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const order = orders.find(o => o.approval_token === token);

  useEffect(() => {
    if (!order) {
      setStatus('error');
    } else if (order.status === 'godkjent') {
      setStatus('already_approved');
    } else {
      setStatus('ready');
    }
  }, [order]);

  const handleApprove = async () => {
    if (!order) return;
    
    setApproving(true);
    
    try {
      await base44.entities.Order.update(order.id, {
        status: 'godkjent',
        approved_date: new Date().toISOString(),
        approved_by_email: order.customer_email
      });

      // Send notification to sender
      await base44.integrations.Core.SendEmail({
        to: order.uploaded_by || 'post@example.com',
        subject: `Ordre ${order.order_number} godkjent`,
        body: `Ordre ${order.order_number} for ${order.customer_name} har blitt godkjent.\n\nTotalbeløp: kr ${order.total_amount?.toFixed(2) || '0.00'}`
      });

      setStatus('success');
    } catch (error) {
      setStatus('error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-0 shadow-lg dark:bg-slate-900">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Laster ordre...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Ugyldig lenke
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Denne godkjenningslenken er ikke gyldig eller har utløpt.
            </p>
          </div>
        )}

        {status === 'already_approved' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Allerede godkjent
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Denne ordren har allerede blitt godkjent.
            </p>
          </div>
        )}

        {status === 'ready' && order && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Godkjenn ordre
            </h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ordrenummer</p>
                <p className="font-medium text-slate-900 dark:text-white">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Beskrivelse</p>
                <p className="text-slate-900 dark:text-white">{order.description}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Totalbeløp</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  kr {order.total_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
            >
              {approving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Godkjenner...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Godkjenn ordre
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Ordre godkjent!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Takk for godkjenningen. Avsender har blitt varslet.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}