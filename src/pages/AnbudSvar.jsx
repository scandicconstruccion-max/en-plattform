import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2, Building2, User, Mail, Phone, Clock } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';

const APP_ID = '699376a31a2b8a2014ee8ac9';

async function callPublicFunction(name, payload) {
  const res = await fetch(`https://api.base44.com/api/v1/apps/${APP_ID}/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Feil fra server');
  return data;
}

export default function AnbudSvar() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
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
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    price: '',
    notes: '',
    fileAttachments: [],
  });

  useEffect(() => {
    if (!token && (!projectId || !invitationId)) {
      setError('Ugyldig lenke. Vennligst bruk lenken fra e-posten du mottok.');
      setLoading(false);
      return;
    }
    loadData();
  }, [token, projectId, invitationId]);

  const loadData = async () => {
    try {
      const data = await callPublicFunction('anbudGetPublic', token ? { token } : { projectId, invitationId });
      if (data.error) throw new Error(data.error);

      setProject(data.project);
      setInvitation(data.invitation);

      // Pre-fill company name from invitation
      if (data.invitation.supplierName) {
        setForm(f => ({ ...f, companyName: data.invitation.supplierName }));
      }
      if (data.invitation.supplierEmail) {
        setForm(f => ({ ...f, contactEmail: data.invitation.supplierEmail }));
      }

      if (data.invitation.status === 'RESPONDED') {
        setSubmitted(true);
      }
    } catch (e) {
      setError(e.message || 'Kunne ikke laste forespørselen.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const res = await fetch(`https://api.base44.com/api/v1/apps/${APP_ID}/functions/anbudUploadFile`, {
        method: 'POST',
        body: formDataUpload,
      });
      const data = await res.json();
      setForm(f => ({ ...f, fileAttachments: [...f.fileAttachments, { name: file.name, url: data.file_url }] }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        price: form.price,
        currency: 'NOK',
        notes: form.notes,
        fileAttachments: form.fileAttachments,
        companyName: form.companyName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
      };
      if (token) {
        payload.token = token;
      } else {
        payload.projectId = projectId;
        payload.invitationId = invitationId;
      }
      const data = await callPublicFunction('anbudSubmitQuote', payload);
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Noe gikk galt. Prøv igjen.');
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

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Ugyldig lenke</h2>
          <p className="text-slate-500">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Tilbud registrert!</h2>
          <p className="text-slate-500 mb-1">Takk for at dere leverte tilbud på</p>
          <p className="font-semibold text-slate-900">{project?.title}</p>
          <p className="text-sm text-slate-400 mt-4">Vi vil ta kontakt dersom tilbudet er aktuelt.</p>
        </Card>
      </div>
    );
  }

  const deadlinePast = project?.responseDeadline && isPast(new Date(project.responseDeadline + 'T23:59:59'));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Leverandørportal</h1>
          <p className="text-slate-500 mt-1 text-sm">Forespørsel om tilbud – En Plattform</p>
        </div>

        {/* Project info card */}
        <Card className="border-0 shadow-sm mb-5 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white">{project.title}</h2>
            {project.tradeType && <p className="text-emerald-100 text-sm mt-0.5">{project.tradeType}</p>}
          </div>
          <div className="p-6 space-y-4">
            {project.responseDeadline && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${deadlinePast ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                <Clock className="h-4 w-4 flex-shrink-0" />
                {deadlinePast ? 'Fristen har gått ut' : `Svarfrist: ${format(parseISO(project.responseDeadline), 'd. MMMM yyyy', { locale: nb })}`}
              </div>
            )}
            {project.description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Beskrivelse</p>
                <p className="text-sm text-slate-700 leading-relaxed">{project.description}</p>
              </div>
            )}
            {project.fileAttachments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vedlegg fra oppdragsgiver</p>
                <div className="space-y-1.5">
                  {project.fileAttachments.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Deadline warning */}
        {deadlinePast && (
          <Card className="border-0 shadow-sm p-6 text-center bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-700">Fristen for å levere tilbud har gått ut.</p>
            <p className="text-sm text-red-500 mt-1">Ta kontakt med oppdragsgiver om du likevel ønsker å levere tilbud.</p>
          </Card>
        )}

        {/* Quote form */}
        {!deadlinePast && (
          <Card className="border-0 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-5">Ditt tilbud</h3>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Supplier info */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Firmainformasjon</p>
                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> Firmanavn *</Label>
                    <Input
                      required
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder="Ditt firmanavn"
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" /> Kontaktperson</Label>
                      <Input
                        value={form.contactName}
                        onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                        placeholder="For- og etternavn"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> Telefon</Label>
                      <Input
                        value={form.contactPhone}
                        onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                        placeholder="+47 000 00 000"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> E-post</Label>
                    <Input
                      type="email"
                      value={form.contactEmail}
                      onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                      placeholder="post@firma.no"
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Price + notes */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tilbudsdetaljer</p>
                <div className="space-y-3">
                  <div>
                    <Label>Tilbudssum (ekskl. mva)</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type="number"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0"
                        className="rounded-xl pr-14"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">NOK</span>
                    </div>
                  </div>
                  <div>
                    <Label>Kommentarer / forbehold</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Eventuelle kommentarer, forbehold eller spørsmål til forespørselen..."
                      rows={4}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <Label>Vedlegg (tilbudsdokumenter, tegninger, kalkyler)</Label>
                <div className="mt-1.5 space-y-2">
                  {form.fileAttachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-sm">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 truncate text-slate-700">{file.name}</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, fileAttachments: f.fileAttachments.filter((_, j) => j !== i) }))}>
                        <X className="h-4 w-4 text-slate-300 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  ))}
                  <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span>{uploading ? 'Laster opp...' : 'Klikk for å laste opp vedlegg (PDF, Excel, bilde)'}</span>
                    <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} multiple={false} />
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !form.companyName}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold mt-2"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sender tilbud...</> : 'Send inn tilbud'}
              </Button>

              <p className="text-xs text-center text-slate-400">
                Denne lenken er personlig og kun knyttet til din bedrift.
              </p>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}