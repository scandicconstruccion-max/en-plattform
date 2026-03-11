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
import { Separator } from '@/components/ui/separator';
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
import EmployeeSearchField from '@/components/shared/EmployeeSearchField';
import CustomerSelectField from '@/components/shared/CustomerSelectField';
import HistoricContactPickerSection from '@/components/project/HistoricContactPickerSection';
import { filterProjectsByAccess } from '@/components/shared/permissions';
import { buildProjectHierarchy } from '@/components/shared/projectHierarchyUtils';
import ProjectHierarchyTree from '@/components/project/ProjectHierarchyTree';
import CreateSubprojectDialog from '@/components/project/CreateSubprojectDialog';
import CustomerManagerDialog from '@/components/shared/CustomerManagerDialog';
import { Building2, Search, MapPin, Calendar, Users, LayoutGrid, List, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Prosjekter() {
  const [showDialog, setShowDialog] = useState(false);
  const [showSubprojectDialog, setShowSubprojectDialog] = useState(false);
  const [selectedParentProject, setSelectedParentProject] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [formData, setFormData] = useState({
    name: '',
    project_number: '',
    description: '',
    client_name: '',
    client_contact: '',
    client_email: '',
    client_phone: '',
    address: '',
    address_street: '',
    address_postal: '',
    address_city: '',
    start_date: '',
    end_date: '',
    status: 'planlagt',
    budget: '',
    project_manager: '',
    project_manager_name: '',
    project_manager_phone: '',
    resident_name: '',
    resident_phone: '',
    resident_email: '',
    subcontractors: [],
    architects: [],
    consultants: []
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });
  
  // Filter projects based on user access
  const projects = user ? filterProjectsByAccess(user, allProjects) : allProjects;

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: showDialog
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      project_number: '',
      description: '',
      client_name: '',
      client_contact: '',
      client_email: '',
      client_phone: '',
      address: '',
      address_street: '',
      address_postal: '',
      address_city: '',
      start_date: '',
      end_date: '',
      status: 'planlagt',
      budget: '',
      project_manager: '',
      project_manager_name: '',
      project_manager_phone: '',
      resident_name: '',
      resident_phone: '',
      resident_email: '',
      subcontractors: [],
      architects: [],
      consultants: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numRes = await base44.functions.invoke('generateDocumentNumber', { type: 'project' });
    createMutation.mutate({
      ...formData,
      project_number: formData.project_number || numRes.data.documentNumber,
      budget: formData.budget ? parseFloat(formData.budget) : null
    });
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const isMainProject = !p.parent_id;
    return matchesSearch && matchesStatus && isMainProject;
  });

  const projectHierarchy = buildProjectHierarchy(projects);

  const handleAddSubproject = (parentProject) => {
    setSelectedParentProject(parentProject);
    setShowSubprojectDialog(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Prosjekter"
        subtitle={`${projects.length} prosjekter totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt prosjekt"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter prosjekt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 rounded-xl border-slate-200 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 rounded-xl h-9">
              <SelectValue placeholder="Alle statuser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="planlagt">Planlagt</SelectItem>
              <SelectItem value="aktiv">Påbegynt</SelectItem>
              <SelectItem value="pause">På pause</SelectItem>
              <SelectItem value="fullfort">Fullført</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Rutenett"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'hierarchy' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Hierarki"
            >
              <Building2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Ingen prosjekter"
            description={search ? "Ingen prosjekter matcher søket ditt" : "Kom i gang ved å opprette ditt første prosjekt"}
            actionLabel="Nytt prosjekt"
            onAction={() => setShowDialog(true)}
          />
        ) : viewMode === 'hierarchy' ? (
          <ProjectHierarchyTree 
            projects={projectHierarchy}
            onAddSubproject={handleAddSubproject}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Link key={project.id} to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}>
                <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <Building2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.project_number && (
                    <p className="text-sm text-slate-500 mb-3">#{project.project_number}</p>
                  )}
                  <div className="space-y-2 text-sm text-slate-500">
                    {project.client_name && (
                      <div className="flex items-center gap-2"><Users className="h-4 w-4" />{project.client_name}</div>
                    )}
                    {project.address && (
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{project.address}</div>
                    )}
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(project.start_date), 'd. MMM yyyy', { locale: nb })}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <Link key={project.id} to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}>
                <Card className="px-4 py-3 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                          {project.name}
                        </span>
                        {project.project_number && (
                          <span className="text-xs text-slate-400">#{project.project_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {project.client_name && (
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.client_name}</span>
                        )}
                        {project.address && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.address}</span>
                        )}
                        {project.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.start_date), 'd. MMM yyyy', { locale: nb })}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nytt prosjekt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Grunnleggende</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Prosjektnavn *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Skriv inn prosjektnavn"
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Prosjektnummer</Label>
                  <Input
                    value="Tildeles automatisk"
                    readOnly
                    disabled
                    className="mt-1.5 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
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
                    value={formData.address_street}
                    onChange={(e) => setFormData({...formData, address_street: e.target.value, address: [e.target.value, formData.address_city ? `${formData.address_postal} ${formData.address_city}`.trim() : ''].filter(Boolean).join(', ')})}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Postnummer</Label>
                  <Input
                    placeholder="0000"
                    value={formData.address_postal}
                    onChange={(e) => setFormData({...formData, address_postal: e.target.value, address: [formData.address_street, `${e.target.value} ${formData.address_city}`.trim()].filter(Boolean).join(', ')})}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Poststed</Label>
                  <Input
                    placeholder="By"
                    value={formData.address_city}
                    onChange={(e) => setFormData({...formData, address_city: e.target.value, address: [formData.address_street, `${formData.address_postal} ${e.target.value}`.trim()].filter(Boolean).join(', ')})}
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
                    placeholder="0"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Beskrivelse</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Beskrivelse av prosjektet..."
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

            {/* Resident/Contact Info */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Beboer / Annen kontakt</h4>
              <div className="space-y-3">
                <div>
                  <Label>Navn</Label>
                  <Input
                    value={formData.resident_name}
                    onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                    placeholder="F.eks. navn på beboer"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={formData.resident_phone}
                    onChange={(e) => setFormData({...formData, resident_phone: e.target.value})}
                    placeholder="Telefonnummer"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>E-post</Label>
                  <Input
                    value={formData.resident_email}
                    onChange={(e) => setFormData({...formData, resident_email: e.target.value})}
                    placeholder="E-postadresse"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Subcontractors */}
            <HistoricContactPickerSection
              type="subcontractor"
              items={formData.subcontractors}
              onChange={(v) => setFormData({...formData, subcontractors: v})}
              currentProjectId={null}
            />

            <Separator />

            {/* Architects */}
            <HistoricContactPickerSection
              type="architect"
              items={formData.architects}
              onChange={(v) => setFormData({...formData, architects: v})}
              currentProjectId={null}
            />

            <Separator />

            {/* Consultants */}
            <HistoricContactPickerSection
              type="consultant"
              items={formData.consultants}
              onChange={(v) => setFormData({...formData, consultants: v})}
              currentProjectId={null}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Oppretter...' : 'Opprett prosjekt'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Subproject Dialog */}
      <CreateSubprojectDialog
        open={showSubprojectDialog}
        onClose={() => setShowSubprojectDialog(false)}
        parentProject={selectedParentProject}
      />
    </div>
  );
}