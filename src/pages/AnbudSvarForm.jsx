import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AnbudSvarForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loginCode, setLoginCode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    price: '',
    currency: 'NOK',
    notes: '',
    fileAttachments: [],
  });

  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Load invitation data on mount
  useEffect(() => {
    if (!token) {
      setError('Token mangler. Sjekk lenken i e-posten.');
      return;
    }

    loadInvitationData();
  }, [token]);

  const loadInvitationData = async () => {
    try {
      const res = await base44.functions.invoke('anbudValidateAndAuthGuest', { token });
      setInvitationData(res.data);
      setFormData(prev => ({
        ...prev,
        contactEmail: res.data.invitation.supplierEmail || '',
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Kunne ikke laste forespørselen.');
    }
  };

  // Validate login code
  const validateLoginCode = async () => {
    if (!loginCode || !invitationData) return;
    
    try {
      const res = await base44.functions.invoke('anbudValidateLoginCode', {
        token,
        loginCode: loginCode.replace(/\s/g, ''), // Remove spaces
      });
      
      if (res.data.valid) {
        setAuthenticated(true);
        setError('');
      } else {
        setError('Innloggingskoden er feil. Prøv igjen.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Feil ved validering av kode.');
    }
  };



  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await base44.integrations.Core.UploadFile({ file });
        newFiles.push({
          name: file.name,
          url: res.file_url,
        });
      }
      setFormData(prev => ({
        ...prev,
        fileAttachments: [...prev.fileAttachments, ...newFiles],
      }));
    } catch (err) {
      setError('Feil ved opplasting av fil.');
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      fileAttachments: prev.fileAttachments.filter((_, i) => i !== index),
    }));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('anbudSubmitQuote', {
        token,
        projectId: invitationData.invitation.anbudProjectId,
        invitationId: invitationData.invitation.id,
        companyName: formData.companyName || invitationData.invitation.supplierName,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        price: formData.price,
        currency: formData.currency,
        notes: formData.notes,
        fileAttachments: formData.fileAttachments,
      });
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Feil ved innsending av tilbud.');
    },
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Feil</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Show login code entry screen if not authenticated
  if (!authenticated) {
    const supplierEmail = invitationData.invitation.supplierEmail;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Innlogging</CardTitle>
            <CardDescription>Skriv inn innloggingskoden fra e-posten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label className="text-sm">E-post</Label>
              <div className="p-3 bg-slate-100 rounded text-sm font-medium text-slate-700">
                {supplierEmail}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginCode">Innloggingskode *</Label>
              <Input
                id="loginCode"
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="Skriv inn 6-sifret kode"
                className="text-center text-lg font-mono tracking-widest"
                maxLength="6"
                onKeyPress={(e) => e.key === 'Enter' && validateLoginCode()}
              />
              <p className="text-xs text-slate-500">Koden ble sendt i e-posten</p>
            </div>

            <Button
              onClick={validateLoginCode}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!loginCode || loginCode.length !== 6}
            >
              Logg inn
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <CardTitle>Tilbud levert!</CardTitle>
            <CardDescription>Takk for tilbudet ditt</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Ditt tilbud har blitt registrert. Prosjektleder vil vurdere tilbudene og ta kontakt hvis det er behov for oppklaringer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = invitationData.project;
  const deadline = project.responseDeadline ? new Date(project.responseDeadline).toLocaleDateString('nb-NO') : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{project.title}</CardTitle>
            <CardDescription>{project.tradeType}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <Label className="text-sm font-semibold">Beskrivelse</Label>
                <p className="text-sm text-slate-600 mt-1">{project.description}</p>
              </div>
            )}
            {deadline && (
              <div>
                <Label className="text-sm font-semibold">Svarfrist</Label>
                <p className="text-sm text-slate-600 mt-1">{deadline}</p>
              </div>
            )}
            {project.fileAttachments?.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">Vedlegg</Label>
                <ul className="mt-2 space-y-1">
                  {project.fileAttachments.map((file, idx) => (
                    <li key={idx}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bid Form */}
        <Card>
          <CardHeader>
            <CardTitle>Levering av tilbud</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              submitMutation.mutate();
            }} className="space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Leverandørinformasjon</h3>
                
                <div>
                  <Label htmlFor="companyName">Bedriftsnavn *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder={invitationData.invitation.supplierName}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contactName">Kontaktperson</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Ditt navn"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail">E-post *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Telefon</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="Din telefon"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Bid Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Tilbudsinformasjon</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="price">Pris *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Valuta</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Kommentarer</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Eventuell tilleggsinformasjon"
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Vedlegg</h3>
                
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-900">Klikk for å laste opp filer</p>
                    <p className="text-xs text-slate-500">eller dra og slipp filer her</p>
                  </label>
                </div>

                {formData.fileAttachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.fileAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-100 rounded">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                        >
                          Fjern
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!formData.companyName || !formData.contactEmail || !formData.price || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sender...
                  </>
                ) : (
                  'Lever tilbud'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}