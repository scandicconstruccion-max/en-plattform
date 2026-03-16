import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import SjekkUtDialog from '@/components/maskiner/SjekkUtDialog';
import MaskinReservasjonDialog from '@/components/maskiner/MaskinReservasjonDialog';
import MaskinTidslinje from '@/components/maskiner/MaskinTidslinje';
import { Plus, Pencil, Trash2, Loader2, MapPin, User, Warehouse, Wrench, CalendarRange, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const LOKASJON_CONFIG = {
  lager: { label: 'På lager', icon: Warehouse, badgeClass: 'bg-green-100 text-green-700' },
  hos_ansatt: { label: 'Hos ansatt', icon: User, badgeClass: 'bg-blue-100 text-blue-700' },
  prosjekt: { label: 'På prosjekt', icon: MapPin, badgeClass: 'bg-orange-100 text-orange-700' },
  service: { label: 'På service', icon: Wrench, badgeClass: 'bg-yellow-100 text-yellow-700' },
};

const UTSTYRTYPER = [
  { value: 'maskin', label: 'Maskin / Kjøretøy' },
  { value: 'handverktoy', label: 'Håndverktøy / Elektroverktøy' },
  { value: 'stillas', label: 'Stillas / Løfteutstyr' },
  { value: 'maling', label: 'Maling / Overflatebehandling' },
  { value: 'annet_utstyr', label: 'Annet utstyr' },
];

const MASKINTYPE_BY_UTSTYRSTYPE = {
  maskin: [
    { value: 'gravemaskin', label: 'Gravemaskin' },
    { value: 'lift', label: 'Lift' },
    { value: 'kran', label: 'Kran' },
    { value: 'dumper', label: 'Dumper' },
    { value: 'hjullaster', label: 'Hjullaster' },
    { value: 'kompressor', label: 'Kompressor' },
    { value: 'betongbil', label: 'Betongbil' },
    { value: 'stillaskran', label: 'Stillaskran' },
    { value: 'minidumper', label: 'Minidumper' },
  ],
  handverktoy: [
    { value: 'slagborr', label: 'Slagborrmaskin' },
    { value: 'kjedeborr', label: 'Kjedeborrmaskin' },
    { value: 'piggemaskin', label: 'Piggemaskin' },
    { value: 'vinkelsliper', label: 'Vinkelsliper' },
    { value: 'rundsag', label: 'Rundsag' },
    { value: 'stikksag', label: 'Stikksag' },
    { value: 'boremaskin', label: 'Boremaskin' },
    { value: 'spikerpistol', label: 'Spikerpistol' },
    { value: 'sliperimaskin', label: 'Sliperimaskin' },
  ],
  stillas: [
    { value: 'rulestilas', label: 'Rullestilas' },
    { value: 'fasadestilas', label: 'Fasadestilas' },
    { value: 'arbeidsbukk', label: 'Arbeidsbukk' },
    { value: 'lift_saks', label: 'Sakselift' },
    { value: 'lift_mast', label: 'Mastlift' },
  ],
  maling: [
    { value: 'luftkompressor', label: 'Luftkompressor' },
    { value: 'malingspray', label: 'Malingsprøyte' },
  ],
  annet_utstyr: [],
};

const MASKINTYPES = Object.values(MASKINTYPE_BY_UTSTYRSTYPE).flat().concat([{ value: 'annet', label: 'Annet' }]);

const STATUS_CONFIG = {
  tilgjengelig: { label: 'Tilgjengelig', class: 'bg-green-100 text-green-700' },
  i_bruk: { label: 'I bruk', class: 'bg-blue-100 text-blue-700' },
  service: { label: 'Service', class: 'bg-yellow-100 text-yellow-700' },
  ute_av_drift: { label: 'Ute av drift', class: 'bg-red-100 text-red-700' },
};

const EMPTY_FORM = {
  navn: '',
  utstyrstype: '',
  maskintype: '',
  maskintype_custom: '',
  maskinnummer: '',
  status: 'tilgjengelig',
  standard_forer_id: '',
  standard_forer_navn: '',
  notater: '',
  aktiv: true,
};

export default function Maskiner() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaskin, setEditingMaskin] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sjekkUtTarget, setSjekkUtTarget] = useState(null);
  const [filterLokasjon, setFilterLokasjon] = useState('alle');
  const [reservasjonTarget, setReservasjonTarget] = useState(null);
  const [editingReservasjon, setEditingReservasjon] = useState(null);
  const [deleteReservasjonTarget, setDeleteReservasjonTarget] = useState(null);
  const [expandedMaskinId, setExpandedMaskinId] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: maskiner = [], isLoading } = useQuery({
    queryKey: ['maskiner'],
    queryFn: () => base44.entities.Maskin.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.Employee.list();
      return all.filter((e) => e.is_active);
    },
    initialData: [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'aktiv' }),
    initialData: [],
  });

  const { data: allReservasjoner = [] } = useQuery({
    queryKey: ['maskinReservasjoner'],
    queryFn: () => base44.entities.MaskinReservasjon.list('-start_dato_tid'),
    initialData: [],
  });

  const createReservasjonMutation = useMutation({
    mutationFn: (data) => base44.entities.MaskinReservasjon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskinReservasjoner'] });
      setReservasjonTarget(null);
      setEditingReservasjon(null);
      toast.success('Reservasjon opprettet');
    },
    onError: () => toast.error('Kunne ikke opprette reservasjon'),
  });

  const updateReservasjonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaskinReservasjon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskinReservasjoner'] });
      setReservasjonTarget(null);
      setEditingReservasjon(null);
      toast.success('Reservasjon oppdatert');
    },
    onError: () => toast.error('Kunne ikke oppdatere reservasjon'),
  });

  const deleteReservasjonMutation = useMutation({
    mutationFn: (id) => base44.entities.MaskinReservasjon.update(id, { status: 'kansellert' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskinReservasjoner'] });
      setDeleteReservasjonTarget(null);
      toast.success('Reservasjon kansellert');
    },
    onError: () => toast.error('Kunne ikke kansellere reservasjon'),
  });

  const handleReservasjonSubmit = (data) => {
    if (editingReservasjon) {
      updateReservasjonMutation.mutate({ id: editingReservasjon.id, data });
    } else {
      createReservasjonMutation.mutate(data);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Maskin.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskiner'] });
      setShowDialog(false);
      toast.success('Maskin opprettet');
    },
    onError: () => toast.error('Kunne ikke opprette maskin'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Maskin.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskiner'] });
      setShowDialog(false);
      toast.success('Maskin oppdatert');
    },
    onError: () => toast.error('Kunne ikke oppdatere maskin'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Maskin.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskiner'] });
      setDeleteTarget(null);
      toast.success('Maskin slettet');
    },
    onError: () => toast.error('Kunne ikke slette maskin'),
  });

  const openCreate = () => {
    setEditingMaskin(null);
    setFormData(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (maskin) => {
    setEditingMaskin(maskin);
    setFormData({
      navn: maskin.navn || '',
      utstyrstype: maskin.utstyrstype || '',
      maskintype: maskin.maskintype || '',
      maskintype_custom: maskin.maskintype_custom || '',
      maskinnummer: maskin.maskinnummer || '',
      status: maskin.status || 'tilgjengelig',
      standard_forer_id: maskin.standard_forer_id || '',
      standard_forer_navn: maskin.standard_forer_navn || '',
      notater: maskin.notater || '',
      aktiv: maskin.aktiv !== false,
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const effectiveMaskintype = formData.maskintype === 'egendefinert' ? formData.maskintype_custom : formData.maskintype;
    if (!formData.navn || !effectiveMaskintype) return;
    const selectedEmployee = employees.find((emp) => emp.id === formData.standard_forer_id);
    const submitData = {
      ...formData,
      maskintype: effectiveMaskintype,
      standard_forer_navn: selectedEmployee
        ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
        : '',
    };
    if (editingMaskin) {
      updateMutation.mutate({ id: editingMaskin.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const sjekkUtMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Maskin.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maskiner'] });
      setSjekkUtTarget(null);
      toast.success('Plassering oppdatert');
    },
    onError: () => toast.error('Kunne ikke oppdatere plassering'),
  });

  const availableMaskintypes = formData.utstyrstype
    ? [...(MASKINTYPE_BY_UTSTYRSTYPE[formData.utstyrstype] || []), { value: 'egendefinert', label: '✏️ Skriv inn selv...' }]
    : [...MASKINTYPES, { value: 'egendefinert', label: '✏️ Skriv inn selv...' }];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      <PageHeader
        title="Maskinregister"
        subtitle="Administrer maskiner og utstyr"
        actions={
          <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
            <Plus className="h-4 w-4" />
            Ny maskin
          </Button>
        }
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filter bar */}
        {!isLoading && maskiner.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {['alle', 'lager', 'hos_ansatt', 'prosjekt', 'service'].map((key) => {
              const cfg = LOKASJON_CONFIG[key];
              const Icon = cfg?.icon;
              const count = key === 'alle' ? maskiner.length : maskiner.filter((m) => (m.lokasjon || 'lager') === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilterLokasjon(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
                    filterLokasjon === key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {key === 'alle' ? 'Alle' : cfg.label}
                  <span className={cn('ml-0.5 text-xs', filterLokasjon === key ? 'text-emerald-100' : 'text-slate-400')}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : maskiner.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg font-medium mb-2">Ingen maskiner registrert</p>
            <p className="text-sm mb-4">Legg til maskiner for å kunne planlegge dem i ressursplanleggeren.</p>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Legg til maskin
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {maskiner
              .filter((m) => filterLokasjon === 'alle' || (m.lokasjon || 'lager') === filterLokasjon)
              .map((maskin) => {
              const statusCfg = STATUS_CONFIG[maskin.status] || STATUS_CONFIG.tilgjengelig;
              const typeCfg = MASKINTYPES.find((t) => t.value === maskin.maskintype);
              const lokCfg = LOKASJON_CONFIG[maskin.lokasjon || 'lager'];
              const LokIcon = lokCfg.icon;
              return (
                <div
                  key={maskin.id}
                  className={cn(
                    'bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3',
                    !maskin.aktiv && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{maskin.navn}</p>
                      <p className="text-xs text-slate-500">{typeCfg?.label || maskin.maskintype}</p>
                    </div>
                    <Badge className={cn('flex-shrink-0 text-xs', statusCfg.class)}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Lokasjon-seksjon — hovedelement */}
                  <div className={cn('flex items-start gap-2 p-2.5 rounded-lg', lokCfg.badgeClass.replace('text-', 'bg-').replace('-700','-50').replace('-100','').concat(' bg-opacity-60'))}>
                    <LokIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', lokCfg.badgeClass.split(' ')[1])} />
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold', lokCfg.badgeClass.split(' ')[1])}>{lokCfg.label}</p>
                      {maskin.lokasjon === 'hos_ansatt' && maskin.hos_ansatt_navn && (
                        <p className="text-xs text-slate-700 font-medium truncate">{maskin.hos_ansatt_navn}</p>
                      )}
                      {maskin.lokasjon === 'prosjekt' && maskin.prosjekt_lokasjon && (
                        <p className="text-xs text-slate-700 truncate">{maskin.prosjekt_lokasjon}</p>
                      )}
                      {maskin.lokasjon_notat && (
                        <p className="text-xs text-slate-500 truncate">{maskin.lokasjon_notat}</p>
                      )}
                      {maskin.utlevert_dato && maskin.lokasjon !== 'lager' && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Siden {format(new Date(maskin.utlevert_dato), 'd. MMM', { locale: nb })}
                        </p>
                      )}
                    </div>
                  </div>

                  {maskin.maskinnummer && (
                    <p className="text-xs text-slate-500">Nr: {maskin.maskinnummer}</p>
                  )}

                  {/* Reservasjoner toggle */}
                  {(() => {
                    const maskinRes = allReservasjoner.filter(
                      (r) => r.maskin_id === maskin.id && r.status !== 'kansellert'
                    );
                    const activeCount = maskinRes.filter((r) => {
                      const now = new Date();
                      return new Date(r.slutt_dato_tid) >= now;
                    }).length;
                    const isExpanded = expandedMaskinId === maskin.id;
                    return (
                      <div className="border-t border-slate-100 pt-2">
                        <button
                          onClick={() => setExpandedMaskinId(isExpanded ? null : maskin.id)}
                          className="flex items-center justify-between w-full text-xs text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <CalendarRange className="h-3.5 w-3.5" />
                            Reservasjoner
                            {activeCount > 0 && (
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                                {activeCount}
                              </span>
                            )}
                          </span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            <MaskinTidslinje
                              reservasjoner={maskinRes}
                              canEdit={true}
                              onEdit={(r) => { setReservasjonTarget(maskin); setEditingReservasjon(r); }}
                              onDelete={(r) => setDeleteReservasjonTarget(r)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs mt-1"
                              onClick={() => { setReservasjonTarget(maskin); setEditingReservasjon(null); }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Ny reservasjon
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setSjekkUtTarget(maskin)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Plassering
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => { setReservasjonTarget(maskin); setEditingReservasjon(null); }}
                    >
                      <CalendarRange className="h-3 w-3 mr-1" />
                      Reserver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(maskin)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(maskin)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingMaskin ? 'Rediger maskin' : 'Ny maskin'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
            <div>
              <Label>Navn *</Label>
              <Input
                value={formData.navn}
                onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
                placeholder="F.eks. Gravemaskin 5t"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Utstyrstype</Label>
              <Select
                value={formData.utstyrstype || 'alle'}
                onValueChange={(v) => setFormData({ ...formData, utstyrstype: v === 'alle' ? '' : v, maskintype: '', maskintype_custom: '' })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg utstyrstype..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">— Alle kategorier —</SelectItem>
                  {UTSTYRTYPER.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Maskintype *</Label>
              <Select
                value={formData.maskintype}
                onValueChange={(v) => setFormData({ ...formData, maskintype: v, maskintype_custom: '' })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMaskintypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.maskintype === 'egendefinert' && (
                <Input
                  value={formData.maskintype_custom}
                  onChange={(e) => setFormData({ ...formData, maskintype_custom: e.target.value })}
                  placeholder="Skriv inn maskintype..."
                  className="mt-2 rounded-xl"
                  autoFocus
                />
              )}
            </div>

            <div>
              <Label>Maskinnummer / reg.nummer</Label>
              <Input
                value={formData.maskinnummer}
                onChange={(e) => setFormData({ ...formData, maskinnummer: e.target.value })}
                placeholder="F.eks. AB-12345"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Standard fører (valgfritt)</Label>
              <Select
                value={formData.standard_forer_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, standard_forer_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Ingen valgt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notater</Label>
              <Textarea
                value={formData.notater}
                onChange={(e) => setFormData({ ...formData, notater: e.target.value })}
                placeholder="Eventuelle notater..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <Label className="cursor-pointer">Aktiv</Label>
              <Switch
                checked={formData.aktiv}
                onCheckedChange={(v) => setFormData({ ...formData, aktiv: v })}
              />
            </div>
          </form>

          <div className="flex justify-end gap-3 pt-2 flex-wrap mt-4">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formData.navn || !formData.maskintype || (formData.maskintype === 'egendefinert' && !formData.maskintype_custom)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMaskin ? 'Lagre' : 'Opprett'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sjekk ut/inn dialog */}
      <SjekkUtDialog
        maskin={sjekkUtTarget}
        employees={employees}
        open={!!sjekkUtTarget}
        onOpenChange={(open) => !open && setSjekkUtTarget(null)}
        isPending={sjekkUtMutation.isPending}
        onSave={(data) => sjekkUtMutation.mutate({ id: sjekkUtTarget.id, data })}
      />

      {/* Reservasjon dialog */}
      <MaskinReservasjonDialog
        open={!!reservasjonTarget}
        onOpenChange={(open) => { if (!open) { setReservasjonTarget(null); setEditingReservasjon(null); } }}
        maskin={reservasjonTarget}
        projects={projects}
        employees={employees}
        existingReservasjoner={allReservasjoner.filter((r) => r.maskin_id === reservasjonTarget?.id)}
        currentUser={currentUser}
        editingReservasjon={editingReservasjon}
        onSubmit={handleReservasjonSubmit}
        isLoading={createReservasjonMutation.isPending || updateReservasjonMutation.isPending}
      />

      {/* Delete reservasjon confirm */}
      <AlertDialog open={!!deleteReservasjonTarget} onOpenChange={(open) => !open && setDeleteReservasjonTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kanseller reservasjon?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil kansellere denne reservasjonen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReservasjonMutation.mutate(deleteReservasjonTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Kanseller
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett maskin?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette <strong>{deleteTarget?.navn}</strong>? Eksisterende planlegginger påvirkes ikke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}