import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { formatAmount } from '@/components/shared/formatNumber';

export default function ApproveQuote() {
  const [approving, setApproving] = useState(false);
  const [status, setStatus] = useState('loading');
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || window.location.pathname.split('/').pop();

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });

  const quote = quotes.find(q => q.approval_token === token);

  useEffect(() => {
    if (!quote) {
      setStatus('error');
    } else if (quote.status === 'godkjent') {
      setStatus('already_approved');
    } else {
      setStatus('ready');
    }
  }, [quote]);

  const handleApprove = async () => {
    if (!quote) return;
    
    setApproving(true);
    
    try {
      await base44.entities.Quote.update(quote.id, {
        status: 'godkjent',
        approved_date: new Date().toISOString(),
        approved_by_email: quote.customer_email
      });

      await base44.integrations.Core.SendEmail({
        to: quote.created_by || 'post@example.com',
        subject: `Tilbud ${quote.quote_number} godkjent`,
        body: `Tilbud ${quote.quote_number} for ${quote.customer_name} har blitt godkjent.\n\nProsjekt: ${quote.project_description || 'Ikke spesifisert'}\nTotalbeløp: ${formatAmount((quote.total_amount || 0) + (quote.vat_amount || 0))}`
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
            <p className="text-slate-600 dark:text-slate-400">Laster tilbud...</p>
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
              Dette tilbudet har allerede blitt godkjent.
            </p>
          </div>
        )}

        {status === 'ready' && quote && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Godkjenn tilbud
            </h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tilbudsnummer</p>
                <p className="font-medium text-slate-900 dark:text-white">{quote.quote_number}</p>
              </div>
              {quote.project_description && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prosjekt</p>
                  <p className="text-slate-900 dark:text-white">{quote.project_description}</p>
                </div>
              )}
              {quote.items && quote.items.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Tilbudslinjer</p>
                  {quote.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-2 rounded mb-1 text-sm">
                      <span className="text-slate-900 dark:text-white">{item.description}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Totalbeløp (inkl. mva)</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatAmount((quote.total_amount || 0) + (quote.vat_amount || 0))}
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
                  Godkjenn tilbud
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
              Tilbud godkjent!
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