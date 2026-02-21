import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import FileUploadSection from '@/components/shared/FileUploadSection';
import ProjectSelector from '@/components/shared/ProjectSelector';
import EmployeeSelector from '@/components/shared/EmployeeSelector';
import EmptyState from '@/components/shared/EmptyState';
import { AlertCircle, Plus, Calendar, MapPin, FileText, Filter, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function RUH() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedRuh, setSelectedRuh] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: ruhList = [] } = useQuery({
    queryKey: ['ruh'],
    queryFn: () => base44.entities.RUH.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RUH.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ruh']);
      setDialogOpen(false);
      toast.success('RUH registrert');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RUH.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ruh']);
      setDialogOpen(false);
      setViewDialog(false);
      toast.success('RUH oppdatert');
    }
  });

  const [formData, setFormData] = useState({
    project_id: '',
    dato: format(new Date(), 'yyyy-MM-dd'),
    klokkeslett: format(new Date(), 'HH:mm'),
    sted: '',
    type_hendelse: 'narulykke',
    beskrivelse: '',
    arsak: '',
    tiltak_gjennomfort: '',
    hendelse_lukket: false,
    ansvarlig: user?.email || '',
    ansvarlig_navn: user?.full_name || '',
    vedlegg: [],
    status: 'apen'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const activityLog = [{
      action: selectedRuh ? 'oppdatert' : 'opprettet',
      timestamp: new Date().toISOString(),
      user_email: user?.email,
      user_name: user?.full_name,
      details: selectedRuh ? 'RUH oppdatert' : 'RUH registrert'
    }];

    const dataToSave = {
      ...formData,
      aktivitetslogg: selectedRuh ? [...(selectedRuh.aktivitetslogg || []), ...activityLog] : activityLog
    };

    if (selectedRuh) {
      updateMutation.mutate({ id: selectedRuh.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const openCreateDialog = () => {
    setSelectedRuh(null);
    setFormData({
      project_id: '',
      dato: format(new Date(), 'yyyy-MM-dd'),
      klokkeslett: format(new Date(), 'HH:mm'),
      sted: '',
      type_hendelse: 'narulykke',
      beskrivelse: '',
      arsak: '',
      tiltak_gjennomfort: '',
      hendelse_lukket: false,
      ansvarlig: user?.email || '',
      ansvarlig_navn: user?.full_name || '',
      vedlegg: [],
      status: 'apen'
    });
    setDialogOpen(true);
  };

  const openEditDialog = (ruh) => {
    setSelectedRuh(ruh);
    setFormData(ruh);
    setDialogOpen(true);
  };

  const openViewDialog = (ruh) => {
    setSelectedRuh(ruh);
    setViewDialog(true);
  };

  const filteredRuh = ruhList.filter(r => {
    if (filterProject && r.project_id !== filterProject) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'apen': return 'bg-red-100 text-red-800';
      case 'under_behandling': return 'bg-yellow-100 text-yellow-800';
      case 'lukket': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'narulykke': return 'Nærulykke';
      case 'personskade': return 'Personskade';
      case 'materiell_skade': return 'Materiell skade';
      case 'annet': return 'Annet';
      default: return type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'apen': return 'Åpen';
      case 'under_behandling': return 'Under behandling';
      case 'lukket': return 'Lukket';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="RUH - Registrering av uønskede hendelser"
        subtitle="Rapporter og håndter HMS-hendelser"
        onAdd={openCreateDialog}
        addLabel="Ny RUH"
      />

      <div className="px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-slate-400" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-2">Prosjekt</Label>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle prosjekter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Alle prosjekter</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-2">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle statuser" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Alle statuser</SelectItem>
                      <SelectItem value="apen">Åpen</SelectItem>
                      <SelectItem value="under_behandling">Under behandling</SelectItem>
                      <SelectItem value="lukket">Lukket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(filterProject || filterStatus) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterProject(''); setFilterStatus(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RUH List */}
        {filteredRuh.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="Ingen RUH registrert"
            description="Registrer første uønskede hendelse"
            actionLabel="Ny RUH"
            onAction={openCreateDialog}
          />
        ) : (
          <div className="grid gap-4">
            {filteredRuh.map(ruh => {
              const project = projects.find(p => p.id === ruh.project_id);
              return (
                <Card key={ruh.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={getStatusColor(ruh.status)}>
                            {getStatusLabel(ruh.status)}
                          </Badge>
                          <Badge variant="outline">{getTypeLabel(ruh.type_hendelse)}</Badge>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          {project?.name || 'Ukjent prosjekt'}
                        </h3>
                        <p className="text-slate-600 mb-3 line-clamp-2">{ruh.beskrivelse}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(ruh.dato), 'dd.MM.yyyy', { locale: nb })} {ruh.klokkeslett}
                          </div>
                          {ruh.sted && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {ruh.sted}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openViewDialog(ruh)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(ruh)}>
                          Rediger
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRuh ? 'Rediger RUH' : 'Ny RUH'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProjectSelector
              value={formData.project_id}
              onChange={(value) => setFormData({ ...formData, project_id: value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dato *</Label>
                <Input
                  type="date"
                  value={formData.dato}
                  onChange={(e) => setFormData({ ...formData, dato: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Klokkeslett</Label>
                <Input
                  type="time"
                  value={formData.klokkeslett}
                  onChange={(e) => setFormData({ ...formData, klokkeslett: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Sted</Label>
              <Input
                value={formData.sted}
                onChange={(e) => setFormData({ ...formData, sted: e.target.value })}
                placeholder="Hvor skjedde hendelsen?"
              />
            </div>

            <div>
              <Label>Type hendelse *</Label>
              <Select value={formData.type_hendelse} onValueChange={(value) => setFormData({ ...formData, type_hendelse: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narulykke">Nærulykke</SelectItem>
                  <SelectItem value="personskade">Personskade</SelectItem>
                  <SelectItem value="materiell_skade">Materiell skade</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Beskrivelse av hendelsen *</Label>
              <Textarea
                value={formData.beskrivelse}
                onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <Label>Årsak</Label>
              <Textarea
                value={formData.arsak}
                onChange={(e) => setFormData({ ...formData, arsak: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Tiltak gjennomført</Label>
              <Textarea
                value={formData.tiltak_gjennomfort}
                onChange={(e) => setFormData({ ...formData, tiltak_gjennomfort: e.target.value })}
                rows={3}
              />
            </div>

            <EmployeeSelector
              label="Ansvarlig"
              value={formData.ansvarlig}
              onChange={(email, name) => setFormData({ ...formData, ansvarlig: email, ansvarlig_navn: name })}
            />

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apen">Åpen</SelectItem>
                  <SelectItem value="under_behandling">Under behandling</SelectItem>
                  <SelectItem value="lukket">Lukket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FileUploadSection
              files={formData.vedlegg || []}
              onFilesChange={(files) => setFormData({ ...formData, vedlegg: files })}
              projectId={formData.project_id}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedRuh ? 'Oppdater' : 'Opprett'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RUH Detaljer</DialogTitle>
          </DialogHeader>
          {selectedRuh && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(selectedRuh.status)}>
                  {getStatusLabel(selectedRuh.status)}
                </Badge>
                <Badge variant="outline">{getTypeLabel(selectedRuh.type_hendelse)}</Badge>
              </div>

              <div>
                <Label className="text-slate-500">Prosjekt</Label>
                <p className="font-medium">{projects.find(p => p.id === selectedRuh.project_id)?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Dato</Label>
                  <p className="font-medium">{format(new Date(selectedRuh.dato), 'dd.MM.yyyy', { locale: nb })}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Klokkeslett</Label>
                  <p className="font-medium">{selectedRuh.klokkeslett || '-'}</p>
                </div>
              </div>

              {selectedRuh.sted && (
                <div>
                  <Label className="text-slate-500">Sted</Label>
                  <p className="font-medium">{selectedRuh.sted}</p>
                </div>
              )}

              <div>
                <Label className="text-slate-500">Beskrivelse</Label>
                <p className="whitespace-pre-wrap">{selectedRuh.beskrivelse}</p>
              </div>

              {selectedRuh.arsak && (
                <div>
                  <Label className="text-slate-500">Årsak</Label>
                  <p className="whitespace-pre-wrap">{selectedRuh.arsak}</p>
                </div>
              )}

              {selectedRuh.tiltak_gjennomfort && (
                <div>
                  <Label className="text-slate-500">Tiltak gjennomført</Label>
                  <p className="whitespace-pre-wrap">{selectedRuh.tiltak_gjennomfort}</p>
                </div>
              )}

              {selectedRuh.ansvarlig_navn && (
                <div>
                  <Label className="text-slate-500">Ansvarlig</Label>
                  <p className="font-medium">{selectedRuh.ansvarlig_navn}</p>
                </div>
              )}

              {selectedRuh.vedlegg?.length > 0 && (
                <div>
                  <Label className="text-slate-500">Vedlegg</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRuh.vedlegg.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Vedlegg {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => { setViewDialog(false); openEditDialog(selectedRuh); }}>
                Rediger
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}