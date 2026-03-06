import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function AnbudSvar() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');
  const invitationId = params.get('invitationId');

  const [project, setProject] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    price: '',
    currency: 'NOK',
    notes: '',
    fileAttachments: [],
  });

  useEffect(() => {
    if (!projectId || !invitationId) {
      setError('Ugyldig lenke. Vennligst bruk lenken fra e-posten du mottok.');
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, invitationId]);

  const loadData = async () => {
    try {
      const [proj, inv] = await Promise.all([
        base44.entities.AnbudProject.get(projectId),
        base44.entities.AnbudInvitation.get(invitationId),
      ]);

      if (!proj || !inv) throw new Error('Forespørselen ble ikke funnet.');
      if (inv.anbudProjectId !== projectId) throw new Error('Ugyldig lenke.');

      setProject(proj);
      setInvitation(inv);

      // Mark as OPENED if not already responded
      if (inv.status === 'INVITED') {
        await base44.entities.AnbudInvitation.update(invitationId, {
          status: 'OPENED',
          openedAt: new Date().toISOString(),
        });
        await base44.entities.AnbudActivityLog.create({
          anbudProjectId: projectId,
          activityType: 'OPENED',
          activityText: `${inv.supplierName} åpnet forespørselen`,
          createdBy: 'system',
        });
      }

      if (inv.status === 'RESPONDED') {
        setSubmitted(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, fileAttachments: [...f.fileAttachments, { name: file.name, url: file_url }] }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.AnbudQuote.create({
        anbudProjectId: projectId,
        supplierId: invitation.supplierId,
        supplierName: invitation.supplierName,
        price: form.price ? parseFloat(form.price) : null,
        currency: form.currency,
        notes: form.notes,
        fileAttachments: form.fileAttachments,
        submittedAt: new Date().toISOString(),
      });

      await base44.entities.AnbudInvitation.update(invitationId, {
        status: 'RESPONDED',
        respondedAt: new Date().toISOString(),
      });

      await base44.entities.AnbudActivityLog.create({
        anbudProjectId: projectId,
        activityType: 'RESPONDED',
        activityText: `Tilbud mottatt fra ${invitation.supplierName}`,
        createdBy: 'system',
      });

      setSubmitted(true);
    } catch (e) {
      setError('Noe gikk galt. Prøv igjen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Feil</h2>
          <p className="text-slate-500">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Tilbud mottatt!</h2>
          <p className="text-slate-500">Takk for at dere leverte tilbud på <strong>{project?.title}</strong>. Vi tar kontakt ved behov.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Lever tilbud</h1>
          <p className="text-slate-500 mt-1">Forespørsel fra En Plattform</p>
        </div>

        {/* Project details */}
        <Card className="border-0 shadow-sm mb-6 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">{project.title}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Fagområde</span>
              <p className="font-medium text-slate-900 mt-0.5">{project.tradeType || '–'}</p>
            </div>
            <div>
              <span className="text-slate-500">Svarfrist</span>
              <p className="font-medium text-red-600 mt-0.5">
                {project.responseDeadline ? format(parseISO(project.responseDeadline), 'd. MMMM yyyy', { locale: nb }) : 'Ikke angitt'}
              </p>
            </div>
          </div>
          {project.description && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-700">{project.description}</div>
          )}
          {project.fileAttachments?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Vedlagte dokumenter</p>
              <div className="space-y-2">
                {project.fileAttachments.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Form */}
        <Card className="border-0 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Ditt tilbud</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Tilbudssum</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Valuta</Label>
                <Input value="NOK" disabled className="mt-1.5 rounded-xl bg-slate-50" />
              </div>
            </div>
            <div>
              <Label>Kommentarer / forbehold</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Eventuelle kommentarer, forbehold eller spørsmål..."
                rows={4}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Vedlegg (tilbudsdokumenter)</Label>
              <div className="mt-1.5 space-y-2">
                {form.fileAttachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                    <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="flex-1 truncate text-slate-700">{file.name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, fileAttachments: f.fileAttachments.filter((_, j) => j !== i) }))}>
                      <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
                <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors text-sm text-slate-500 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Laster opp...' : 'Last opp tilbudsdokument'}
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold mt-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sender...</> : 'Send inn tilbud'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}