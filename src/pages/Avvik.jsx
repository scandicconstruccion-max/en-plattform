import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { AlertTriangle, Search, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Avvik() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    category: 'annet',
    severity: 'middels',
    status: 'ny',
    assigned_to: '',
    due_date: '',
    corrective_action: ''
  });

  const queryClient = useQueryClient();

  const { data: deviations = [], isLoading } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deviation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deviation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      category: 'annet',
      severity: 'middels',
      status: 'ny',
      assigned_to: '',
      due_date: '',
      corrective_action: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const filteredDeviations = deviations.filter(d => {
    const matchesSearch = d.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const categoryLabels = {
    sikkerhet: 'Sikkerhet',
    kvalitet: 'Kvalitet',
    miljo: 'Miljø',
    annet: 'Annet'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Avvik"
        subtitle={`${deviations.length} avvik registrert`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt avvik"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter avvik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="ny">Ny</SelectItem>
              <SelectItem value="under_behandling">Under behandling</SelectItem>
              <SelectItem value="lukket">Lukket</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <SelectValue placeholder="Alvorlighet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="lav">Lav</SelectItem>
              <SelectItem value="middels">Middels</SelectItem>
              <SelectItem value="hoy">Høy</SelectItem>
              <SelectItem value="kritisk">Kritisk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Deviations List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredDeviations.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Ingen avvik"
            description={search ? "Ingen avvik matcher søket ditt" : "Registrer avvik for å holde oversikt over kvalitetsproblemer"}
            actionLabel="Registrer avvik"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredDeviations.map((deviation) => (
              <Card key={deviation.id} className="p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      deviation.severity === 'kritisk' ? 'bg-red-100' :
                      deviation.severity === 'hoy' ? 'bg-orange-100' :
                      deviation.severity === 'middels' ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      <AlertTriangle className={`h-6 w-6 ${
                        deviation.severity === 'kritisk' ? 'text-red-600' :
                        deviation.severity === 'hoy' ? 'text-orange-600' :
                        deviation.severity === 'middels' ? 'text-amber-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{deviation.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{getProjectName(deviation.project_id)}</p>
                      {deviation.description && (
                        <p className="text-slate-600 mt-2 line-clamp-2">{deviation.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {deviation.created_date && format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                        {deviation.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {deviation.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={deviation.severity} />
                    <StatusBadge status={deviation.status} />
                    {deviation.category && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {categoryLabels[deviation.category]}
                      </span>
                    )}
                  </div>
                </div>
                {deviation.status !== 'lukket' && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateMutation.mutate({ 
                        id: deviation.id, 
                        data: { status: 'under_behandling' } 
                      })}
                      disabled={deviation.status === 'under_behandling'}
                      className="rounded-xl"
                    >
                      Under behandling
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ 
                        id: deviation.id, 
                        data: { status: 'lukket', closed_date: new Date().toISOString().split('T')[0] } 
                      })}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      Lukk avvik
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrer avvik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Kort beskrivelse av avviket"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sikkerhet">Sikkerhet</SelectItem>
                    <SelectItem value="kvalitet">Kvalitet</SelectItem>
                    <SelectItem value="miljo">Miljø</SelectItem>
                    <SelectItem value="annet">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alvorlighetsgrad</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(v) => setFormData({...formData, severity: v})}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lav">Lav</SelectItem>
                    <SelectItem value="middels">Middels</SelectItem>
                    <SelectItem value="hoy">Høy</SelectItem>
                    <SelectItem value="kritisk">Kritisk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detaljert beskrivelse av avviket..."
                rows={3}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ansvarlig</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  placeholder="E-post"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Korrigerende tiltak</Label>
              <Textarea
                value={formData.corrective_action}
                onChange={(e) => setFormData({...formData, corrective_action: e.target.value})}
                placeholder="Beskrivelse av tiltak..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Registrer avvik'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}