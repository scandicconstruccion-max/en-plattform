import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import ProjectSelector from '@/components/shared/ProjectSelector';
import EmployeeSelector from '@/components/shared/EmployeeSelector';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { Save, X, CheckCircle, Edit2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RisikoanalyseDetaljer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const analyseId = urlParams.get('id');
  const isNew = urlParams.get('new') === 'true';
  const [isEditing, setIsEditing] = useState(isNew);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: analyse } = useQuery({
    queryKey: ['risikoanalyse', analyseId],
    queryFn: () => base44.entities.Risikoanalyse.list().then(list => list.find(a => a.id === analyseId)),
    enabled: !!analyseId && !isNew
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const [formData, setFormData] = useState({
    project_id: '',
    adresse: '',
    dato_analyse: format(new Date(), 'yyyy-MM-dd'),
    ansvarlig: user?.email || '',
    ansvarlig_navn: user?.full_name || '',
    deltakere: [],
    arbeidsoperasjon: '',
    risiko_beskrivelse: '',
    kategorier: [],
    kategori_annet: '',
    potensielt_utfall: '',
    konsekvens: null,
    sannsynlighet: null,
    risikoniva: 0,
    tiltak_beskrivelse: '',
    tiltak_ansvarlig: '',
    tiltak_ansvarlig_navn: '',
    tiltak_frist: '',
    status: 'apen',
    vedlegg: [],
    lukket_dato: null,
    lukket_kommentar: '',
    lukket_av: '',
    lukket_av_navn: '',
    aktivitetslogg: []
  });

  const [nyDeltaker, setNyDeltaker] = useState({ navn: '', epost: '' });

  useEffect(() => {
    if (analyse && !isNew) {
      setFormData(analyse);
    }
  }, [analyse, isNew]);

  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        ansvarlig: user.email,
        ansvarlig_navn: user.full_name
      }));
    }
  }, [user, isNew]);

  useEffect(() => {
    if (formData.konsekvens && formData.sannsynlighet) {
      const risikoniva = formData.konsekvens * formData.sannsynlighet;
      setFormData(prev => ({ ...prev, risikoniva }));
    }
  }, [formData.konsekvens, formData.sannsynlighet]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Risikoanalyse.create({
      ...data,
      aktivitetslogg: [{
        action: 'opprettet',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: 'Risikoanalyse opprettet'
      }]
    }),
    onSuccess: (newAnalyse) => {
      queryClient.invalidateQueries(['risikoanalyser']);
      toast.success('Risikoanalyse opprettet');
      navigate(createPageUrl(`RisikoanalyseDetaljer?id=${newAnalyse.id}`));
      setIsEditing(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const updatedLog = [...(analyse?.aktivitetslogg || []), {
        action: 'oppdatert',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: 'Risikoanalyse oppdatert'
      }];
      return base44.entities.Risikoanalyse.update(analyseId, {
        ...data,
        aktivitetslogg: updatedLog
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyse', analyseId]);
      queryClient.invalidateQueries(['risikoanalyser']);
      toast.success('Endringer lagret');
      setIsEditing(false);
    }
  });

  const lukkMutation = useMutation({
    mutationFn: () => {
      const updatedLog = [...(analyse?.aktivitetslogg || []), {
        action: 'lukket',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: 'Risikoanalyse lukket'
      }];
      return base44.entities.Risikoanalyse.update(analyseId, {
        ...formData,
        status: 'lukket',
        lukket_dato: new Date().toISOString(),
        lukket_av: user?.email,
        lukket_av_navn: user?.full_name,
        aktivitetslogg: updatedLog
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyse', analyseId]);
      queryClient.invalidateQueries(['risikoanalyser']);
      toast.success('Risikoanalyse lukket');
      navigate(createPageUrl('Risikoanalyse'));
    }
  });

  const handleSubmit = () => {
    if (!formData.project_id || !formData.arbeidsoperasjon || !formData.risiko_beskrivelse) {
      toast.error('Fyll ut alle påkrevde felt');
      return;
    }

    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const handleKategoriToggle = (kategori) => {
    setFormData(prev => ({
      ...prev,
      kategorier: prev.kategorier?.includes(kategori)
        ? prev.kategorier.filter(k => k !== kategori)
        : [...(prev.kategorier || []), kategori]
    }));
  };

  const leggTilDeltaker = () => {
    if (nyDeltaker.navn) {
      setFormData(prev => ({
        ...prev,
        deltakere: [...(prev.deltakere || []), nyDeltaker]
      }));
      setNyDeltaker({ navn: '', epost: '' });
    }
  };

  const fjernDeltaker = (index) => {
    setFormData(prev => ({
      ...prev,
      deltakere: prev.deltakere.filter((_, i) => i !== index)
    }));
  };

  const getRisikonivaTekst = (niva) => {
    if (niva <= 2) return { tekst: 'Lav', color: 'bg-green-100 text-green-800' };
    if (niva <= 4) return { tekst: 'Middels', color: 'bg-yellow-100 text-yellow-800' };
    if (niva <= 6) return { tekst: 'Høy', color: 'bg-orange-100 text-orange-800' };
    return { tekst: 'Kritisk', color: 'bg-red-100 text-red-800' };
  };

  const kategorier = [
    { value: 'fall_hoyde', label: 'Fall fra høyde' },
    { value: 'klem_kutt', label: 'Klem- eller kuttskader' },
    { value: 'elektrisk', label: 'Elektrisk fare' },
    { value: 'brann_eksplosjon', label: 'Brann- eller eksplosjonsfare' },
    { value: 'kjemikalier_stov', label: 'Kjemikalier / støv' },
    { value: 'ergonomi_tunge_loft', label: 'Ergonomi / tunge løft' },
    { value: 'maskiner_kjoretoy', label: 'Maskiner / kjøretøy' },
    { value: 'ytre_forhold_vaer', label: 'Ytre forhold / vær' },
    { value: 'samordning', label: 'Samordning / flere aktører' },
    { value: 'annet', label: 'Annet' }
  ];

  const project = projects.find(p => p.id === formData.project_id);
  const risikoNiva = getRisikonivaTekst(formData.risikoniva);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title={isNew ? 'Ny risikoanalyse' : 'Risikoanalyse'}
        showBack={true}
        backUrl={createPageUrl('Risikoanalyse')}
        actions={
          !isNew && !isEditing && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.info('PDF-generering kommer snart')} variant="outline" className="rounded-xl gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Last ned PDF</span>
              </Button>
              {formData.status !== 'lukket' && (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-xl gap-2">
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Rediger</span>
                  </Button>
                  <Button onClick={() => lukkMutation.mutate()} className="bg-green-600 hover:bg-green-700 rounded-xl gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Lukk analyse</span>
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        {/* Grunninfo */}
        <Card className="mb-6 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Grunninformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Prosjekt *</Label>
                {isEditing ? (
                  <ProjectSelector
                    value={formData.project_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))}
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">{project?.name || '-'}</p>
                )}
              </div>

              <div>
                <Label>Dato for analyse</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.dato_analyse}
                    onChange={(e) => setFormData(prev => ({ ...prev, dato_analyse: e.target.value }))}
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">
                    {formData.dato_analyse ? format(new Date(formData.dato_analyse), 'dd.MM.yyyy') : '-'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Adresse / lokasjon</Label>
                {isEditing ? (
                  <Input
                    value={formData.adresse}
                    onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Angi adresse eller lokasjon"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">{formData.adresse || '-'}</p>
                )}
              </div>

              <div>
                <Label>Ansvarlig for risikoanalyse</Label>
                {isEditing ? (
                  <EmployeeSelector
                    value={formData.ansvarlig}
                    onChange={(val) => {
                      const emp = employees.find(e => e.email === val);
                      setFormData(prev => ({
                        ...prev,
                        ansvarlig: val,
                        ansvarlig_navn: emp?.name || ''
                      }));
                    }}
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">{formData.ansvarlig_navn || '-'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Arbeidsoperasjon / aktivitet *</Label>
                {isEditing ? (
                  <Input
                    value={formData.arbeidsoperasjon}
                    onChange={(e) => setFormData(prev => ({ ...prev, arbeidsoperasjon: e.target.value }))}
                    placeholder="Beskriv arbeidsoperasjon eller aktivitet"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">{formData.arbeidsoperasjon || '-'}</p>
                )}
              </div>
            </div>

            {/* Deltakere */}
            {isEditing && (
              <div>
                <Label>Deltakere / involverte personer</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Navn"
                    value={nyDeltaker.navn}
                    onChange={(e) => setNyDeltaker(prev => ({ ...prev, navn: e.target.value }))}
                  />
                  <Input
                    placeholder="E-post (valgfritt)"
                    value={nyDeltaker.epost}
                    onChange={(e) => setNyDeltaker(prev => ({ ...prev, epost: e.target.value }))}
                  />
                  <Button onClick={leggTilDeltaker} variant="outline">Legg til</Button>
                </div>
                {formData.deltakere?.map((deltaker, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mb-2">
                    <span>{deltaker.navn} {deltaker.epost && `(${deltaker.epost})`}</span>
                    <Button size="sm" variant="ghost" onClick={() => fjernDeltaker(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isEditing && formData.deltakere?.length > 0 && (
              <div>
                <Label>Deltakere</Label>
                <div className="space-y-1">
                  {formData.deltakere.map((d, i) => (
                    <p key={i} className="text-slate-900 dark:text-white">
                      {d.navn} {d.epost && `(${d.epost})`}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Identifisering */}
        <Card className="mb-6 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Identifisering av farer / risikoer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Beskriv risiko / fare *</Label>
              {isEditing ? (
                <Textarea
                  value={formData.risiko_beskrivelse}
                  onChange={(e) => setFormData(prev => ({ ...prev, risiko_beskrivelse: e.target.value }))}
                  rows={4}
                  placeholder="Beskriv risikoen eller faren"
                />
              ) : (
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{formData.risiko_beskrivelse || '-'}</p>
              )}
            </div>

            <div>
              <Label>Kategorier</Label>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {kategorier.map(kat => (
                    <div key={kat.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={kat.value}
                        checked={formData.kategorier?.includes(kat.value)}
                        onCheckedChange={() => handleKategoriToggle(kat.value)}
                      />
                      <label htmlFor={kat.value} className="text-sm cursor-pointer">
                        {kat.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.kategorier?.map(kat => {
                    const kategori = kategorier.find(k => k.value === kat);
                    return (
                      <Badge key={kat} variant="outline">
                        {kategori?.label || kat}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {isEditing && formData.kategorier?.includes('annet') && (
              <div>
                <Label>Spesifiser annet</Label>
                <Input
                  value={formData.kategori_annet}
                  onChange={(e) => setFormData(prev => ({ ...prev, kategori_annet: e.target.value }))}
                  placeholder="Beskriv annen kategori"
                />
              </div>
            )}
            {!isEditing && formData.kategori_annet && (
              <div>
                <Label>Annet</Label>
                <p className="text-slate-900 dark:text-white">{formData.kategori_annet}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Konsekvens og Sannsynlighet */}
        <Card className="mb-6 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Risikovurdering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Beskriv potensielt utfall</Label>
              {isEditing ? (
                <Textarea
                  value={formData.potensielt_utfall}
                  onChange={(e) => setFormData(prev => ({ ...prev, potensielt_utfall: e.target.value }))}
                  rows={3}
                  placeholder="Hva kan skje?"
                />
              ) : (
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{formData.potensielt_utfall || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Konsekvens *</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    {[
                      { value: 1, label: 'Lav (ingen skade)' },
                      { value: 2, label: 'Middels (mindre skade)' },
                      { value: 3, label: 'Høy (alvorlig skade)' },
                      { value: 4, label: 'Kritisk (død eller store skader)' }
                    ].map(opt => (
                      <div key={opt.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`konsekvens-${opt.value}`}
                          checked={formData.konsekvens === opt.value}
                          onChange={() => setFormData(prev => ({ ...prev, konsekvens: opt.value }))}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`konsekvens-${opt.value}`} className="text-sm cursor-pointer">
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">
                    {formData.konsekvens === 1 && 'Lav (ingen skade)'}
                    {formData.konsekvens === 2 && 'Middels (mindre skade)'}
                    {formData.konsekvens === 3 && 'Høy (alvorlig skade)'}
                    {formData.konsekvens === 4 && 'Kritisk (død eller store skader)'}
                  </p>
                )}
              </div>

              <div>
                <Label>Sannsynlighet *</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    {[
                      { value: 1, label: 'Lav (1–2 ganger/år)' },
                      { value: 2, label: 'Middels (1–2 ganger/måned)' },
                      { value: 3, label: 'Høy (1–2 ganger/uke)' }
                    ].map(opt => (
                      <div key={opt.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`sannsynlighet-${opt.value}`}
                          checked={formData.sannsynlighet === opt.value}
                          onChange={() => setFormData(prev => ({ ...prev, sannsynlighet: opt.value }))}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`sannsynlighet-${opt.value}`} className="text-sm cursor-pointer">
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">
                    {formData.sannsynlighet === 1 && 'Lav (1–2 ganger/år)'}
                    {formData.sannsynlighet === 2 && 'Middels (1–2 ganger/måned)'}
                    {formData.sannsynlighet === 3 && 'Høy (1–2 ganger/uke)'}
                  </p>
                )}
              </div>
            </div>

            {formData.risikoniva > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <Label>Risikonivå (automatisk beregnet)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={risikoNiva.color + ' text-lg px-4 py-2'}>
                    {risikoNiva.tekst}
                  </Badge>
                  <span className="text-slate-600 dark:text-slate-400">
                    ({formData.konsekvens} × {formData.sannsynlighet} = {formData.risikoniva})
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tiltak */}
        <Card className="mb-6 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Tiltak / forebygging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Beskriv tiltak</Label>
              {isEditing ? (
                <Textarea
                  value={formData.tiltak_beskrivelse}
                  onChange={(e) => setFormData(prev => ({ ...prev, tiltak_beskrivelse: e.target.value }))}
                  rows={4}
                  placeholder="Beskriv tiltak som skal redusere eller eliminere risiko"
                />
              ) : (
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{formData.tiltak_beskrivelse || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ansvarlig for tiltak</Label>
                {isEditing ? (
                  <EmployeeSelector
                    value={formData.tiltak_ansvarlig}
                    onChange={(val) => {
                      const emp = employees.find(e => e.email === val);
                      setFormData(prev => ({
                        ...prev,
                        tiltak_ansvarlig: val,
                        tiltak_ansvarlig_navn: emp?.name || ''
                      }));
                    }}
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">{formData.tiltak_ansvarlig_navn || '-'}</p>
                )}
              </div>

              <div>
                <Label>Frist for gjennomføring</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.tiltak_frist}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiltak_frist: e.target.value }))}
                  />
                ) : (
                  <p className="text-slate-900 dark:text-white font-medium">
                    {formData.tiltak_frist ? format(new Date(formData.tiltak_frist), 'dd.MM.yyyy') : '-'}
                  </p>
                )}
              </div>

              {!isNew && (
                <div>
                  <Label>Status</Label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1"
                    >
                      <option value="apen">Åpen</option>
                      <option value="under_arbeid">Under arbeid</option>
                      <option value="lukket">Lukket</option>
                    </select>
                  ) : (
                    <Badge className={
                      formData.status === 'apen' ? 'bg-red-100 text-red-800' :
                      formData.status === 'under_arbeid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {formData.status === 'apen' && 'Åpen'}
                      {formData.status === 'under_arbeid' && 'Under arbeid'}
                      {formData.status === 'lukket' && 'Lukket'}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dokumentasjon */}
        <Card className="mb-6 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Dokumentasjon</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadSection
              attachments={formData.vedlegg || []}
              onAttachmentsChange={(files) => setFormData(prev => ({ ...prev, vedlegg: files }))}
              projectId={formData.project_id}
              moduleType="risikoanalyse"
            />
          </CardContent>
        </Card>

        {/* Oppfølging (kun hvis lukket) */}
        {formData.status === 'lukket' && !isEditing && (
          <Card className="mb-6 dark:bg-slate-900 bg-green-50 dark:bg-green-900/20 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-400">Oppfølging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.lukket_dato && (
                <div>
                  <Label>Lukket dato</Label>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {format(new Date(formData.lukket_dato), 'dd.MM.yyyy HH:mm')}
                  </p>
                </div>
              )}
              {formData.lukket_av_navn && (
                <div>
                  <Label>Lukket av</Label>
                  <p className="text-slate-900 dark:text-white font-medium">{formData.lukket_av_navn}</p>
                </div>
              )}
              {formData.lukket_kommentar && (
                <div>
                  <Label>Kommentarer / læring</Label>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{formData.lukket_kommentar}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {isEditing && (
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (isNew) {
                  navigate(createPageUrl('Risikoanalyse'));
                } else {
                  setIsEditing(false);
                  setFormData(analyse);
                }
              }}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              <Save className="h-4 w-4 mr-2" />
              {isNew ? 'Opprett risikoanalyse' : 'Lagre endringer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}