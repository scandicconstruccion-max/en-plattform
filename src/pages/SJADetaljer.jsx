import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { Calendar, FileText, CheckCircle2, Edit, Save, X, Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function SJADetaljer() {
  const [editMode, setEditMode] = useState(false);
  const [newEksternDeltaker, setNewEksternDeltaker] = useState({ navn: '', epost: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const sjaId = urlParams.get('id');

  const { data: sja, isLoading } = useQuery({
    queryKey: ['sja', sjaId],
    queryFn: async () => {
      const list = await base44.entities.SJA.list();
      return list.find((s) => s.id === sjaId);
    },
    enabled: !!sjaId
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (sja) {
      setFormData(sja);
    }
  }, [sja]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SJA.update(sjaId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries(['sja']);
      setEditMode(false);
      toast.success('SJA oppdatert');

      // Send email to external participants
      if (formData.deltakere_eksterne?.length > 0) {
        for (const deltaker of formData.deltakere_eksterne) {
          if (deltaker.epost) {
            try {
              await base44.integrations.Core.SendEmail({
                to: deltaker.epost,
                subject: `SJA - ${formData.arbeidsoperasjon}`,
                body: `Hei ${deltaker.navn},\n\nDu har blitt registrert som deltaker på følgende Sikker Jobb Analyse:\n\nArbeidsoperasjon: ${formData.arbeidsoperasjon}\nDato: ${formData.sikkerhetsanalyse_utfort}\n\nMed vennlig hilsen`
              });
            } catch (error) {
              console.error('Failed to send email:', error);
            }
          }
        }
      }
    }
  });

  const godkjennMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SJA.update(sjaId, {
        ...formData,
        status: 'godkjent',
        godkjent_av: user.email,
        godkjent_dato: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sja']);
      toast.success('SJA godkjent');
    }
  });

  const handleSave = () => {
    const deltakereNavn = formData.deltakere_ansatte?.map((email) => {
      const emp = employees.find((e) => e.email === email);
      return emp ? `${emp.first_name} ${emp.last_name}` : email;
    }) || [];

    const ansvarligEmp = employees.find((e) => e.email === formData.ansvarlig);

    updateMutation.mutate({
      ...formData,
      deltakere_ansatte_navn: deltakereNavn,
      ansvarlig_navn: ansvarligEmp ? `${ansvarligEmp.first_name} ${ansvarligEmp.last_name}` : formData.ansvarlig
    });
  };

  const addEksternDeltaker = () => {
    if (!newEksternDeltaker.navn || !newEksternDeltaker.epost) {
      toast.error('Fyll ut navn og e-post');
      return;
    }
    setFormData({
      ...formData,
      deltakere_eksterne: [...(formData.deltakere_eksterne || []), newEksternDeltaker]
    });
    setNewEksternDeltaker({ navn: '', epost: '' });
  };

  const removeEksternDeltaker = (index) => {
    const updated = [...(formData.deltakere_eksterne || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, deltakere_eksterne: updated });
  };

  const toggleFaremoment = (faremoment) => {
    const current = formData.faremomenter || [];
    if (current.includes(faremoment)) {
      setFormData({
        ...formData,
        faremomenter: current.filter((f) => f !== faremoment)
      });
    } else {
      setFormData({
        ...formData,
        faremomenter: [...current, faremoment]
      });
    }
  };

  const getFaremomentLabel = (key) => {
    const labels = {
      personskade: 'Personskade',
      materielle_skader: 'Materielle skader',
      forurensning: 'Forurensning',
      fallfare: 'Fallfare',
      elektrisk_fare: 'Elektrisk fare',
      annet: 'Annet'
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return <div className="p-8">Laster...</div>;
  }

  if (!sja) {
    return <div className="p-8">SJA ikke funnet</div>;
  }

  const project = projects.find((p) => p.id === sja.project_id);
  const getStatusColor = (status) => {
    switch (status) {
      case 'godkjent':return 'bg-green-100 text-green-700 border-green-200';
      case 'arkivert':return 'bg-slate-100 text-slate-700 border-slate-200';
      default:return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={sja.arbeidsoperasjon}
        subtitle={`${project?.name || 'Ukjent prosjekt'} • ${format(new Date(sja.sikkerhetsanalyse_utfort || sja.dato || sja.created_date), 'dd.MM.yyyy', { locale: nb })}`}
        showBack
        backUrl={createPageUrl('SJA')}
        actions={
        <div className="flex gap-2">
            





            {!editMode ?
          <Button onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Rediger
              </Button> :

          <>
                <Button variant="outline" onClick={() => {setEditMode(false);setFormData(sja);}}>
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Lagre
                </Button>
              </>
          }
          </div>
        } />


      <div className="px-6 lg:px-8 py-8 space-y-6">
        {/* Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(sja.status)}>
                {sja.status === 'godkjent' ? 'Godkjent' : sja.status === 'arkivert' ? 'Arkivert' : 'Opprettet'}
              </Badge>
              {sja.godkjent_av &&
              <span className="text-sm text-slate-500">
                  Godkjent av {sja.godkjent_av} • {format(new Date(sja.godkjent_dato), 'dd.MM.yyyy HH:mm', { locale: nb })}
                </span>
              }
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ?
            <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sikkerhetsanalyse utført *</Label>
                    <Input
                    type="date"
                    value={formData.sikkerhetsanalyse_utfort || formData.dato || ''}
                    onChange={(e) => setFormData({ ...formData, sikkerhetsanalyse_utfort: e.target.value })} />

                  </div>
                  <div>
                    <Label>Jobb utføres</Label>
                    <Input
                    type="date"
                    value={formData.jobb_utfores || ''}
                    onChange={(e) => setFormData({ ...formData, jobb_utfores: e.target.value })} />

                  </div>
                </div>
                <div>
                  <Label>Ansvarlig *</Label>
                  <Select
                  value={formData.ansvarlig}
                  onValueChange={(value) => setFormData({ ...formData, ansvarlig: value })}>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) =>
                    <SelectItem key={employee.id} value={employee.email}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div>
              </> :

            <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Sikkerhetsanalyse utført</Label>
                    <p className="font-medium mt-1">
                      {format(new Date(sja.sikkerhetsanalyse_utfort || sja.dato || sja.created_date), 'dd.MM.yyyy', { locale: nb })}
                    </p>
                  </div>
                  {sja.jobb_utfores &&
                <div>
                      <Label className="text-slate-500">Jobb utføres</Label>
                      <p className="font-medium mt-1">{format(new Date(sja.jobb_utfores), 'dd.MM.yyyy', { locale: nb })}</p>
                    </div>
                }
                </div>
                <div>
                  <Label className="text-slate-500">Ansvarlig</Label>
                  <p className="font-medium mt-1">{sja.ansvarlig_navn || sja.ansvarlig}</p>
                </div>
              </>
            }
          </CardContent>
        </Card>

        {/* Deltakere */}
        <Card>
          <CardHeader>
            <CardTitle>Deltakere</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ?
            <>
                <div>
                  <Label>Deltakere fra bedriften</Label>
                  <Select
                  onValueChange={(value) => {
                    if (!(formData.deltakere_ansatte || []).includes(value)) {
                      setFormData({
                        ...formData,
                        deltakere_ansatte: [...(formData.deltakere_ansatte || []), value]
                      });
                    }
                  }}>

                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Legg til ansatt" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter((e) => !(formData.deltakere_ansatte || []).includes(e.email)).map((employee) =>
                    <SelectItem key={employee.id} value={employee.email}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                  {(formData.deltakere_ansatte || []).length > 0 &&
                <div className="mt-2 space-y-1">
                      {(formData.deltakere_ansatte || []).map((email, idx) => {
                    const emp = employees.find((e) => e.email === email);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                            <span className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : email}</span>
                            <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            deltakere_ansatte: (formData.deltakere_ansatte || []).filter((_, i) => i !== idx)
                          })}>

                              <X className="h-4 w-4" />
                            </Button>
                          </div>);

                  })}
                    </div>
                }
                </div>

                <div>
                  <Label>Andre deltakere (ikke ansatte)</Label>
                  <div className="mt-1.5 space-y-2">
                    <div className="flex gap-2">
                      <Input
                      placeholder="Navn"
                      value={newEksternDeltaker.navn}
                      onChange={(e) => setNewEksternDeltaker({ ...newEksternDeltaker, navn: e.target.value })} />

                      <Input
                      type="email"
                      placeholder="E-post"
                      value={newEksternDeltaker.epost}
                      onChange={(e) => setNewEksternDeltaker({ ...newEksternDeltaker, epost: e.target.value })} />

                      <Button type="button" variant="outline" onClick={addEksternDeltaker}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(formData.deltakere_eksterne || []).length > 0 &&
                  <div className="space-y-1">
                        {(formData.deltakere_eksterne || []).map((deltaker, idx) =>
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                            <div className="text-sm">
                              <span className="font-medium">{deltaker.navn}</span>
                              <span className="text-slate-500 ml-2">({deltaker.epost})</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeEksternDeltaker(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                    )}
                      </div>
                  }
                  </div>
                </div>
              </> :

            <>
                {(sja.deltakere_ansatte_navn || sja.deltakere_navn || []).length > 0 &&
              <div>
                    <Label className="text-slate-500">Deltakere fra bedriften</Label>
                    <ul className="mt-2 space-y-1">
                      {(sja.deltakere_ansatte_navn || sja.deltakere_navn || []).map((navn, idx) =>
                  <li key={idx} className="text-sm">• {navn}</li>
                  )}
                    </ul>
                  </div>
              }
                {(sja.deltakere_eksterne || []).length > 0 &&
              <div>
                    <Label className="text-slate-500">Andre deltakere</Label>
                    <ul className="mt-2 space-y-1">
                      {(sja.deltakere_eksterne || []).map((deltaker, idx) =>
                  <li key={idx} className="text-sm">• {deltaker.navn} ({deltaker.epost})</li>
                  )}
                    </ul>
                  </div>
              }
              </>
            }
          </CardContent>
        </Card>

        {/* Arbeidsoperasjon */}
        <Card>
          <CardHeader>
            <CardTitle>Arbeidsoperasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ?
            <>
                <div>
                  <Label>Arbeidsoperasjon *</Label>
                  <Input
                  value={formData.arbeidsoperasjon || ''}
                  onChange={(e) => setFormData({ ...formData, arbeidsoperasjon: e.target.value })} />

                </div>
                <div>
                  <Label>Beskrivelse av arbeidsoperasjonen</Label>
                  <Textarea
                  value={formData.beskrivelse_av_arbeidsoperasjonen || formData.beskrivelse_av_arbeid || ''}
                  onChange={(e) => setFormData({ ...formData, beskrivelse_av_arbeidsoperasjonen: e.target.value })}
                  rows={2} />

                </div>
              </> :

            <>
                <div>
                  <Label className="text-slate-500">Arbeidsoperasjon</Label>
                  <p className="font-medium mt-1">{sja.arbeidsoperasjon}</p>
                </div>
                {(sja.beskrivelse_av_arbeidsoperasjonen || sja.beskrivelse_av_arbeid) &&
              <div>
                    <Label className="text-slate-500">Beskrivelse</Label>
                    <p className="mt-1 whitespace-pre-wrap">{sja.beskrivelse_av_arbeidsoperasjonen || sja.beskrivelse_av_arbeid}</p>
                  </div>
              }
              </>
            }
          </CardContent>
        </Card>

        {/* Risikovurdering */}
        <Card>
          <CardHeader>
            <CardTitle>Risikovurdering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ?
            <>
                <div>
                  <Label>Faremomenter</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                  { key: 'personskade', label: 'Personskade' },
                  { key: 'materielle_skader', label: 'Materielle skader' },
                  { key: 'forurensning', label: 'Forurensning' },
                  { key: 'fallfare', label: 'Fallfare' },
                  { key: 'elektrisk_fare', label: 'Elektrisk fare' },
                  { key: 'annet', label: 'Annet' }].
                  map(({ key, label }) =>
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFaremoment(key)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    (formData.faremomenter || []).includes(key) ?
                    'border-emerald-500 bg-emerald-50 text-emerald-700' :
                    'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`
                    }>

                        {label}
                      </button>
                  )}
                  </div>
                </div>

                <div>
                  <Label>Konsekvensgrad</Label>
                  <Select
                  value={formData.konsekvensgrad || ''}
                  onValueChange={(value) => setFormData({ ...formData, konsekvensgrad: value })}>

                    <SelectTrigger>
                      <SelectValue placeholder="Velg konsekvensgrad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lav">Lav</SelectItem>
                      <SelectItem value="middels">Middels</SelectItem>
                      <SelectItem value="hoy">Høy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tiltak</Label>
                  <Textarea
                  value={formData.tiltak || ''}
                  onChange={(e) => setFormData({ ...formData, tiltak: e.target.value })}
                  rows={3} />

                </div>
              </> :

            <>
                {(sja.faremomenter || []).length > 0 &&
              <div>
                    <Label className="text-slate-500">Faremomenter</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(sja.faremomenter || []).map((f, idx) =>
                  <Badge key={idx} variant="outline">{getFaremomentLabel(f)}</Badge>
                  )}
                    </div>
                  </div>
              }
                {sja.konsekvensgrad &&
              <div>
                    <Label className="text-slate-500">Konsekvensgrad</Label>
                    <p className="font-medium mt-1 capitalize">{sja.konsekvensgrad}</p>
                  </div>
              }
                {sja.tiltak &&
              <div>
                    <Label className="text-slate-500">Tiltak</Label>
                    <p className="mt-1 whitespace-pre-wrap">{sja.tiltak}</p>
                  </div>
              }
              </>
            }
          </CardContent>
        </Card>

        {/* Vedlegg */}
        <Card>
          <CardHeader>
            <CardTitle>Vedlegg</CardTitle>
          </CardHeader>
          <CardContent>
            {editMode ?
            <FileUploadSection
              files={formData.vedlegg || []}
              onFilesChange={(files) => setFormData({ ...formData, vedlegg: files })}
              projectId={sja.project_id} /> :


            <>
                {(sja.vedlegg || []).length > 0 ?
              <div className="space-y-2">
                    {(sja.vedlegg || []).map((url, idx) =>
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors">

                        <FileText className="h-5 w-5 text-slate-400" />
                        <span className="text-emerald-600 hover:underline">Vedlegg {idx + 1}</span>
                      </a>
                )}
                  </div> :

              <p className="text-slate-400 italic">Ingen vedlegg</p>
              }
              </>
            }
          </CardContent>
        </Card>
      </div>
    </div>);

}