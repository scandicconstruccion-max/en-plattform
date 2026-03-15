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
  DialogTitle,
  DialogDescription,
  DialogFooter } from
'@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
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
import ViewDeviationsDialog from '@/components/avvik/ViewDeviationsDialog';
import AvvikDashboard from '@/components/avvik/AvvikDashboard';
import AvvikTemplateSelector from '@/components/avvik/AvvikTemplates';
import GeotagButton from '@/components/avvik/GeotagButton';
import DocumentChatDrawer from '@/components/chat/DocumentChatDrawer';
import { AlertTriangle, Search, Calendar, User, DollarSign, Mail, CheckCircle2, Eye, MessageSquare, Upload, History, MoreVertical, ChevronDown, ChevronUp, Send, Download, Trash2, BarChart2, List, MapPin, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Avvik() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'dashboard'
  const [showDialog, setShowDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSentConfirmDialog, setShowSentConfirmDialog] = useState(false);
  const [sendAfterCreate, setSendAfterCreate] = useState(false);
  const [justCreatedDeviation, setJustCreatedDeviation] = useState(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [selectedDeviations, setSelectedDeviations] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [bulkEmailRecipient, setBulkEmailRecipient] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showTemplates, setShowTemplates] = useState(true);
  const [geoLocation, setGeoLocation] = useState(null);
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
    cost_responsible: '',
    template_used: ''
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deviation.create(data),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
      setShowDialog(false);
      resetForm();
      toast.success('Avvik registrert');

      // Send notification to assigned person if any
      if (created.assigned_to) {
        try {
          await base44.integrations.Core.SendEmail({
            to: created.assigned_to,
            subject: `Nytt avvik tildelt: ${created.title}`,
            body: `Hei,\n\nDu har fått tildelt et avvik:\n\nTittel: ${created.title}\nBeskrivelse: ${created.description || '-'}\nAlvorlighet: ${created.severity}\n\nLogg inn for å se detaljer.`
          });
        } catch {}
      }

      if (sendAfterCreate) {
        setSendAfterCreate(false);
        setJustCreatedDeviation(created);
        setSelectedDeviation(created);
        setShowEmailDialog(true);
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deviation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => base44.entities.Deviation.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
      setSelectedDeviations([]);
      setShowDeleteDialog(false);
    }
  });

  const resetForm = () => {
    setFormData({
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
      cost_responsible: '',
      template_used: ''
    });
    setAttachments([]);
    setGeoLocation(null);
    setShowTemplates(true);
  };

  const handleSubmit = async (e, andSend = false) => {
    e.preventDefault();
    setSendAfterCreate(andSend);
    const numRes = await base44.functions.invoke('generateDocumentNumber', { type: 'deviation' });
    createMutation.mutate({
      ...formData,
      deviation_number: numRes.data.documentNumber,
      cost_amount: formData.cost_amount ? parseFloat(formData.cost_amount) : null,
      images: attachments.map((a) => a.file_url).filter(Boolean),
      location_lat: geoLocation?.lat || null,
      location_lng: geoLocation?.lng || null,
      location_label: geoLocation?.label || null
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
    setJustCreatedDeviation(null);
    setShowSentConfirmDialog(true);
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
        user_name: user.display_name || user.full_name,
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
        user_name: user.display_name || user.full_name,
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
        user_name: user.display_name || user.full_name,
        details: `${uploadAttachments.length} dokument(er) lastet opp`
      });

      const updatedImages = [...(selectedDeviation.images || []), ...uploadAttachments.map((a) => a.file_url)];

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
      setSelectedDeviations(filteredDeviations.map((d) => d.id));
    }
  };

  const toggleSelectDeviation = (id) => {
    setSelectedDeviations((prev) =>
    prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleBulkEmail = async () => {
    if (!bulkEmailRecipient.trim()) {
      toast.error('Vennligst fyll inn mottaker');
      return;
    }

    try {
      for (const deviationId of selectedDeviations) {
        const deviation = deviations.find((d) => d.id === deviationId);
        if (deviation) {
          await base44.integrations.Core.SendEmail({
            to: bulkEmailRecipient,
            subject: `Avvik: ${deviation.title}`,
            body: `Hei,\n\nVedlagt informasjon om avvik:\n\nTittel: ${deviation.title}\nBeskrivelse: ${deviation.description || '-'}\nProsjekt: ${getProjectName(deviation.project_id)}\n\nMed vennlig hilsen`
          });
        }
      }
      toast.success(`${selectedDeviations.length} avvik sendt til ${bulkEmailRecipient}`);
      setSelectedDeviations([]);
      setBulkEmailRecipient('');
      setShowBulkEmailDialog(false);
    } catch (error) {
      console.error('Feil ved sending:', error);
      toast.error('Kunne ikke sende avvik');
    }
  };

  const handleBulkDownload = () => {
    toast.info('PDF-nedlasting kommer snart');
  };

  const handleBulkDelete = () => {
    deleteMutation.mutate(selectedDeviations);
  };

  const handleBulkStatusChange = async () => {
    if (!newStatus) return;

    try {
      const user = await base44.auth.me();

      for (const deviationId of selectedDeviations) {
        const deviation = deviations.find((d) => d.id === deviationId);
        if (deviation) {
          const newActivityLog = deviation.activity_log || [];
          newActivityLog.push({
            action: 'status_endret',
            timestamp: new Date().toISOString(),
            user_email: user.email,
            user_name: user.display_name || user.full_name,
            details: `Status endret til ${getStatusLabel(newStatus)}`
          });

          await updateMutation.mutateAsync({
            id: deviationId,
            data: {
              status: newStatus,
              activity_log: newActivityLog
            }
          });
        }
      }

      setSelectedDeviations([]);
      setShowStatusDialog(false);
      setNewStatus('');
    } catch (error) {
      console.error('Feil ved endring av status:', error);
    }
  };

  const filteredDeviations = deviations.filter((d) => {
    const matchesSearch = d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
    const matchesAssigned = assignedFilter === 'all' || d.assigned_to === assignedFilter;
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject && matchesAssigned && matchesCategory;
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
    fremdrift: 'Fremdrift',
    prosjektering: 'Prosjektering',
    dokumentasjon: 'Dokumentasjon',
    hms: 'HMS',
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
      case 'sendt_kunde':return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'utfort':return 'bg-green-100 text-green-700 border-green-200';
      case 'godkjent_kunde':return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'opprettet':return 'bg-red-100 text-red-700 border-red-200';
      case 'fakturert':return 'bg-purple-100 text-purple-700 border-purple-200';
      default:return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sendt_kunde':return '🔵';
      case 'utfort':return '🟢';
      case 'godkjent_kunde':return '🟡';
      case 'opprettet':return '🔴';
      case 'fakturert':return '🟣';
      default:return '⚪';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'opprettet':return 'Ikke startet';
      case 'sendt_kunde':return 'Sendt til kunde';
      case 'godkjent_kunde':return 'Pågående';
      case 'utfort':return 'Utført';
      case 'fakturert':return 'Fakturert';
      default:return status;
    }
  };

  const uniqueAssignees = [...new Set(deviations.map((d) => d.assigned_to).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Avvik"
        subtitle={`${filteredDeviations.length} avvik`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt avvik"
        actions={
        selectedDeviations.length > 0 &&
        <div className="flex gap-2">
              <Button
            onClick={() => setShowBulkEmailDialog(true)}
            variant="outline"
            className="rounded-xl gap-2">

                <Send className="h-4 w-4" />
                Send på nytt ({selectedDeviations.length})
              </Button>
              <Button
            onClick={() => setShowStatusDialog(true)}
            variant="outline"
            className="rounded-xl gap-2">

                <CheckCircle2 className="h-4 w-4" />
                Endre status
              </Button>
              







              <Button
            onClick={handleBulkDownload}
            variant="outline"
            className="rounded-xl gap-2">

                <Download className="h-4 w-4" />
                Last ned PDF
              </Button>
              <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="rounded-xl gap-2">

                <Trash2 className="h-4 w-4" />
                Slett ({selectedDeviations.length})
              </Button>
              <Button
            onClick={() => setSelectedDeviations([])}
            variant="outline"
            className="rounded-xl">

                Avbryt
              </Button>
            </div>

        } />



      <div className="px-6 lg:px-8 py-6">

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>

            <List className="h-4 w-4" />
            Avviksliste
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>

            <BarChart2 className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        {/* Dashboard tab */}
        {activeTab === 'dashboard' &&
        <AvvikDashboard deviations={deviations} />
        }

        {activeTab === 'list' && <>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ikke startet', status: 'opprettet', count: deviations.filter((d) => d.status === 'opprettet').length },
            { label: 'Sendt til kunde', status: 'sendt_kunde', count: deviations.filter((d) => d.status === 'sendt_kunde').length },
            { label: 'Pågående', status: 'godkjent_kunde', count: deviations.filter((d) => d.status === 'godkjent_kunde').length },
            { label: 'Utført', status: 'utfort', count: deviations.filter((d) => d.status === 'utfort').length }].
            map(({ label, status, count }) =>
            <Card
              key={status}
              className={`p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all ${statusFilter === status ? 'ring-2 ring-slate-400' : 'hover:ring-2 hover:ring-slate-200'}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>

              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </Card>
            )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle kategorier</SelectItem>
              <SelectItem value="hms">HMS</SelectItem>
              <SelectItem value="sikkerhet">Sikkerhet</SelectItem>
              <SelectItem value="kvalitet">Kvalitet</SelectItem>
              <SelectItem value="fremdrift">Fremdrift</SelectItem>
              <SelectItem value="prosjektering">Prosjektering</SelectItem>
              <SelectItem value="dokumentasjon">Dokumentasjon</SelectItem>
              <SelectItem value="miljo">Miljø</SelectItem>
              <SelectItem value="annet">Annet</SelectItem>
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
        {isLoading ?
          <div className="space-y-4">
            {[1, 2, 3].map((i) =>
            <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
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
                          onCheckedChange={toggleSelectAll} />

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
                      <TableHead>Kategori</TableHead>
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
                      const project = projects.find((p) => p.id === deviation.project_id);
                      const isExpanded = expandedRow === deviation.id;
                      return (
                        <React.Fragment key={deviation.id}>
                          <TableRow className="cursor-pointer hover:bg-slate-50">
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedDeviations.includes(deviation.id)}
                                onCheckedChange={() => toggleSelectDeviation(deviation.id)} />

                            </TableCell>
                            <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getStatusIcon(deviation.status)}</span>
                                <div>
                                  <div className="font-medium text-slate-900">{deviation.title}</div>
                                  {deviation.description &&
                                  <div className="text-sm text-slate-500 line-clamp-1">{deviation.description}</div>
                                  }
                                </div>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                              <span className="text-slate-600">{project?.name || '-'}</span>
                            </TableCell>
                            <TableCell onClick={() => window.location.href = createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`}>
                              {deviation.category &&
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                                  {categoryLabels[deviation.category] || deviation.category}
                                </span>
                              }
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedRow(isExpanded ? null : deviation.id)}
                                  className="h-8 w-8 p-0">

                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
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
                                    {deviation.customer_approved && deviation.status === 'godkjent_kunde' &&
                                    <DropdownMenuItem onClick={() => handleMarkAsCompleted(deviation)}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Marker som utført
                                      </DropdownMenuItem>
                                    }
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
                          {isExpanded &&
                          <TableRow>
                              <TableCell colSpan={8} className="bg-slate-50 p-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-slate-700">Kostnadskonsekvens:</span>
                                    <span className="ml-2 text-slate-600">
                                      {deviation.has_cost_consequence ? `${deviation.cost_amount?.toLocaleString('nb-NO')} kr - ${deviation.cost_description}` : 'Nei'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-slate-700">Frist:</span>
                                    <span className="ml-2 text-slate-600">
                                      {deviation.due_date ? format(new Date(deviation.due_date), 'd. MMM yyyy', { locale: nb }) : '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-slate-700">Ansvarlig:</span>
                                    <span className="ml-2 text-slate-600">{deviation.assigned_to || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-slate-700">Registrert av:</span>
                                    <span className="ml-2 text-slate-600">{deviation.created_by || '-'}</span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          }
                        </React.Fragment>);

                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredDeviations.map((deviation) => {
                const project = projects.find((p) => p.id === deviation.project_id);
                const isExpanded = expandedRow === deviation.id;
                return (
                  <Card key={deviation.id} className="p-4 border-0 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedDeviations.includes(deviation.id)}
                        onCheckedChange={() => toggleSelectDeviation(deviation.id)} />

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
                        {deviation.category &&
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {categoryLabels[deviation.category] || deviation.category}
                          </span>
                          }
                        <span className="text-xs text-slate-500">
                          {format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                      </div>
                      {deviation.location_label &&
                        <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{deviation.location_label}</p>
                        }
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRow(isExpanded ? null : deviation.id);
                          }}
                          className="h-8 w-8 p-0">

                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
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
                            {deviation.customer_approved && deviation.status === 'godkjent_kunde' &&
                            <DropdownMenuItem onClick={() => handleMarkAsCompleted(deviation)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Marker som utført
                              </DropdownMenuItem>
                            }
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
                    </div>
                    {isExpanded &&
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">Kostnadskonsekvens:</span>
                          <span className="ml-2 text-slate-600">
                            {deviation.has_cost_consequence ? `${deviation.cost_amount?.toLocaleString('nb-NO')} kr - ${deviation.cost_description}` : 'Nei'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Frist:</span>
                          <span className="ml-2 text-slate-600">
                            {deviation.due_date ? format(new Date(deviation.due_date), 'd. MMM yyyy', { locale: nb }) : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Ansvarlig:</span>
                          <span className="ml-2 text-slate-600">{deviation.assigned_to || '-'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Registrert av:</span>
                          <span className="ml-2 text-slate-600">{deviation.created_by || '-'}</span>
                        </div>
                      </div>
                    }
                  </Card>);

              })}
            </div>
          </>
          }
          </>}
          </div>

          {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {setShowDialog(open);if (!open) resetForm();}}>
        <DialogContent className="w-full max-w-lg max-h-[92dvh] flex flex-col p-0" onClick={(e) => e.stopPropagation()}>
          <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="my-2 text-lg font-semibold tracking-tight leading-none">Registrer avvik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 px-4 sm:px-6 pb-2 pt-4">

            {/* Template picker */}
            {showTemplates &&
            <div className="p-3 bg-slate-50 rounded-xl">
                <AvvikTemplateSelector onSelect={(tpl) => {
                setFormData((prev) => ({
                  ...prev,
                  title: tpl.title,
                  description: tpl.description,
                  corrective_action: tpl.corrective_action,
                  category: tpl.category,
                  severity: tpl.severity,
                  template_used: tpl.label
                }));
                setShowTemplates(false);
              }} />
              </div>
            }
            {!showTemplates &&
            <button type="button" onClick={() => setShowTemplates(true)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                <Tag className="h-3 w-3" /> Bytt avvikstype / mal
              </button>
            }

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
            <div>
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hms">HMS</SelectItem>
                  <SelectItem value="sikkerhet">Sikkerhet</SelectItem>
                  <SelectItem value="kvalitet">Kvalitet</SelectItem>
                  <SelectItem value="fremdrift">Fremdrift</SelectItem>
                  <SelectItem value="prosjektering">Prosjektering</SelectItem>
                  <SelectItem value="dokumentasjon">Dokumentasjon</SelectItem>
                  <SelectItem value="miljo">Miljø</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alvorlighetsgrad</Label>
              <div className="flex gap-3 mt-1.5">
                {[
                { value: 'lav', label: 'Lav', color: '#22c55e' },
                { value: 'hoy', label: 'Høy', color: '#f59e0b' },
                { value: 'kritisk', label: 'Kritisk', color: '#ef4444' }].
                map(({ value, label, color }) =>
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity: value })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                  formData.severity === value ?
                  'border-slate-400 bg-slate-100 shadow-sm' :
                  'border-slate-200 bg-white hover:bg-slate-50'}`
                  }>

                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </button>
                )}
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
            <div>
              <Label>Korrigerende tiltak</Label>
              <Textarea
                value={formData.corrective_action}
                onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                placeholder="Beskrivelse av tiltak..."
                rows={2}
                className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Avvik meldt til</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Velg ansatt" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) =>
                    <SelectItem key={employee.id} value={employee.email}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frist for utbedring</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1.5 rounded-xl" />
              </div>
            </div>

            {/* Geotagging */}
            <div>
              <Label className="mb-1.5 block">Lokasjon (valgfritt)</Label>
              <GeotagButton value={geoLocation} onChange={setGeoLocation} />
            </div>

            {/* File Upload Section */}
            <FileUploadSection
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projectId={formData.project_id}
              moduleType="deviation" />

            {/* Cost Consequence Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Kostnadskonsekvens</Label>
                <Switch
                  checked={formData.has_cost_consequence}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_cost_consequence: checked })} />
              </div>
              {formData.has_cost_consequence &&
              <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </form>

          {/* Sticky footer buttons */}
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl w-full sm:w-auto">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl w-full sm:w-auto"
              onClick={(e) => handleSubmit(e, false)}>
              {createMutation.isPending && !sendAfterCreate ? 'Lagrer...' : 'Registrer avvik'}
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || !formData.project_id}
              onClick={(e) => handleSubmit(e, true)}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 w-full sm:w-auto">
              <Send className="h-4 w-4" />
              {createMutation.isPending && sendAfterCreate ? 'Sender...' : 'Opprett og send'}
            </Button>
          </div>
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


      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Legg til kommentar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Skriv din kommentar..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              className="rounded-xl" />

          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentDialog(false);
                setCommentText('');
                setSelectedDeviation(null);
              }}
              className="rounded-xl">

              Avbryt
            </Button>
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim() || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

              {updateMutation.isPending ? 'Lagrer...' : 'Lagre kommentar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Last opp dokumenter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FileUploadSection
              attachments={uploadAttachments}
              onAttachmentsChange={setUploadAttachments}
              projectId={selectedDeviation?.project_id}
              moduleType="deviation" />

          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadAttachments([]);
                setSelectedDeviation(null);
              }}
              className="rounded-xl">

              Avbryt
            </Button>
            <Button
              onClick={handleUploadDocuments}
              disabled={uploadAttachments.length === 0 || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

              {updateMutation.isPending ? 'Laster opp...' : 'Last opp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmailDialog} onOpenChange={setShowBulkEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send avvik ({selectedDeviations.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-postadresse</Label>
              <Input
                type="email"
                placeholder="mottaker@example.com"
                value={bulkEmailRecipient}
                onChange={(e) => setBulkEmailRecipient(e.target.value)}
                className="mt-1.5 rounded-xl" />

            </div>
            <p className="text-sm text-slate-600">
              {selectedDeviations.length} avvik vil bli sendt til denne e-postadressen.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkEmailDialog(false);
                setBulkEmailRecipient('');
              }}
              className="rounded-xl">

              Avbryt
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={!bulkEmailRecipient.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Endre status ({selectedDeviations.length} avvik)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ny status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opprettet">
                    <div className="flex items-center gap-2">
                      <span>🔴</span>
                      <span>Ikke startet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sendt_kunde">
                    <div className="flex items-center gap-2">
                      <span>🔵</span>
                      <span>Sendt til kunde</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="godkjent_kunde">
                    <div className="flex items-center gap-2">
                      <span>🟡</span>
                      <span>Pågående</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="utfort">
                    <div className="flex items-center gap-2">
                      <span>🟢</span>
                      <span>Utført</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="my-2 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setNewStatus('');
              }} className="bg-background px-4 py-1 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9">


              Avbryt
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={!newStatus || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

              {updateMutation.isPending ? 'Endrer...' : 'Endre status'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette {selectedDeviations.length} avvik. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700">

              {deleteMutation.isPending ? 'Sletter...' : 'Slett'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sent Confirmation Dialog */}
      <AlertDialog open={showSentConfirmDialog} onOpenChange={setShowSentConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Avvik sendt!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Avviket er opprettet og e-post er sendt til mottaker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSentConfirmDialog(false)} className="bg-emerald-600 hover:bg-emerald-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Deviations Dialog */}
      <ViewDeviationsDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        selectedDeviations={selectedDeviations}
        deviationList={deviations}
        projects={projects} />


    </div>);

}