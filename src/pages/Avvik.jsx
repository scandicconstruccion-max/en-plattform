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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { AlertTriangle, Search, Calendar, User, DollarSign, Mail, CheckCircle2, Eye, MessageSquare, Upload, History, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Avvik() {
  const [showDialog, setShowDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [selectedDeviations, setSelectedDeviations] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    category: 'annet',
    severity: 'middels',
    status: 'opprettet',
    assigned_to: '',
    due_date: '',
    corrective_action: '',
    has_cost_consequence: false,
    cost_amount: '',
    cost_description: '',
    cost_responsible: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadAttachments, setUploadAttachments] = useState([]);

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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedDeviation) return;

    try {
      const user = await base44.auth.me();
      const newActivityLog = selectedDeviation.activity_log || [];
      
      newActivityLog.push({
        action: 'kommentar',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: commentText
      });

      await updateMutation.mutateAsync({
        id: selectedDeviation.id,
        data: {
          activity_log: newActivityLog
        }
      });

      setCommentText('');
      setShowCommentDialog(false);
      setSelectedDeviation(null);
    } catch (error) {
      console.error('Feil ved lagring av kommentar:', error);
    }
  };

  const handleUploadDocuments = async () => {
    if (!selectedDeviation || uploadAttachments.length === 0) return;

    try {
      const user = await base44.auth.me();
      const newActivityLog = selectedDeviation.activity_log || [];
      
      newActivityLog.push({
        action: 'dokument_lastet_opp',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: `${uploadAttachments.length} dokument(er) lastet opp`
      });

      const updatedImages = [...(selectedDeviation.images || []), ...uploadAttachments.map(a => a.file_url)];

      await updateMutation.mutateAsync({
        id: selectedDeviation.id,
        data: {
          images: updatedImages,
          activity_log: newActivityLog
        }
      });

      setUploadAttachments([]);
      setShowUploadDialog(false);
      setSelectedDeviation(null);
    } catch (error) {
      console.error('Feil ved opplasting:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDeviations.length === filteredDeviations.length) {
      setSelectedDeviations([]);
    } else {
      setSelectedDeviations(filteredDeviations.map(d => d.id));
    }
  };

  const toggleSelectDeviation = (id) => {
    setSelectedDeviations(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const filteredDeviations = deviations.filter((d) => {
    const matchesSearch = d.title?.toLowerCase().includes(search.toLowerCase()) || 
                          d.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
    const matchesAssigned = assignedFilter === 'all' || d.assigned_to === assignedFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject && matchesAssigned;
  }).sort((a, b) => {
    let compareValue = 0;
    
    if (sortBy === 'created_date') {
      compareValue = new Date(a.created_date) - new Date(b.created_date);
    } else if (sortBy === 'status') {
      compareValue = (a.status || '').localeCompare(b.status || '');
    } else if (sortBy === 'title') {
      compareValue = (a.title || '').localeCompare(b.title || '');
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'sendt_kunde': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'utfort': return 'bg-green-100 text-green-700 border-green-200';
      case 'godkjent_kunde': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'opprettet': return 'bg-red-100 text-red-700 border-red-200';
      case 'fakturert': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sendt_kunde': return '🔵';
      case 'utfort': return '🟢';
      case 'godkjent_kunde': return '🟡';
      case 'opprettet': return '🔴';
      case 'fakturert': return '🟣';
      default: return '⚪';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'opprettet': return 'Ikke startet';
      case 'sendt_kunde': return 'Sendt til kunde';
      case 'godkjent_kunde': return 'Pågående';
      case 'utfort': return 'Utført';
      case 'fakturert': return 'Fakturert';
      default: return status;
    }
  };

  const uniqueAssignees = [...new Set(deviations.map(d => d.assigned_to).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Avvik"
        subtitle={`${deviations.length} avvik registrert`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt avvik" />


      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter avvik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="opprettet">Ikke startet</SelectItem>
              <SelectItem value="sendt_kunde">Sendt til kunde</SelectItem>
              <SelectItem value="godkjent_kunde">Pågående</SelectItem>
              <SelectItem value="utfort">Utført</SelectItem>
              <SelectItem value="fakturert">Fakturert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="rounded-xl">
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
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Ansvarlig" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle ansvarlige</SelectItem>
              {uniqueAssignees.map((assignee) =>
              <SelectItem key={assignee} value={assignee}>
                  {assignee}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Deviations List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
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
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Card className="border-0 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedDeviations.length === filteredDeviations.length && filteredDeviations.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>
                        <button onClick={() => {
                          setSortBy('title');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}>
                          Beskrivelse
                        </button>
                      </TableHead>
                      <TableHead>Prosjekt</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>
                        <button onClick={() => {
                          setSortBy('status');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}>
                          Status
                        </button>
                      </TableHead>
                      <TableHead>
                        <button onClick={() => {
                          setSortBy('created_date');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}>
                          Dato opprettet
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeviations.map((deviation) => {
                      const project = projects.find(p => p.id === deviation.project_id);
                      return (
                        <TableRow key={deviation.id} className="cursor-pointer hover:bg-slate-50">
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedDeviations.includes(deviation.id)}
                              onCheckedChange={() => toggleSelectDeviation(deviation.id)}
                            />
                          </TableCell>
                          <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getStatusIcon(deviation.status)}</span>
                              <div>
                                <div className="font-medium text-slate-900">{deviation.title}</div>
                                {deviation.description && (
                                  <div className="text-sm text-slate-500 line-clamp-1">{deviation.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <span className="text-slate-600">{project?.name || '-'}</span>
                          </TableCell>
                          <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <span className="text-slate-600">{project?.client_name || '-'}</span>
                          </TableCell>
                          <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(deviation.status)}`}>
                              {getStatusLabel(deviation.status)}
                            </span>
                          </TableCell>
                          <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <span className="text-slate-600">
                              {format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Se detaljer
                                  </DropdownMenuItem>
                                  {deviation.customer_approved && deviation.status === 'godkjent_kunde' && (
                                    <DropdownMenuItem onClick={() => handleMarkAsCompleted(deviation)}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Marker som utført
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedDeviation(deviation);
                                    setShowCommentDialog(true);
                                  }}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Legg til kommentar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedDeviation(deviation);
                                    setShowUploadDialog(true);
                                  }}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Last opp dokument
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredDeviations.map((deviation) => {
                const project = projects.find(p => p.id === deviation.project_id);
                return (
                  <Card key={deviation.id} className="p-4 border-0 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedDeviations.includes(deviation.id)}
                        onCheckedChange={() => toggleSelectDeviation(deviation.id)}
                      />
                      <div className="flex-1" onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-lg">{getStatusIcon(deviation.status)}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{deviation.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{project?.name || 'Ukjent prosjekt'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(deviation.status)}`}>
                            {getStatusLabel(deviation.status)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Se detaljer
                          </DropdownMenuItem>
                          {deviation.customer_approved && deviation.status === 'godkjent_kunde' && (
                            <DropdownMenuItem onClick={() => handleMarkAsCompleted(deviation)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marker som utført
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setSelectedDeviation(deviation);
                            setShowCommentDialog(true);
                          }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Legg til kommentar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedDeviation(deviation);
                            setShowUploadDialog(true);
                          }}>
                            <Upload className="h-4 w-4 mr-2" />
                            Last opp dokument
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
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