import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { formatAmount } from '@/components/shared/formatNumber';

const ACTION_CONFIG = {
  offer:    { entity: 'Quote',              label: 'Tilbud',          numberField: 'quote_number',  approvedStatus: 'godkjent' },
  change:   { entity: 'ChangeNotification', label: 'Endringsmelding', numberField: 'change_number', approvedStatus: 'godkjent' },
  order:    { entity: 'Order',              label: 'Ordre',           numberField: 'order_number',  approvedStatus: 'godkjent' },
  deviation:{ entity: 'Deviation',          label: 'Avvik',           numberField: 'deviation_number', approvedStatus: 'godkjent_kunde' },
};

export default function Godkjenning() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const id     = urlParams.get('id');
  const token  = urlParams.get('token');

  const [pageStatus, setPageStatus] = useState('loading'); // loading | ready | approving | success | already_approved | invalid
  const [record, setRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const config = ACTION_CONFIG[action];

  useEffect(() => {
    const load = async () => {
      if (!action || !id || !token || !config) {
        setPageStatus('invalid');
        setErrorMsg('Manglende eller ukjent parametere i lenken.');
        return;
      }
      try {
        const rec = await base44.entities[config.entity].read(id);
        if (!rec || rec.approval_token !== token) {
          setPageStatus('invalid');
          setErrorMsg('Ugyldig eller utløpt godkjenningslenke.');
          return;
        }
        if (rec.status === config.approvedStatus || rec.customer_approved === true) {
          setPageStatus('already_approved');
          setRecord(rec);
          return;
        }
        setRecord(rec);
        setPageStatus('ready');
      } catch {
        setPageStatus('invalid');
        setErrorMsg('Kunne ikke laste dokumentet. Lenken kan være utløpt.');
      }
    };
    load();
  }, []);

  const handleApprove = async () => {
    if (!record || !config) return;
    setPageStatus('approving');
    try {
      const updateData = {
        status: config.approvedStatus,
        approved_date: new Date().toISOString(),
        approved_by_email: record.customer_email || 'ukjent',
      };

      // Avvik bruker eget felt
      if (action === 'deviation') {
        updateData.customer_approved = true;
        updateData.customer_approved_date = new Date().toISOString();
        const existingLog = record.activity_log || [];
        updateData.activity_log = [...existingLog, {
          action: 'godkjent_kunde',
          timestamp: new Date().toISOString(),
          user_email: record.customer_email || 'ukjent',
          user_name: record.customer_name || 'Kunde',
          details: 'Kunde godkjente via e-postlenke',
        }];
      }

      await base44.entities[config.entity].update(record.id, updateData);

      // Varsle avsender
      const notifyEmail = record.created_by || record.project_manager || null;
      const docNumber = record[config.numberField] || id;
      if (notifyEmail) {
        await base44.integrations.Core.SendEmail({
          to: notifyEmail,
          subject: `${config.label} ${docNumber} er godkjent`,
          body: `${config.label} ${docNumber} for ${record.customer_name || 'ukjent kunde'} har blitt godkjent av mottaker.\n\nDato: ${new Date().toLocaleString('nb-NO')}`,
        });
      }

      setPageStatus('success');
    } catch {
      setPageStatus('invalid');
      setErrorMsg('Det oppstod en feil ved godkjenning. Prøv igjen eller kontakt avsender.');
    }
  };

  const totalWithVat = record
    ? (record.total_amount || 0) + (record.vat_amount || record.total_amount * 0.25 || 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 border-0 shadow-lg">

        {/* LOADING */}
        {pageStatus === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Laster dokument…</p>
          </div>
        )}

        {/* INVALID */}
        {pageStatus === 'invalid' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ugyldig lenke</h2>
            <p className="text-slate-500 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* ALREADY APPROVED */}
        {pageStatus === 'already_approved' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Allerede godkjent</h2>
            <p className="text-slate-500 text-sm">
              {config?.label} er allerede godkjent.
            </p>
          </div>
        )}

        {/* READY */}
        {(pageStatus === 'ready' || pageStatus === 'approving') && record && config && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Godkjenn {config.label.toLowerCase()}</h2>
            <p className="text-slate-500 text-sm mb-6">Gjennomgå informasjonen nedenfor og bekreft godkjenning.</p>

            <div className="space-y-3 mb-8">
              {record[config.numberField] && (
                <Row label={`${config.label}snummer`} value={record[config.numberField]} />
              )}
              {record.customer_name && (
                <Row label="Kunde" value={record.customer_name} />
              )}
              {record.project_name && (
                <Row label="Prosjekt" value={record.project_name} />
              )}
              {record.project_description && (
                <Row label="Beskrivelse" value={record.project_description} />
              )}
              {record.description && (
                <Row label="Beskrivelse" value={record.description} />
              )}
              {record.title && (
                <Row label="Tittel" value={record.title} />
              )}
              {(record.total_amount != null) && (
                <div className="bg-slate-50 rounded-xl p-4 mt-4">
                  <p className="text-sm text-slate-500 mb-1">Totalbeløp inkl. mva</p>
                  <p className="text-3xl font-bold text-slate-900">{formatAmount(totalWithVat)}</p>
                </div>
              )}
              {record.cost_amount != null && !record.total_amount && (
                <div className="bg-slate-50 rounded-xl p-4 mt-4">
                  <p className="text-sm text-slate-500 mb-1">Kostnad</p>
                  <p className="text-3xl font-bold text-slate-900">{formatAmount(record.cost_amount)}</p>
                </div>
              )}
              {record.amount != null && !record.total_amount && !record.cost_amount && (
                <div className="bg-slate-50 rounded-xl p-4 mt-4">
                  <p className="text-sm text-slate-500 mb-1">Beløp</p>
                  <p className="text-3xl font-bold text-slate-900">{formatAmount(record.amount)}</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleApprove}
              disabled={pageStatus === 'approving'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 text-base gap-2"
            >
              {pageStatus === 'approving' ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Godkjenner…</>
              ) : (
                <><CheckCircle2 className="h-5 w-5" /> Bekreft godkjenning</>
              )}
            </Button>
          </div>
        )}

        {/* SUCCESS */}
        {pageStatus === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {config?.label} godkjent!
            </h2>
            <p className="text-slate-500 text-sm">
              Takk for godkjenningen. Avsender er varslet automatisk.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-8">En Plattform</p>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-slate-800 font-medium text-sm mt-0.5">{value}</p>
    </div>
  );
}