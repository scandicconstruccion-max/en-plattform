import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadSection from '@/components/shared/FileUploadSection';
import ProjectSelector from '@/components/shared/ProjectSelector';
import EmployeeSelector from '@/components/shared/EmployeeSelector';
import { generatePDF } from '@/components/shared/PDFGenerator';
import { Save, Download, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function RUHDetaljer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const ruhId = urlParams.get('id');
  const isNew = urlParams.get('new') === 'true';

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: ruh } = useQuery({
    queryKey: ['ruh', ruhId],
    queryFn: () => base44.entities.RUH.filter({ id: ruhId }).then(res => res[0]),
    enabled: !!ruhId && !isNew
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const [formData, setFormData] = useState({
    project_id: '',
    adresse: '',
    dato: format(new Date(), 'yyyy-MM-dd'),
    klokkeslett: format(new Date(), 'HH:mm'),
    rapportert_av: '',
    rapportert_av_navn: '',
    involverte_personer: [],
    vitner: [],
    type_hendelse: [],
    type_hendelse_annet: '',
    hva_skjedde: '',
    hvordan_skjedde: '',
    hvor_skjedde: '',
    potensiell_konsekvens: '',
    faktisk_konsekvens: 'ingen_skade',
    potensiell_konsekvens_grad: '',
    arsaker: [],
    arsaker_annet: '',
    umiddelbare_tiltak: '',
    forebyggende_tiltak: '',
    tiltak_ansvarlig: '',
    tiltak_ansvarlig_navn: '',
    tiltak_frist: '',
    status: 'apen',
    vedlegg: [],
    lukket_dato: '',
    lukket_kommentar: '',
    lukket_av: '',
    lukket_av_navn: ''
  });

  const [involvertPerson, setInvolvertPerson] = useState({ navn: '', rolle: '' });
  const [vitne, setVitne] = useState('');

  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        rapportert_av: user.email,
        rapportert_av_navn: user.full_name
      }));
    }
  }, [user, isNew]);

  useEffect(() => {
    if (ruh) {
      setFormData({
        ...ruh,
        involverte_personer: ruh.involverte_personer || [],
        vitner: ruh.vitner || [],
        type_hendelse: ruh.type_hendelse || [],
        arsaker: ruh.arsaker || [],
        vedlegg: ruh.vedlegg || []
      });
    }
  }, [ruh]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const activityLog = {
        action: ruhId ? 'oppdatert' : 'opprettet',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: ruhId ? 'RUH oppdatert' : 'RUH opprettet'
      };

      const dataToSave = {
        ...data,
        aktivitetslogg: ruh ? [...(ruh.aktivitetslogg || []), activityLog] : [activityLog]
      };

      if (ruhId && !isNew) {
        return await base44.entities.RUH.update(ruhId, dataToSave);
      } else {
        return await base44.entities.RUH.create(dataToSave);
      }
    },
    onSuccess: (savedRuh) => {
      queryClient.invalidateQueries(['ruh']);
      toast.success(ruhId ? 'RUH oppdatert' : 'RUH opprettet');
      if (isNew) {
        navigate(createPageUrl(`RUHDetaljer?id=${savedRuh.id}`));
      }
    }
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const activityLog = {
        action: 'lukket',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: 'RUH lukket'
      };

      return await base44.entities.RUH.update(ruhId, {
        status: 'lukket',
        lukket_dato: new Date().toISOString(),
        lukket_av: user?.email,
        lukket_av_navn: user?.full_name,
        aktivitetslogg: [...(ruh.aktivitetslogg || []), activityLog]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ruh']);
      toast.success('RUH lukket');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleTypeChange = (type) => {
    const currentTypes = formData.type_hendelse || [];
    if (currentTypes.includes(type)) {
      setFormData({
        ...formData,
        type_hendelse: currentTypes.filter(t => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        type_hendelse: [...currentTypes, type]
      });
    }
  };

  const handleArsakChange = (arsak) => {
    const currentArsaker = formData.arsaker || [];
    if (currentArsaker.includes(arsak)) {
      setFormData({
        ...formData,
        arsaker: currentArsaker.filter(a => a !== arsak)
      });
    } else {
      setFormData({
        ...formData,
        arsaker: [...currentArsaker, arsak]
      });
    }
  };

  const addInvolvertPerson = () => {
    if (involvertPerson.navn) {
      setFormData({
        ...formData,
        involverte_personer: [...(formData.involverte_personer || []), involvertPerson]
      });
      setInvolvertPerson({ navn: '', rolle: '' });
    }
  };

  const removeInvolvertPerson = (index) => {
    setFormData({
      ...formData,
      involverte_personer: formData.involverte_personer.filter((_, i) => i !== index)
    });
  };

  const addVitne = () => {
    if (vitne) {
      setFormData({
        ...formData,
        vitner: [...(formData.vitner || []), vitne]
      });
      setVitne('');
    }
  };

  const removeVitne = (index) => {
    setFormData({
      ...formData,
      vitner: formData.vitner.filter((_, i) => i !== index)
    });
  };

  const handleDownloadPDF = async () => {
    await generatePDF('ruh-content', `RUH-${ruh?.project_id || 'ny'}.pdf`);
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={ruhId && !isNew ? 'Rediger RUH' : 'Ny RUH'}
          subtitle={ruhId && ruh ? `Opprettet ${format(new Date(ruh.created_date), 'dd.MM.yyyy', { locale: nb })}` : 'Registrer uønsket hendelse'}
          backUrl={createPageUrl('RUH')}
          actions={
            ruhId && !isNew && (
              <Button onClick={handleDownloadPDF} variant="outline" className="rounded-xl gap-2">
                <Download className="h-4 w-4" />
                Last ned PDF
              </Button>
            )
          }
        />

        <div id="ruh-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. GRUNNINFORMASJON */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  1. Grunninformasjon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProjectSelector
                  value={formData.project_id}
                  onChange={(value) => {
                    const project = projects.find(p => p.id === value);
                    setFormData({ 
                      ...formData, 
                      project_id: value,
                      adresse: project?.address || formData.adresse
                    });
                  }}
                  required
                />

                <div>
                  <Label>Adresse / Lokasjon</Label>
                  <Input
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Hvor skjedde hendelsen?"
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dato *</Label>
                    <Input
                      type="date"
                      value={formData.dato}
                      onChange={(e) => setFormData({ ...formData, dato: e.target.value })}
                      className="mt-1.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label>Klokkeslett</Label>
                    <Input
                      type="time"
                      value={formData.klokkeslett}
                      onChange={(e) => setFormData({ ...formData, klokkeslett: e.target.value })}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label>Rapportert av</Label>
                  <Input
                    value={formData.rapportert_av_navn || user?.full_name}
                    className="mt-1.5 rounded-xl"
                    disabled
                  />
                </div>

                {/* Involverte personer */}
                <div>
                  <Label>Involverte personer</Label>
                  <div className="mt-2 space-y-2">
                    {formData.involverte_personer?.map((person, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="flex-1 text-sm">{person.navn} {person.rolle && `(${person.rolle})`}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvolvertPerson(idx)}
                          className="text-red-600"
                        >
                          Fjern
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Navn"
                        value={involvertPerson.navn}
                        onChange={(e) => setInvolvertPerson({ ...involvertPerson, navn: e.target.value })}
                        className="rounded-xl"
                      />
                      <Input
                        placeholder="Rolle (valgfritt)"
                        value={involvertPerson.rolle}
                        onChange={(e) => setInvolvertPerson({ ...involvertPerson, rolle: e.target.value })}
                        className="rounded-xl"
                      />
                      <Button type="button" onClick={addInvolvertPerson} variant="outline" className="rounded-xl">
                        Legg til
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Vitner */}
                <div>
                  <Label>Vitner (valgfritt)</Label>
                  <div className="mt-2 space-y-2">
                    {formData.vitner?.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="flex-1 text-sm">{v}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVitne(idx)}
                          className="text-red-600"
                        >
                          Fjern
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Navn på vitne"
                        value={vitne}
                        onChange={(e) => setVitne(e.target.value)}
                        className="rounded-xl"
                      />
                      <Button type="button" onClick={addVitne} variant="outline" className="rounded-xl">
                        Legg til
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. TYPE HENDELSE */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  2. Type hendelse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { value: 'personskade', label: 'Personskade' },
                  { value: 'nestenulykke', label: 'Nestenulykke' },
                  { value: 'materiell_skade', label: 'Materiell skade' },
                  { value: 'miljohendelse', label: 'Miljøhendelse' },
                  { value: 'brudd_rutiner', label: 'Brudd på rutiner' },
                  { value: 'farlig_forhold', label: 'Farlig forhold' },
                  { value: 'avvik_sja', label: 'Avvik fra SJA' },
                  { value: 'annet', label: 'Annet' }
                ].map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={formData.type_hendelse?.includes(type.value)}
                      onCheckedChange={() => handleTypeChange(type.value)}
                    />
                    <label htmlFor={type.value} className="text-sm cursor-pointer">
                      {type.label}
                    </label>
                  </div>
                ))}
                {formData.type_hendelse?.includes('annet') && (
                  <Input
                    placeholder="Beskriv annen type hendelse"
                    value={formData.type_hendelse_annet}
                    onChange={(e) => setFormData({ ...formData, type_hendelse_annet: e.target.value })}
                    className="mt-2 rounded-xl"
                  />
                )}
              </CardContent>
            </Card>

            {/* 3. BESKRIVELSE */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle>3. Beskrivelse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Hva skjedde? *</Label>
                  <Textarea
                    value={formData.hva_skjedde}
                    onChange={(e) => setFormData({ ...formData, hva_skjedde: e.target.value })}
                    rows={3}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Hvordan skjedde det? *</Label>
                  <Textarea
                    value={formData.hvordan_skjedde}
                    onChange={(e) => setFormData({ ...formData, hvordan_skjedde: e.target.value })}
                    rows={3}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Hvor skjedde det? *</Label>
                  <Textarea
                    value={formData.hvor_skjedde}
                    onChange={(e) => setFormData({ ...formData, hvor_skjedde: e.target.value })}
                    rows={2}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Hva kunne konsekvensen blitt? *</Label>
                  <Textarea
                    value={formData.potensiell_konsekvens}
                    onChange={(e) => setFormData({ ...formData, potensiell_konsekvens: e.target.value })}
                    rows={3}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. KONSEKVENS */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle>4. Konsekvens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Faktisk konsekvens</Label>
                  <Select 
                    value={formData.faktisk_konsekvens} 
                    onValueChange={(value) => setFormData({ ...formData, faktisk_konsekvens: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingen_skade">Ingen skade</SelectItem>
                      <SelectItem value="mindre_personskade">Mindre personskade</SelectItem>
                      <SelectItem value="alvorlig_personskade">Alvorlig personskade</SelectItem>
                      <SelectItem value="materiell_skade">Materiell skade</SelectItem>
                      <SelectItem value="miljoskade">Miljøskade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type_hendelse?.includes('nestenulykke') && (
                  <div>
                    <Label>Potensiell konsekvensgrad (ved nestenulykke)</Label>
                    <Select 
                      value={formData.potensiell_konsekvens_grad} 
                      onValueChange={(value) => setFormData({ ...formData, potensiell_konsekvens_grad: value })}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue placeholder="Velg grad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lav">Lav</SelectItem>
                        <SelectItem value="middels">Middels</SelectItem>
                        <SelectItem value="hoy">Høy</SelectItem>
                        <SelectItem value="kritisk">Kritisk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. ÅRSAKSVURDERING */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle>5. Årsaksvurdering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { value: 'manglende_opplaring', label: 'Manglende opplæring' },
                  { value: 'feil_bruk_utstyr', label: 'Feil bruk av utstyr' },
                  { value: 'manglende_sikring', label: 'Manglende sikring' },
                  { value: 'daarlig_planlegging', label: 'Dårlig planlegging' },
                  { value: 'tidsnod', label: 'Tidsnød' },
                  { value: 'brudd_rutine', label: 'Brudd på rutine' },
                  { value: 'ukjent', label: 'Ukjent' },
                  { value: 'annet', label: 'Annet' }
                ].map((arsak) => (
                  <div key={arsak.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`arsak_${arsak.value}`}
                      checked={formData.arsaker?.includes(arsak.value)}
                      onCheckedChange={() => handleArsakChange(arsak.value)}
                    />
                    <label htmlFor={`arsak_${arsak.value}`} className="text-sm cursor-pointer">
                      {arsak.label}
                    </label>
                  </div>
                ))}
                {formData.arsaker?.includes('annet') && (
                  <Input
                    placeholder="Beskriv annen årsak"
                    value={formData.arsaker_annet}
                    onChange={(e) => setFormData({ ...formData, arsaker_annet: e.target.value })}
                    className="mt-2 rounded-xl"
                  />
                )}
              </CardContent>
            </Card>

            {/* 6. TILTAK */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle>6. Tiltak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Umiddelbare tiltak gjennomført</Label>
                  <Textarea
                    value={formData.umiddelbare_tiltak}
                    onChange={(e) => setFormData({ ...formData, umiddelbare_tiltak: e.target.value })}
                    rows={3}
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Foreslåtte forebyggende tiltak</Label>
                  <Textarea
                    value={formData.forebyggende_tiltak}
                    onChange={(e) => setFormData({ ...formData, forebyggende_tiltak: e.target.value })}
                    rows={3}
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <EmployeeSelector
                  label="Ansvarlig for tiltak"
                  value={formData.tiltak_ansvarlig}
                  onChange={(email, name) => setFormData({ 
                    ...formData, 
                    tiltak_ansvarlig: email, 
                    tiltak_ansvarlig_navn: name 
                  })}
                />

                <div>
                  <Label>Frist for gjennomføring</Label>
                  <Input
                    type="date"
                    value={formData.tiltak_frist}
                    onChange={(e) => setFormData({ ...formData, tiltak_frist: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apen">Åpen</SelectItem>
                      <SelectItem value="under_behandling">Under behandling</SelectItem>
                      <SelectItem value="lukket">Lukket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 7. DOKUMENTASJON */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle>7. Dokumentasjon</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadSection
                  attachments={formData.vedlegg}
                  onAttachmentsChange={(files) => setFormData({ ...formData, vedlegg: files })}
                  projectId={formData.project_id}
                  moduleType="ruh"
                />
              </CardContent>
            </Card>

            {/* 8. OPPFØLGING (kun hvis lukket) */}
            {formData.status === 'lukket' && (
              <Card className="border-0 shadow-sm dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>8. Oppfølging</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Kommentar ved lukking</Label>
                    <Textarea
                      value={formData.lukket_kommentar}
                      onChange={(e) => setFormData({ ...formData, lukket_kommentar: e.target.value })}
                      rows={3}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  {ruh?.lukket_dato && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Lukket {format(new Date(ruh.lukket_dato), 'dd.MM.yyyy HH:mm', { locale: nb })} av {ruh.lukket_av_navn}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('RUH'))}
                className="rounded-xl"
              >
                Avbryt
              </Button>
              {ruhId && !isNew && formData.status !== 'lukket' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="rounded-xl"
                >
                  Lukk RUH
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Lagrer...' : 'Lagre RUH'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}