import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Upload, Paperclip, X, Clock, FileText, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function BidSubmit() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [loading, setLoading] = useState(true);
  const [rfqData, setRfqData] = useState(null);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (!token) { setError('Ugyldig lenke – mangler token.'); setLoading(false); return; }
    base44.functions.invoke('rfqGetByToken', { token })
      .then(res => {
        setRfqData(res.data);
        setAlreadySubmitted(res.data.already_submitted);
        setLoading(false);
      })
      .catch(err => { setError(err.message || 'Noe gikk galt.'); setLoading(false); });
  }, [token]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await base44.functions.invoke('rfqSubmitBid', { token, comment, attachments });
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Laster forespørsel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Ugyldig lenke</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {alreadySubmitted && !submitted ? 'Tilbud allerede sendt' : 'Tilbud mottatt!'}
          </h2>
          <p className="text-slate-500">
            {alreadySubmitted && !submitted
              ? 'Du har allerede sendt inn tilbud på denne forespørselen.'
              : 'Vi har mottatt ditt tilbud og vil ta kontakt.'}
          </p>
        </div>
      </div>
    );
  }

  const rfq = rfqData?.rfq;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-emerald-700 text-white px-6 py-4">
        <p className="text-sm font-medium opacity-80">Forespørsel om tilbud</p>
        <h1 className="text-xl font-bold mt-0.5">{rfq?.title}</h1>
        {rfqData?.vendor_name && <p className="text-sm opacity-70 mt-0.5">Til: {rfqData.vendor_name}</p>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* RFQ details */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-slate-800 text-lg">Detaljer</h2>
          {rfq?.project_name && (
            <div className="flex gap-2 text-sm">
              <span className="text-slate-500 w-28 flex-shrink-0">Prosjekt:</span>
              <span className="text-slate-800 font-medium">{rfq.project_name}</span>
            </div>
          )}
          {rfq?.trade && (
            <div className="flex gap-2 text-sm">
              <span className="text-slate-500 w-28 flex-shrink-0">Fagområde:</span>
              <span className="text-slate-800">{rfq.trade}</span>
            </div>
          )}
          {rfq?.deadline && (
            <div className="flex gap-2 text-sm items-center">
              <span className="text-slate-500 w-28 flex-shrink-0">Svarfrist:</span>
              <span className="text-slate-800 font-semibold flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-500" />
                {format(parseISO(rfq.deadline), 'd. MMMM yyyy', { locale: nb })}
              </span>
            </div>
          )}
          {rfq?.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Beskrivelse</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{rfq.description}</p>
            </div>
          )}
          {rfq?.attachments?.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-2">Vedlegg fra oppdragsgiver</p>
              <div className="space-y-1">
                {rfq.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Paperclip className="h-4 w-4" /> {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 text-lg">Send inn ditt tilbud</h2>
          <div>
            <Label className="text-slate-700">Kommentar / tilbudsbeskrivelse</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Beskriv tilbudet, pris, leveringstid o.l."
              rows={5}
              className="mt-1.5 rounded-xl text-sm" />
          </div>
          <div>
            <Label className="text-slate-700 block mb-2">Tilbudsdokumenter</Label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <input type="file" className="hidden" onChange={handleUpload} />
              <Upload className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-500">{isUploading ? 'Laster opp...' : 'Klikk for å laste opp fil'}</span>
            </label>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Paperclip className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!comment && attachments.length === 0)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-base font-semibold">
            {isSubmitting ? 'Sender...' : 'Send inn tilbud'}
          </Button>
          <p className="text-xs text-slate-400 text-center">Denne siden er personlig og kan kun brukes av mottaker av invitasjonen.</p>
        </div>
      </div>
    </div>
  );
}