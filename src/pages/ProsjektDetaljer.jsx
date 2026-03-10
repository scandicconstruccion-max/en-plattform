import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import ProjectKPISection from '@/components/project/ProjectKPISection';
import GenerateFDVDialog from '@/components/project/GenerateFDVDialog';
import EmployeeSearchField from '@/components/shared/EmployeeSearchField';
import CustomerSelectField from '@/components/shared/CustomerSelectField';
import HistoricContactPickerSection from '@/components/project/HistoricContactPickerSection';
import CreateSubprojectDialog from '@/components/project/CreateSubprojectDialog';
import {
  Building2, MapPin, Calendar, Users, Clock, AlertTriangle,
  FileText, Camera, CheckSquare, Edit, Mail, Phone, User,
  HardHat, Ruler, Wrench, Plus, Trash2, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ProsjektDetaljer() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFDVDialog, setShowFDVDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSubprojectDialog, setShowSubprojectDialog] = useState(false);
  const [formData, setFormData] = useState(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['projectDeviations', projectId],
    queryFn: () => base44.entities.Deviation.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['projectTimesheets', projectId],
    queryFn: () => base44.entities.Timesheet.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['projectChecklists', projectId],
    queryFn: () => base44.entities.Checklist.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['projectImages', projectId],
    queryFn: () => base44.entities.ImageDoc.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: showEditDialog
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: parentProject } = useQuery({
    queryKey: ['parentProject', project?.parent_id],
    queryFn: () => project?.parent_id ? base44.entities.Project.filter({ id: project.parent_id }).then(p => p[0]) : null,
    enabled: !!project?.parent_id,
  });

  const childProjects = allProjects.filter(p => p.parent_id === projectId);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(createPageUrl('Prosjekter'));
    },
  });

  const handleEdit = () => {
    setFormData({
      name: project.name || '',
      project_number: project.project_number || '',
      description: project.description || '',
      client_name: project.client_name || '',
      client_contact: project.client_contact || '',
      client_email: project.client_email || '',
      client_phone: project.client_phone || '',
      address: project.address || '',
      address_street: project.address ? project.address.split(',')[0]?.trim() : '',
      address_postal: project.address ? (project.address.split(',')[1]?.trim().split(' ')[0] || '') : '',
      address_city: project.address ? (project.address.split(',')[1]?.trim().split(' ').slice(1).join(' ') || '') : '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'planlagt',
      budget: project.budget || '',
      project_manager_name: project.project_manager_name || '',
      project_manager: project.project_manager || '',
      project_manager_phone: project.project_manager_phone || '',
      subcontractors: project.subcontractors || [],
      architects: project.architects || [],
      consultants: project.consultants || []
    });
    setShowEditDialog(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    });
  };

  const addSubcontractor = () => {
    setFormData({
      ...formData,
      subcontractors: [...formData.subcontractors, { name: '', trade: '', contact_person: '', phone: '', email: '' }]
    });
  };

  const addArchitect = () => {
    setFormData({
      ...formData,
      architects: [...formData.architects, { company: '', contact_person: '', phone: '', email: '' }]
    });
  };

  const addConsultant = () => {
    setFormData({
      ...formData,
      consultants: [...formData.consultants, { company: '', discipline: '', contact_person: '', phone: '', email: '' }]
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Prosjekt ikke funnet</h2>
          <Link to={createPageUrl('Prosjekter')} className="text-emerald-600 hover:underline mt-2 inline-block">
            Tilbake til prosjekter
          </Link>
        </div>
      </div>
    );
  }

  const totalHours = timesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
  const openDeviations = deviations.filter(d => d.status !== 'lukket').length;

  const handleFDVGenerated = (fdvId) => {
    setShowFDVDialog(false);
    navigate(createPageUrl('FDVDetaljer') + `?id=${fdvId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={project.name}
        subtitle={project.project_number ? `#${project.project_number}` : null}
        showBack
        backUrl={createPageUrl('Dashboard')}
        actions={
          <div className="flex gap-2">
            {project.status === 'fullfort' && (
              <Button 
                onClick={() => setShowFDVDialog(true)} 
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <FileText className="h-4 w-4" />
                Generer FDV
              </Button>
            )}
            <Button variant="outline" onClick={handleEdit} className="rounded-xl gap-2">
              <Edit className="h-4 w-4" />
              Rediger
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)} 
              className="rounded-xl gap-2 border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Slett
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Section */}
        <ProjectKPISection projectId={projectId} userRole={user?.role} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Timer registrert"
            value={totalHours.toFixed(1)}
            icon={Clock}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            title="Åpne avvik"
            value={openDeviations}
            icon={AlertTriangle}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
          <StatCard
            title="Sjekklister"
            value={checklists.length}
            icon={CheckSquare}
            iconColor="text-teal-600"
            iconBg="bg-teal-100"
          />
          {project.budget && (
            <StatCard
              title="Budsjett"
              value={`${(project.budget / 1000000).toFixed(1)}M`}
              icon={FileText}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details Card */}
            <Card className="p-6 border-0 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                    <StatusBadge status={project.status} />
                  </div>
                  {project.description && (
                    <p className="text-slate-600 mt-2">{project.description}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.address && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Adresse</p>
                      <p className="font-medium text-slate-900">{project.address}</p>
                    </div>
                  </div>
                )}
                {project.start_date && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Periode</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(project.start_date), 'd. MMM yyyy', { locale: nb })}
                        {project.end_date && ` - ${format(new Date(project.end_date), 'd. MMM yyyy', { locale: nb })}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Subcontractors, Architects, Consultants */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <Tabs defaultValue="subcontractors" className="w-full">
                <div className="border-b border-slate-200 px-6">
                  <TabsList className="h-14 bg-transparent gap-4 -mb-px">
                    <TabsTrigger 
                      value="subcontractors" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                    >
                      <HardHat className="h-4 w-4 mr-2" />
                      Underentreprenører ({project.subcontractors?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="architects"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                    >
                      <Ruler className="h-4 w-4 mr-2" />
                      Arkitekter ({project.architects?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="consultants"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Rådgivere ({project.consultants?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="subcontractors" className="p-6 m-0">
                  {project.subcontractors?.length > 0 ? (
                    <div className="space-y-3">
                      {project.subcontractors.map((sub, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">{sub.name}</p>
                            <p className="text-sm text-slate-500">{sub.trade}</p>
                            {sub.contact_person && (
                              <p className="text-sm text-slate-600 mt-1">{sub.contact_person}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            {sub.phone && (
                              <a href={`tel:${sub.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Phone className="h-3 w-3" /> {sub.phone}
                              </a>
                            )}
                            {sub.email && (
                              <a href={`mailto:${sub.email}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Mail className="h-3 w-3" /> {sub.email}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Ingen underentreprenører registrert
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="architects" className="p-6 m-0">
                  {project.architects?.length > 0 ? (
                    <div className="space-y-3">
                      {project.architects.map((arch, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">{arch.company}</p>
                            {arch.contact_person && (
                              <p className="text-sm text-slate-600">{arch.contact_person}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            {arch.phone && (
                              <a href={`tel:${arch.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Phone className="h-3 w-3" /> {arch.phone}
                              </a>
                            )}
                            {arch.email && (
                              <a href={`mailto:${arch.email}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Mail className="h-3 w-3" /> {arch.email}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Ingen arkitekter registrert
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="consultants" className="p-6 m-0">
                  {project.consultants?.length > 0 ? (
                    <div className="space-y-3">
                      {project.consultants.map((cons, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">{cons.company}</p>
                            <p className="text-sm text-slate-500">{cons.discipline}</p>
                            {cons.contact_person && (
                              <p className="text-sm text-slate-600 mt-1">{cons.contact_person}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            {cons.phone && (
                              <a href={`tel:${cons.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Phone className="h-3 w-3" /> {cons.phone}
                              </a>
                            )}
                            {cons.email && (
                              <a href={`mailto:${cons.email}`} className="flex items-center gap-1 text-slate-600 hover:text-emerald-600">
                                <Mail className="h-3 w-3" /> {cons.email}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Ingen rådgivende ingeniører registrert
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Manager */}
            <Card className="p-6 border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                Prosjektleder
              </h3>
              {project.project_manager_name ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{project.project_manager_name}</p>
                  {project.project_manager && (
                    <a href={`mailto:${project.project_manager}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600">
                      <Mail className="h-4 w-4" /> {project.project_manager}
                    </a>
                  )}
                  {project.project_manager_phone && (
                    <a href={`tel:${project.project_manager_phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600">
                      <Phone className="h-4 w-4" /> {project.project_manager_phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Ingen prosjektleder tildelt</p>
              )}
            </Card>

            {/* Customer Info */}
            <Card className="p-6 border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Kundeinformasjon
              </h3>
              {project.client_name ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{project.client_name}</p>
                  {project.client_contact && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" /> {project.client_contact}
                    </p>
                  )}
                  {project.client_email && (
                    <a href={`mailto:${project.client_email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600">
                      <Mail className="h-4 w-4" /> {project.client_email}
                    </a>
                  )}
                  {project.client_phone && (
                    <a href={`tel:${project.client_phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600">
                      <Phone className="h-4 w-4" /> {project.client_phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Ingen kundeinformasjon</p>
              )}
            </Card>

            {/* Quick Links */}
            <Card className="p-6 border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Hurtiglenker</h3>
              <div className="space-y-2">
                <Link
                  to={createPageUrl(`Avvik?project=${projectId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="text-slate-700">Avvik ({deviations.length})</span>
                </Link>
                <Link
                  to={createPageUrl(`Bildedok?project=${projectId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Camera className="h-5 w-5 text-purple-600" />
                  <span className="text-slate-700">Bilder ({images.length})</span>
                </Link>
                <Link
                  to={createPageUrl(`Sjekklister?project=${projectId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <CheckSquare className="h-5 w-5 text-teal-600" />
                  <span className="text-slate-700">Sjekklister ({checklists.length})</span>
                </Link>
                <Link
                  to={createPageUrl(`Timelister?project=${projectId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-slate-700">Timer ({totalHours.toFixed(1)}t)</span>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Rediger prosjekt</DialogTitle>
          </DialogHeader>
          {formData && (
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Grunnleggende</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Prosjektnavn *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Prosjektnummer</Label>
                    <Input
                      value={formData.project_number}
                      onChange={(e) => setFormData({...formData, project_number: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({...formData, status: v})}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planlagt">Planlagt</SelectItem>
                        <SelectItem value="aktiv">Aktiv</SelectItem>
                        <SelectItem value="pause">På pause</SelectItem>
                        <SelectItem value="fullfort">Fullført</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Gateadresse</Label>
                    <Input
                      placeholder="Gatenavn og nummer"
                      value={formData.address_street || ''}
                      onChange={(e) => setFormData({...formData, address_street: e.target.value, address: [e.target.value, formData.address_city ? `${formData.address_postal || ''} ${formData.address_city}`.trim() : ''].filter(Boolean).join(', ')})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Postnummer</Label>
                    <Input
                      placeholder="0000"
                      value={formData.address_postal || ''}
                      onChange={(e) => setFormData({...formData, address_postal: e.target.value, address: [formData.address_street || '', `${e.target.value} ${formData.address_city || ''}`.trim()].filter(Boolean).join(', ')})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Poststed</Label>
                    <Input
                      placeholder="By"
                      value={formData.address_city || ''}
                      onChange={(e) => setFormData({...formData, address_city: e.target.value, address: [formData.address_street || '', `${formData.address_postal || ''} ${e.target.value}`.trim()].filter(Boolean).join(', ')})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Startdato</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Sluttdato</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Budsjett (NOK)</Label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Beskrivelse</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={2}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Project Manager */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Prosjektleder</h4>
                <EmployeeSearchField
                  employees={employees}
                  value={{ name: formData.project_manager_name, email: formData.project_manager, phone: formData.project_manager_phone }}
                  onChange={(emp) => setFormData({
                    ...formData,
                    project_manager_name: emp.name,
                    project_manager: emp.email,
                    project_manager_phone: emp.phone
                  })}
                />
              </div>

              <Separator />

              {/* Customer */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Kunde</h4>
                <CustomerSelectField
                  value={{ name: formData.client_name, contact: formData.client_contact, email: formData.client_email, phone: formData.client_phone }}
                  onChange={(c) => setFormData({...formData, client_name: c.name, client_contact: c.contact, client_email: c.email, client_phone: c.phone})}
                />
              </div>

              <Separator />

              {/* Subcontractors */}
              <HistoricContactPickerSection
                type="subcontractor"
                items={formData.subcontractors}
                onChange={(v) => setFormData({...formData, subcontractors: v})}
                currentProjectId={projectId}
              />

              <Separator />

              {/* Architects */}
              <HistoricContactPickerSection
                type="architect"
                items={formData.architects}
                onChange={(v) => setFormData({...formData, architects: v})}
                currentProjectId={projectId}
              />

              <Separator />

              {/* Consultants */}
              <HistoricContactPickerSection
                type="consultant"
                items={formData.consultants}
                onChange={(v) => setFormData({...formData, consultants: v})}
                currentProjectId={projectId}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
                  Avbryt
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  {updateMutation.isPending ? 'Lagrer...' : 'Lagre endringer'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate FDV Dialog */}
      <GenerateFDVDialog
        open={showFDVDialog}
        onClose={handleFDVGenerated}
        project={project}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Slett prosjekt</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700">
              Prosjektet "{project.name}" og all tilknyttet informasjon vil bli permanent slettet. 
              Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {deleteMutation.isPending ? 'Sletter...' : 'Slett prosjekt'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}