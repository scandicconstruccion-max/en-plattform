import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function GodkjennEkstrakostnad() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const action = urlParams.get('action'); // 'godkjenn' | 'avvis' | 'spor'

  const [status, setStatus] = useState('loading'); // loading | form | done | error
  const [ek, setEk] = useState(null);
  const [kommentar, setKommentar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    base44.entities.Ekstrakostnad.filter({ godkjennings_token: token })
      .then((results) => {
        if (!results.length) {
          setStatus('error');
          return;
        }
        const found = results[0];
        if (found.status === 'godkjent' || found.status === 'avvist') {
          setEk(found);
          setStatus('already_done');
          return;
        }
        const expires = found.token_utloper ? new Date(found.token_utloper) : null;
        if (expires && expires < new Date()) {
          setStatus('expired');
          return;
        }
        setEk(found);
        setStatus('form');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleSubmit = async () => {
    if (!ek) return;
    setIsSubmitting(true);

    const newStatus = action === 'godkjenn' ? 'godkjent' : action === 'avvis' ? 'avvist' : 'venter_godkjenning';

    await base44.entities.Ekstrakostnad.update(ek.id, {
      status: newStatus,
      kunde_godkjent_dato: action === 'godkjenn' ? new Date().toISOString() : undefined,
      kundens_kommentar: kommentar || undefined
    });

    setIsSubmitting(false);
    setStatus('done');
  };

  const tidsplanLabels = {
    nei: 'Ingen forsinkelse',
    '1_dag': 'Forsinkelse 1 dag',
    '2_3_dager': 'Forsinkelse 2-3 dager',
    flere_dager: 'Forsinkelse flere dager'
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Ugyldig lenke</h1>
          <p className="text-slate-500">Denne godkjenningslenken er ikke gyldig.</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <XCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lenken er utløpt</h1>
          <p className="text-slate-500">Godkjenningslenken er ikke lenger gyldig. Kontakt prosjektleder.</p>
        </div>
      </div>
    );
  }

  if (status === 'already_done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Allerede behandlet</h1>
          <p className="text-slate-500">Denne merkostnaden er allerede {ek?.status === 'godkjent' ? 'godkjent' : 'avvist'}.</p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    const isApproved = action === 'godkjenn';
    const isQuestion = action === 'spor';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${isApproved ? 'bg-green-100' : isQuestion ? 'bg-slate-100' : 'bg-red-100'}`}>
            {isApproved ? (
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            ) : isQuestion ? (
              <HelpCircle className="h-9 w-9 text-slate-600" />
            ) : (
              <XCircle className="h-9 w-9 text-red-600" />
            )}
          </div>
          <h1 className={`text-xl font-bold ${isApproved ? 'text-green-700' : isQuestion ? 'text-slate-700' : 'text-red-700'}`}>
            {isApproved ? 'Godkjenning Mottatt!' : isQuestion ? 'Spørsmål Sendt!' : 'Avvisning Registrert'}
          </h1>
          <p className="text-slate-600">
            {isApproved
              ? 'Takk! Prosjektleder og håndverker er varslet. Arbeidet kan nå fortsette.'
              : isQuestion
              ? 'Ditt spørsmål er registrert. Prosjektleder vil kontakte deg.'
              : 'Avvisningen er registrert. Prosjektleder vil kontakte deg for å finne en løsning.'}
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Avvik</span>
              <span className="font-medium">{ek?.avvik_tittel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Merkostnad</span>
              <span className="font-semibold">{ek?.belop?.toLocaleString('nb-NO')} kr</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 'form' state
  const actionConfig = {
    godkjenn: { label: 'Godkjenn merkostnad', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle2, title: 'Godkjenn Merkostnad' },
    avvis: { label: 'Avvis merkostnad', color: 'bg-red-600 hover:bg-red-700', icon: XCircle, title: 'Avvis Merkostnad' },
    spor: { label: 'Send spørsmål', color: 'bg-slate-600 hover:bg-slate-700', icon: HelpCircle, title: 'Spør om mer info' }
  };
  const cfg = actionConfig[action] || actionConfig.godkjenn;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{cfg.title}</h1>
          <p className="text-slate-500 mt-1">Prosjekt: {ek?.prosjekt_navn}</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Avvik</span>
            <span className="font-medium text-slate-900">{ek?.avvik_tittel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Kategori</span>
            <span className="text-slate-700">{ek?.avvik_kategori || '-'}</span>
          </div>
          <div className="border-t my-2" />
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">Estimert merkostnad</span>
            <span className="text-xl font-bold text-slate-900">{ek?.belop?.toLocaleString('nb-NO')} kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Årsak</span>
            <span className="text-slate-700 text-right max-w-[200px]">{ek?.arsak}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tidsplan</span>
            <span className="text-slate-700">{tidsplanLabels[ek?.tidsplan_pavirkning] || '-'}</span>
          </div>
        </div>

        {(action === 'avvis' || action === 'spor') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {action === 'avvis' ? 'Årsak til avvisning' : 'Ditt spørsmål'}
            </label>
            <Textarea
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
              placeholder={action === 'avvis' ? 'Hvorfor avviser du merkostnaden?' : 'Hva lurer du på?'}
              rows={3}
              className="rounded-xl"
            />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full rounded-xl text-white text-base py-6 ${cfg.color}`}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <cfg.icon className="h-5 w-5 mr-2" />
          )}
          {cfg.label}
        </Button>
      </div>
    </div>
  );
}