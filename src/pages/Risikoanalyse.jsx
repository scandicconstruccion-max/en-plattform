import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ProjectSelector from '@/components/shared/ProjectSelector';
import EmployeeSelector from '@/components/shared/EmployeeSelector';
import EmptyState from '@/components/shared/EmptyState';
import { FileCheck, Filter, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Risikoanalyse() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risikoanalyse'],
    queryFn: () => base44.entities.Risikoanalyse.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Risikoanalyse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyse']);
      setDialogOpen(false);
      toast.success('Risikoanalyse opprettet');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Risikoanalyse.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyse']);
      setDialogOpen(false);
      toast.success('Risikoanalyse oppdatert');
    }
  });

  const [formData, setFormData] = useState({
    project_id: '',
    risikoområde: 'fall',
    beskrivelse: '',
    konsekvens: 2,
    sannsynlighet: 2,
    risikonivå: 4,
    tiltak: '',
    ansvarlig: user?.email || '',
    ansvarlig_navn: user?.full_name || '',
    frist: '',
    status: 'aktiv'
  });

  // Calculate risk level when konsekvens or sannsynlighet changes
  React.useEffect(() => {
    const risikonivå = formData.konsekvens * formData.sannsynlighet;
    setFormData((prev) => ({ ...prev, risikonivå }));
  }, [formData.konsekvens, formData.sannsynlighet]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedRisk) {
      updateMutation.mutate({ id: selectedRisk.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openCreateDialog = () => {
    setSelectedRisk(null);
    setFormData({
      project_id: '',
      risikoområde: 'fall',
      beskrivelse: '',
      konsekvens: 2,
      sannsynlighet: 2,
      risikonivå: 4,
      tiltak: '',
      ansvarlig: user?.email || '',
      ansvarlig_navn: user?.full_name || '',
      frist: '',
      status: 'aktiv'
    });
    setDialogOpen(true);
  };

  const openEditDialog = (risk) => {
    setSelectedRisk(risk);
    setFormData(risk);
    setDialogOpen(true);
  };

  const filteredRisks = risks.filter((r) => {
    if (filterProject && r.project_id !== filterProject) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const getRiskLevelColor = (level) => {
    if (level >= 6) return 'bg-red-100 text-red-800';
    if (level >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRiskLevelLabel = (level) => {
    if (level >= 6) return 'Høy risiko';
    if (level >= 3) return 'Middels risiko';
    return 'Lav risiko';
  };

  const getAreaLabel = (area) => {
    const labels = {
      fall: 'Fall',
      elektrisk: 'Elektrisk',
      maskin: 'Maskin',
      kjemikalier: 'Kjemikalier',
      brann: 'Brann',
      helse: 'Helse',
      annet: 'Annet'
    };
    return labels[area] || area;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aktiv':return 'bg-blue-100 text-blue-800';
      case 'tiltak_igangsatt':return 'bg-yellow-100 text-yellow-800';
      case 'lukket':return 'bg-green-100 text-green-800';
      default:return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'aktiv':return 'Aktiv';
      case 'tiltak_igangsatt':return 'Tiltak igangsatt';
      case 'lukket':return 'Lukket';
      default:return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Risikoanalyse"
        subtitle="Identifiser og håndter risikoer"
        onAdd={openCreateDialog}
        addLabel="Ny risikoanalyse" />


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
                      {projects.map((p) =>
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      )}
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
                      <SelectItem value="aktiv">Aktiv</SelectItem>
                      <SelectItem value="tiltak_igangsatt">Tiltak igangsatt</SelectItem>
                      <SelectItem value="lukket">Lukket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(filterProject || filterStatus) &&
              <Button variant="ghost" size="sm" onClick={() => {setFilterProject('');setFilterStatus('');}}>
                  <X className="h-4 w-4" />
                </Button>
              }
            </div>
          </CardContent>
        </Card>

        {/* Risks List */}
        {filteredRisks.length === 0 ?
        <EmptyState
          icon={FileCheck}
          title="Ingen risikoanalyser"
          description="Opprett første risikoanalyse"
          actionLabel="Ny risikoanalyse"
          onAction={openCreateDialog} /> :


        <div className="grid gap-4">
            {filteredRisks.map((risk) => {
            const project = projects.find((p) => p.id === risk.project_id);
            return (
              <Card key={risk.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEditDialog(risk)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={getRiskLevelColor(risk.risikonivå)}>
                            {getRiskLevelLabel(risk.risikonivå)} ({risk.risikonivå})
                          </Badge>
                          <Badge className={getStatusColor(risk.status)}>
                            {getStatusLabel(risk.status)}
                          </Badge>
                          <Badge variant="outline">{getAreaLabel(risk.risikoområde)}</Badge>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          {project?.name || 'Ukjent prosjekt'}
                        </h3>
                        <p className="text-slate-600 mb-3">{risk.beskrivelse}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Konsekvens: </span>
                            <span className="font-medium">{risk.konsekvens}/3</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Sannsynlighet: </span>
                            <span className="font-medium">{risk.sannsynlighet}/3</span>
                          </div>
                        </div>
                        {risk.frist &&
                      <p className="text-sm text-slate-500 mt-2">
                            Frist: {format(new Date(risk.frist), 'dd.MM.yyyy', { locale: nb })}
                          </p>
                      }
                      </div>
                    </div>
                  </CardContent>
                </Card>);

          })}
          </div>
        }
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRisk ? 'Rediger risikoanalyse' : 'Ny risikoanalyse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProjectSelector
              value={formData.project_id}
              onChange={(value) => setFormData({ ...formData, project_id: value })}
              required />


            <div>
              <Label>Risikoområde *</Label>
              <Select value={formData.risikoområde} onValueChange={(value) => setFormData({ ...formData, risikoområde: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="elektrisk">Elektrisk</SelectItem>
                  <SelectItem value="maskin">Maskin</SelectItem>
                  <SelectItem value="kjemikalier">Kjemikalier</SelectItem>
                  <SelectItem value="brann">Brann</SelectItem>
                  <SelectItem value="helse">Helse</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Beskrivelse av risiko *</Label>
              <Textarea
                value={formData.beskrivelse}
                onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                rows={3}
                required />

            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Konsekvens (1-3) *</Label>
                <Select
                  value={formData.konsekvens.toString()}
                  onValueChange={(value) => setFormData({ ...formData, konsekvens: parseInt(value) })}>

                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Lav</SelectItem>
                    <SelectItem value="2">2 - Middels</SelectItem>
                    <SelectItem value="3">3 - Høy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sannsynlighet (1-3) *</Label>
                <Select
                  value={formData.sannsynlighet.toString()}
                  onValueChange={(value) => setFormData({ ...formData, sannsynlighet: parseInt(value) })}>

                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Lav</SelectItem>
                    <SelectItem value="2">2 - Middels</SelectItem>
                    <SelectItem value="3">3 - Høy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Risikonivå (Konsekvens × Sannsynlighet)</p>
              <div className="mt-2">
                <Badge className={getRiskLevelColor(formData.risikonivå)} className="text-lg px-3 py-1">
                  {formData.risikonivå} - {getRiskLevelLabel(formData.risikonivå)}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Tiltak</Label>
              <Textarea
                value={formData.tiltak}
                onChange={(e) => setFormData({ ...formData, tiltak: e.target.value })}
                rows={3}
                placeholder="Beskriv foreslåtte tiltak for å redusere risikoen" />

            </div>

            <EmployeeSelector
              label="Ansvarlig for oppfølging"
              value={formData.ansvarlig}
              onChange={(email, name) => setFormData({ ...formData, ansvarlig: email, ansvarlig_navn: name })} />


            <div>
              <Label>Frist</Label>
              <Input
                type="date"
                value={formData.frist}
                onChange={(e) => setFormData({ ...formData, frist: e.target.value })} />

            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="tiltak_igangsatt">Tiltak igangsatt</SelectItem>
                  <SelectItem value="lukket">Lukket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-green-700 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9">
                {selectedRisk ? 'Oppdater' : 'Opprett'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

}