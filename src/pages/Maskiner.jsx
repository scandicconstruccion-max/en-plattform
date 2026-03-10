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
import { Plus, Pencil, Trash2, Loader2, MapPin, User, Warehouse, Wrench } from 'lucide-react';
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

  const queryClient = useQueryClient();

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
            {maskiner.map((maskin) => {
              const statusCfg = STATUS_CONFIG[maskin.status] || STATUS_CONFIG.tilgjengelig;
              const typeCfg = MASKINTYPES.find((t) => t.value === maskin.maskintype);
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

                  {maskin.maskinnummer && (
                    <p className="text-xs text-slate-500">Nr: {maskin.maskinnummer}</p>
                  )}
                  {maskin.standard_forer_navn && (
                    <p className="text-xs text-slate-600">
                      Std. fører: <span className="font-medium">{maskin.standard_forer_navn}</span>
                    </p>
                  )}
                  {maskin.notater && (
                    <p className="text-xs text-slate-500 line-clamp-2">{maskin.notater}</p>
                  )}

                  <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => openEdit(maskin)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Rediger
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaskin ? 'Rediger maskin' : 'Ny maskin'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={isPending || !formData.navn || !formData.maskintype || (formData.maskintype === 'egendefinert' && !formData.maskintype_custom)}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMaskin ? 'Lagre' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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