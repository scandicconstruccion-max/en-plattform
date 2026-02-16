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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import StatCard from '@/components/shared/StatCard';
import {
  Building2, MapPin, Calendar, Users, Clock, AlertTriangle,
  FileText, Camera, CheckSquare, Edit, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ProsjektDetaljer() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState(null);
  
  const queryClient = useQueryClient();

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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowEditDialog(false);
    },
  });

  const handleEdit = () => {
    setFormData({
      name: project.name || '',
      project_number: project.project_number || '',
      description: project.description || '',
      client_name: project.client_name || '',
      address: project.address || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'planlagt',
      budget: project.budget || ''
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

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={project.name}
        subtitle={project.project_number ? `#${project.project_number}` : null}
        showBack
        backUrl={createPageUrl('Prosjekter')}
        actions={
          <Button variant="outline" onClick={handleEdit} className="rounded-xl gap-2">
            <Edit className="h-4 w-4" />
            Rediger
          </Button>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Project Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 border-0 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                  <StatusBadge status={project.status} className="mt-1" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.client_name && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Users className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Kunde</p>
                    <p className="font-medium text-slate-900">{project.client_name}</p>
                  </div>
                </div>
              )}
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
                    <p className="text-xs text-slate-500">Startdato</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(project.start_date), 'd. MMMM yyyy', { locale: nb })}
                    </p>
                  </div>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Sluttdato</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(project.end_date), 'd. MMMM yyyy', { locale: nb })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {project.description && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-medium text-slate-900 mb-2">Beskrivelse</h3>
                <p className="text-slate-600">{project.description}</p>
              </div>
            )}
          </Card>

          <div className="space-y-4">
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
            {project.budget && (
              <StatCard
                title="Budsjett"
                value={`${project.budget.toLocaleString('nb-NO')} kr`}
                icon={FileText}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100"
              />
            )}
          </div>
        </div>

        {/* Tabs */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <Tabs defaultValue="deviations" className="w-full">
            <div className="border-b border-slate-200 px-6">
              <TabsList className="h-14 bg-transparent gap-4 -mb-px">
                <TabsTrigger 
                  value="deviations" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Avvik ({deviations.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="timesheets"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Timer ({timesheets.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="images"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Bilder ({images.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="checklists"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Sjekklister ({checklists.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="deviations" className="p-6 m-0">
              {deviations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Ingen avvik registrert for dette prosjektet
                </div>
              ) : (
                <div className="space-y-3">
                  {deviations.map((deviation) => (
                    <div key={deviation.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{deviation.title}</p>
                        <p className="text-sm text-slate-500">{deviation.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={deviation.severity} />
                        <StatusBadge status={deviation.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timesheets" className="p-6 m-0">
              {timesheets.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Ingen timer registrert for dette prosjektet
                </div>
              ) : (
                <div className="space-y-3">
                  {timesheets.map((timesheet) => (
                    <div key={timesheet.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{timesheet.user_email}</p>
                        <p className="text-sm text-slate-500">
                          {timesheet.date && format(new Date(timesheet.date), 'd. MMM yyyy', { locale: nb })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{timesheet.hours} timer</p>
                        <StatusBadge status={timesheet.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="images" className="p-6 m-0">
              {images.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Ingen bilder lastet opp for dette prosjektet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img 
                        src={image.image_url} 
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="checklists" className="p-6 m-0">
              {checklists.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Ingen sjekklister opprettet for dette prosjektet
                </div>
              ) : (
                <div className="space-y-3">
                  {checklists.map((checklist) => (
                    <div key={checklist.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{checklist.title}</p>
                        <p className="text-sm text-slate-500">{checklist.template_name}</p>
                      </div>
                      <StatusBadge status={checklist.status} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rediger prosjekt</DialogTitle>
          </DialogHeader>
          {formData && (
            <form onSubmit={handleUpdate} className="space-y-4">
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
                  <Label>Kunde</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Adresse</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
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
                    rows={3}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
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
    </div>
  );
}