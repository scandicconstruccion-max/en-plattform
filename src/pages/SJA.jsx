import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ClipboardCheck, Search, Calendar, FileText, CheckCircle2, X, Plus, UserPlus, Download, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SJA() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [selectedSJAs, setSelectedSJAs] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    sikkerhetsanalyse_utfort: new Date().toISOString().split('T')[0],
    jobb_utfores: '',
    ansvarlig: '',
    deltakere_ansatte: [],
    deltakere_eksterne: [],
    arbeidsoperasjon: '',
    beskrivelse_av_arbeidsoperasjonen: '',
    faremomenter: [],
    konsekvensgrad: '',
    tiltak: ''
  });
  const [newEksternDeltaker, setNewEksternDeltaker] = useState({ navn: '', epost: '' });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: sjaList = [], isLoading } = useQuery({
    queryKey: ['sja'],
    queryFn: () => base44.entities.SJA.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SJA.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sja'] });
      toast.success('SJA opprettet');
      setShowDialog(false);
      navigate(createPageUrl('SJADetaljer') + `?id=${data.id}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    const employee = employees.find(emp => emp.email === formData.ansvarlig);
    
    // Get names for ansatte deltakere
    const deltakereNavn = formData.deltakere_ansatte.map(email => {
      const emp = employees.find(e => e.email === email);
      return emp ? `${emp.first_name} ${emp.last_name}` : email;
    });
    
    createMutation.mutate({
      ...formData,
      ansvarlig_navn: employee ? `${employee.first_name} ${employee.last_name}` : formData.ansvarlig,
      deltakere_ansatte_navn: deltakereNavn
    });
  };

  const addEksternDeltaker = () => {
    if (!newEksternDeltaker.navn || !newEksternDeltaker.epost) {
      toast.error('Fyll ut navn og e-post');
      return;
    }
    setFormData({
      ...formData,
      deltakere_eksterne: [...formData.deltakere_eksterne, newEksternDeltaker]
    });
    setNewEksternDeltaker({ navn: '', epost: '' });
  };

  const removeEksternDeltaker = (index) => {
    const updated = [...formData.deltakere_eksterne];
    updated.splice(index, 1);
    setFormData({ ...formData, deltakere_eksterne: updated });
  };

  const toggleFaremoment = (faremoment) => {
    const current = formData.faremomenter || [];
    if (current.includes(faremoment)) {
      setFormData({
        ...formData,
        faremomenter: current.filter(f => f !== faremoment)
      });
    } else {
      setFormData({
        ...formData,
        faremomenter: [...current, faremoment]
      });
    }
  };

  const filteredSJA = sjaList.filter((sja) => {
    const matchesSearch = sja.arbeidsoperasjon?.toLowerCase().includes(search.toLowerCase()) ||
                          sja.beskrivelse_av_arbeidsoperasjonen?.toLowerCase().includes(search.toLowerCase()) ||
                          sja.beskrivelse_av_arbeid?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sja.status === statusFilter;
    const matchesProject = !projectFilter || sja.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const toggleSelectSJA = (id) => {
    setSelectedSJAs(prev => 
      prev.includes(id) ? prev.filter(sjaId => sjaId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSJAs.length === filteredSJA.length) {
      setSelectedSJAs([]);
    } else {
      setSelectedSJAs(filteredSJA.map(sja => sja.id));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.SJA.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sja'] });
      setSelectedSJAs([]);
      toast.success('SJA slettet');
    }
  });

  const handleBulkDelete = () => {
    if (confirm(`Er du sikker på at du vil slette ${selectedSJAs.length} SJA?`)) {
      deleteMutation.mutate(selectedSJAs);
    }
  };

  const handleBulkDownloadPDF = () => {
    toast.info('PDF-nedlasting av flere SJA kommer snart');
  };

  const handleBulkResend = () => {
    toast.info('Send på nytt kommer snart');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'godkjent': return 'bg-green-100 text-green-700 border-green-200';
      case 'arkivert': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'opprettet': return 'Opprettet';
      case 'godkjent': return 'Godkjent';
      case 'arkivert': return 'Arkivert';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="SJA - Sikker Jobb Analyse"
        subtitle="Risikovurdering før arbeidsstart"
        icon={ClipboardCheck}
        onAdd={() => setShowDialog(true)}
        addLabel="Ny SJA"
        actions={
          selectedSJAs.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Slett ({selectedSJAs.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkResend}>
                <Send className="h-4 w-4 mr-2" />
                Send på nytt
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Last ned PDF
              </Button>
            </div>
          )
        }
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter arbeidsoperasjon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full lg:w-48 rounded-xl">
              <SelectValue placeholder="Alle prosjekter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Alle prosjekter</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-48 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="opprettet">Opprettet</SelectItem>
              <SelectItem value="arkivert">Arkivert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SJA List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredSJA.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Ingen SJA"
            description={search ? "Ingen SJA matcher søket ditt" : "Opprett SJA før oppstart av arbeidsoperasjoner"}
            actionLabel="Opprett SJA"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="space-y-3">
            {filteredSJA.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
                <Checkbox
                  checked={selectedSJAs.length === filteredSJA.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-slate-600">Velg alle</span>
              </div>
            )}
            {filteredSJA.map((sja) => {
              const project = projects.find(p => p.id === sja.project_id);
              const isSelected = selectedSJAs.includes(sja.id);
              return (
                <Card 
                  key={sja.id} 
                  className={`border-0 shadow-sm hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectSJA(sja.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(createPageUrl('SJADetaljer') + `?id=${sja.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900 text-sm">{sja.arbeidsoperasjon}</h3>
                          <Badge className={getStatusColor(sja.status)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {getStatusLabel(sja.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {project?.name || 'Prosjekt ikke funnet'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sja.sikkerhetsanalyse_utfort || sja.dato), 'dd.MM.yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {sja.ansvarlig_navn || sja.ansvarlig}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Opprett ny SJA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Prosjekt *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({...formData, project_id: value})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sikkerhetsanalyse utført *</Label>
                <Input
                  type="date"
                  value={formData.sikkerhetsanalyse_utfort}
                  onChange={(e) => setFormData({...formData, sikkerhetsanalyse_utfort: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Jobb utføres</Label>
                <Input
                  type="date"
                  value={formData.jobb_utfores}
                  onChange={(e) => setFormData({...formData, jobb_utfores: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label>Ansvarlig *</Label>
              <Select
                value={formData.ansvarlig}
                onValueChange={(value) => setFormData({...formData, ansvarlig: value})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg ansvarlig" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Deltakere fra bedriften</Label>
              <Select
                onValueChange={(value) => {
                  if (!formData.deltakere_ansatte.includes(value)) {
                    setFormData({
                      ...formData,
                      deltakere_ansatte: [...formData.deltakere_ansatte, value]
                    });
                  }
                }}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Legg til ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => !formData.deltakere_ansatte.includes(e.email)).map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.deltakere_ansatte.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.deltakere_ansatte.map((email, idx) => {
                    const emp = employees.find(e => e.email === email);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <span className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            deltakere_ansatte: formData.deltakere_ansatte.filter((_, i) => i !== idx)
                          })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Label>Andre deltakere (ikke ansatte)</Label>
              <div className="mt-1.5 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Navn"
                    value={newEksternDeltaker.navn}
                    onChange={(e) => setNewEksternDeltaker({...newEksternDeltaker, navn: e.target.value})}
                    className="rounded-xl"
                  />
                  <Input
                    type="email"
                    placeholder="E-post"
                    value={newEksternDeltaker.epost}
                    onChange={(e) => setNewEksternDeltaker({...newEksternDeltaker, epost: e.target.value})}
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addEksternDeltaker}
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.deltakere_eksterne.length > 0 && (
                  <div className="space-y-1">
                    {formData.deltakere_eksterne.map((deltaker, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">{deltaker.navn}</span>
                          <span className="text-slate-500 ml-2">({deltaker.epost})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEksternDeltaker(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">Eksterne deltakere får automatisk kopi av SJA når skjemaet lagres</p>
              </div>
            </div>

            <div>
              <Label>Arbeidsoperasjon *</Label>
              <Input
                value={formData.arbeidsoperasjon}
                onChange={(e) => setFormData({...formData, arbeidsoperasjon: e.target.value})}
                placeholder="F.eks. Montering av stillas"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Beskrivelse av arbeidsoperasjonen</Label>
              <Textarea
                value={formData.beskrivelse_av_arbeidsoperasjonen}
                onChange={(e) => setFormData({...formData, beskrivelse_av_arbeidsoperasjonen: e.target.value})}
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Faremomenter</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { key: 'personskade', label: 'Personskade' },
                  { key: 'materielle_skader', label: 'Materielle skader' },
                  { key: 'forurensning', label: 'Forurensning' },
                  { key: 'fallfare', label: 'Fallfare' },
                  { key: 'elektrisk_fare', label: 'Elektrisk fare' },
                  { key: 'annet', label: 'Annet' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFaremoment(key)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      (formData.faremomenter || []).includes(key)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Konsekvensgrad</Label>
              <Select
                value={formData.konsekvensgrad}
                onValueChange={(value) => setFormData({...formData, konsekvensgrad: value})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
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
                value={formData.tiltak}
                onChange={(e) => setFormData({...formData, tiltak: e.target.value})}
                rows={3}
                placeholder="Beskriv hvilke tiltak som skal utføres for å sikre sikker jobb..."
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="rounded-xl"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!formData.project_id || !formData.ansvarlig || !formData.arbeidsoperasjon || createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Oppretter...' : 'Opprett SJA'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}