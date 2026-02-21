import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { AlertTriangle, Search, Calendar, User, DollarSign, Mail, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Avvik() {
  const [showDialog, setShowDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    category: 'annet',
    severity: 'middels',
    status: 'ny',
    assigned_to: '',
    due_date: '',
    corrective_action: '',
    has_cost_consequence: false,
    cost_amount: '',
    cost_description: '',
    cost_responsible: ''
  });
  const [attachments, setAttachments] = useState([]);

  const queryClient = useQueryClient();

  const { data: deviations = [], isLoading } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deviation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deviation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
    }
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
      corrective_action: '',
      has_cost_consequence: false,
      cost_amount: '',
      cost_description: '',
      cost_responsible: ''
    });
    setAttachments([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      cost_amount: formData.cost_amount ? parseFloat(formData.cost_amount) : null,
      images: attachments.map(a => a.file_url).filter(Boolean)
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const getProjectEmail = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.client_email || '';
  };

  const handleSendEmail = (deviation) => {
    setSelectedDeviation(deviation);
    setShowEmailDialog(true);
  };

  const handleEmailSent = (updateData) => {
    updateMutation.mutate({
      id: selectedDeviation.id,
      data: updateData
    });
    setSelectedDeviation(null);
  };

  const handleMarkAsCompleted = async (deviation, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const user = await base44.auth.me();
      const newActivityLog = deviation.activity_log || [];
      
      newActivityLog.push({
        action: 'markert_utfort',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: 'Avvik markert som utført'
      });

      await updateMutation.mutateAsync({
        id: deviation.id,
        data: {
          status: 'utfort',
          completed_date: new Date().toISOString(),
          activity_log: newActivityLog
        }
      });
    } catch (error) {
      console.error('Feil ved markering som utført:', error);
    }
  };

  const filteredDeviations = deviations.filter((d) => {
    const matchesSearch = d.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject;
  });

  const categoryLabels = {
    sikkerhet: 'Sikkerhet',
    kvalitet: 'Kvalitet',
    miljo: 'Miljø',
    annet: 'Annet'
  };

  const costResponsibleLabels = {
    byggherre: 'Byggherre',
    entreprenor: 'Entreprenør',
    underentreprenor: 'Underentreprenør',
    annet: 'Annet'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Avvik"
        subtitle={`${deviations.length} avvik registrert`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt avvik" />


      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter avvik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200" />

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
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map((project) =>
              <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Deviations List */}
        {isLoading ?
        <div className="space-y-4">
            {[1, 2, 3].map((i) =>
          <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
          )}
          </div> :
        filteredDeviations.length === 0 ?
        <EmptyState
          icon={AlertTriangle}
          title="Ingen avvik"
          description={search ? "Ingen avvik matcher søket ditt" : "Registrer avvik for å holde oversikt over kvalitetsproblemer"}
          actionLabel="Registrer avvik"
          onAction={() => setShowDialog(true)} /> :


        <div className="space-y-4">
            {filteredDeviations.map((deviation) =>
          <Link key={deviation.id} to={createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                deviation.severity === 'kritisk' ? 'bg-red-100' :
                deviation.severity === 'hoy' ? 'bg-orange-100' :
                deviation.severity === 'middels' ? 'bg-amber-100' : 'bg-slate-100'}`
                }>
                      <AlertTriangle className={`h-6 w-6 ${
                  deviation.severity === 'kritisk' ? 'text-red-600' :
                  deviation.severity === 'hoy' ? 'text-orange-600' :
                  deviation.severity === 'middels' ? 'text-amber-600' : 'text-slate-600'}`
                  } />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{deviation.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{getProjectName(deviation.project_id)}</p>
                      {deviation.description &&
                  <p className="text-slate-600 mt-2 line-clamp-2">{deviation.description}</p>
                  }
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {deviation.created_date && format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                        {deviation.assigned_to &&
                    <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {deviation.assigned_to}
                          </span>
                    }
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={deviation.severity} />
                    <StatusBadge status={deviation.status} />
                    {deviation.category &&
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {categoryLabels[deviation.category]}
                      </span>
                }
                  </div>
                </div>

                {/* Cost Consequence Section */}
                {deviation.has_cost_consequence &&
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      
                      <h4 className="font-medium text-amber-800">Kostnadskonsekvens</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-amber-700">Beløp:</span>
                        <span className="ml-2 font-semibold text-amber-900">
                          {deviation.cost_amount?.toLocaleString('nb-NO')} kr
                        </span>
                      </div>
                      {deviation.cost_responsible &&
                <div>
                          <span className="text-amber-700">Ansvarlig:</span>
                          <span className="ml-2 font-medium text-amber-900">
                            {costResponsibleLabels[deviation.cost_responsible]}
                          </span>
                        </div>
                }
                      {deviation.cost_description &&
                <div className="sm:col-span-3">
                          <span className="text-amber-700">Beskrivelse:</span>
                          <span className="ml-2 text-amber-900">{deviation.cost_description}</span>
                        </div>
                }
                    </div>
                  </div>
            }

                {/* Delivery Status */}
                <DeliveryStatus item={deviation} />

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100" onClick={(e) => e.preventDefault()}>
                  <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendEmail(deviation)}
                className="rounded-xl gap-2">

                    <Mail className="h-4 w-4" />
                    Send til kunde
                  </Button>
                  {deviation.customer_approved && deviation.status === 'godkjent_kunde' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleMarkAsCompleted(deviation, e)}
                      disabled={updateMutation.isPending}
                      className="rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                      <CheckCircle2 className="h-4 w-4" />
                      Marker som utført
                    </Button>
                  )}
                  {deviation.status !== 'lukket' &&
              <>
                      <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate({
                    id: deviation.id,
                    data: { status: 'under_behandling' }
                  })}
                  disabled={deviation.status === 'under_behandling'}
                  className="rounded-xl">

                        Under behandling
                      </Button>
                      <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({
                    id: deviation.id,
                    data: { status: 'lukket', closed_date: new Date().toISOString().split('T')[0] }
                  })}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700">

                        Lukk avvik
                      </Button>
                    </>
              }
                </div>
              </Card>
            </Link>
          )}
        </div>
        }
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrer avvik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Kort beskrivelse av avviket"
                required
                className="mt-1.5 rounded-xl" />

            </div>
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({ ...formData, project_id: v })}
                className="mt-1.5 rounded-xl" />

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}>

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
                  onValueChange={(v) => setFormData({ ...formData, severity: v })}>

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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaljert beskrivelse av avviket..."
                rows={3}
                className="mt-1.5 rounded-xl" />

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ansvarlig</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="E-post"
                  className="mt-1.5 rounded-xl" />

              </div>
              <div>
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1.5 rounded-xl" />

              </div>
            </div>
            <div>
              <Label>Korrigerende tiltak</Label>
              <Textarea
                value={formData.corrective_action}
                onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                placeholder="Beskrivelse av tiltak..."
                rows={2}
                className="mt-1.5 rounded-xl" />

            </div>

            {/* File Upload Section */}
            <FileUploadSection
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projectId={formData.project_id}
              moduleType="deviation"
            />

            {/* Cost Consequence Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  
                  <Label className="font-medium">Kostnadskonsekvens</Label>
                </div>
                <Switch
                  checked={formData.has_cost_consequence}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_cost_consequence: checked })} />

              </div>
              
              {formData.has_cost_consequence &&
              <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Beløp (NOK)</Label>
                      <Input
                      type="number"
                      value={formData.cost_amount}
                      onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value })}
                      placeholder="0"
                      className="mt-1.5 rounded-xl" />

                    </div>
                    <div>
                      <Label>Ansvarlig part</Label>
                      <Select
                      value={formData.cost_responsible}
                      onValueChange={(v) => setFormData({ ...formData, cost_responsible: v })}>

                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue placeholder="Velg..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="byggherre">Byggherre</SelectItem>
                          <SelectItem value="entreprenor">Entreprenør</SelectItem>
                          <SelectItem value="underentreprenor">Underentreprenør</SelectItem>
                          <SelectItem value="annet">Annet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Beskrivelse av kostnad</Label>
                    <Textarea
                    value={formData.cost_description}
                    onChange={(e) => setFormData({ ...formData, cost_description: e.target.value })}
                    placeholder="Hva er kostnaden knyttet til..."
                    rows={2}
                    className="mt-1.5 rounded-xl" />

                  </div>
                </div>
              }
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

                {createMutation.isPending ? 'Lagrer...' : 'Registrer avvik'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="avvik"
        item={selectedDeviation}
        defaultEmail={selectedDeviation ? getProjectEmail(selectedDeviation.project_id) : ''}
        onSent={handleEmailSent} />

    </div>);

}