import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PackageCheck, Search, Calendar, Building2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function Mottakskontroll() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    leverandor: '',
    ordre_leveransenummer: '',
    beskrivelse_leveranse: '',
    kontrollert: false,
    har_avvik: false,
    avvik_beskrivelse: '',
    avvik_tiltak: '',
    avvik_ansvarlig: ''
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: mottakList = [], isLoading } = useQuery({
    queryKey: ['mottakskontroll'],
    queryFn: () => base44.entities.Mottakskontroll.list('-created_date')
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
    mutationFn: (data) => base44.entities.Mottakskontroll.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mottakskontroll'] });
      toast.success('Mottakskontroll registrert');
      setShowDialog(false);
      setFormData({
        project_id: '',
        leverandor: '',
        ordre_leveransenummer: '',
        beskrivelse_leveranse: '',
        kontrollert: false,
        har_avvik: false,
        avvik_beskrivelse: '',
        avvik_tiltak: '',
        avvik_ansvarlig: ''
      });
      setAttachments([]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => base44.entities.Mottakskontroll.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mottakskontroll'] });
      setSelectedItems([]);
      setShowDeleteDialog(false);
      toast.success('Mottakskontroll slettet');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    const employee = employees.find(emp => emp.email === formData.avvik_ansvarlig);
    
    const aktivitetslogg = [{
      action: 'opprettet',
      timestamp: new Date().toISOString(),
      user_email: user.email,
      user_name: user.full_name,
      details: 'Mottakskontroll opprettet'
    }];

    let status = 'registrert';
    if (formData.har_avvik) {
      status = 'avvik_registrert';
      aktivitetslogg.push({
        action: 'avvik_registrert',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: formData.avvik_beskrivelse
      });
    }

    createMutation.mutate({
      ...formData,
      dato: new Date().toISOString(),
      mottatt_av: user.email,
      mottatt_av_navn: user.full_name,
      avvik_ansvarlig_navn: employee ? `${employee.first_name} ${employee.last_name}` : formData.avvik_ansvarlig,
      vedlegg: attachments.map(a => a.file_url).filter(Boolean),
      status,
      aktivitetslogg
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredMottak.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMottak.map((m) => m.id));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    deleteMutation.mutate(selectedItems);
  };

  const filteredMottak = mottakList.filter((m) => {
    const matchesSearch = m.leverandor?.toLowerCase().includes(search.toLowerCase()) ||
                          m.beskrivelse_leveranse?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesProject = projectFilter === 'all' || m.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'lukket': return 'bg-green-100 text-green-700 border-green-200';
      case 'avvik_registrert': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'registrert': return 'Registrert';
      case 'avvik_registrert': return 'Avvik registrert';
      case 'lukket': return 'Lukket';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Mottakskontroll"
        subtitle="Dokumenter mottak av varer og materiell"
        icon={PackageCheck}
        onAdd={() => setShowDialog(true)}
        addLabel="Ny mottakskontroll"
        actions={
          selectedItems.length > 0 &&
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="rounded-xl gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Slett ({selectedItems.length})
            </Button>
            <Button
              onClick={() => setSelectedItems([])}
              variant="outline"
              className="rounded-xl"
            >
              Avbryt
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter leverandør eller beskrivelse..."
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
              <SelectItem value="all">Alle prosjekter</SelectItem>
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
              <SelectItem value="registrert">Registrert</SelectItem>
              <SelectItem value="avvik_registrert">Avvik registrert</SelectItem>
              <SelectItem value="lukket">Lukket</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredMottak.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Ingen mottakskontroller"
            description={search ? "Ingen mottakskontroller matcher søket ditt" : "Registrer mottakskontroll når varer mottas"}
            actionLabel="Registrer mottakskontroll"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="grid gap-4">
            {filteredMottak.map((mottak) => {
              const project = projects.find(p => p.id === mottak.project_id);
              return (
                <Card 
                  key={mottak.id} 
                  className="border-0 shadow-sm"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.includes(mottak.id)}
                        onCheckedChange={() => toggleSelectItem(mottak.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-slate-900">{mottak.leverandor}</h3>
                              <Badge className={getStatusColor(mottak.status)}>
                                {getStatusLabel(mottak.status)}
                              </Badge>
                              {mottak.har_avvik && (
                                <Badge className="bg-red-50 text-red-700 border-red-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Avvik
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mb-3">
                              {mottak.beskrivelse_leveranse}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {project?.name || 'Prosjekt ikke funnet'}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(mottak.dato || mottak.created_date), 'dd.MM.yyyy HH:mm')}
                              </div>
                              {mottak.ordre_leveransenummer && (
                                <div className="text-sm text-slate-500">
                                  Ordre: {mottak.ordre_leveransenummer}
                                </div>
                              )}
                            </div>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ny mottakskontroll</DialogTitle>
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

            <div>
              <Label>Leverandør *</Label>
              <Input
                value={formData.leverandor}
                onChange={(e) => setFormData({...formData, leverandor: e.target.value})}
                placeholder="Navn på leverandør"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Ordre-/leveransenummer</Label>
              <Input
                value={formData.ordre_leveransenummer}
                onChange={(e) => setFormData({...formData, ordre_leveransenummer: e.target.value})}
                placeholder="Valgfritt"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Beskrivelse av leveranse *</Label>
              <Textarea
                value={formData.beskrivelse_leveranse}
                onChange={(e) => setFormData({...formData, beskrivelse_leveranse: e.target.value})}
                rows={3}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="kontrollert"
                checked={formData.kontrollert}
                onCheckedChange={(checked) => setFormData({...formData, kontrollert: checked})}
              />
              <label
                htmlFor="kontrollert"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Er leveransen kontrollert?
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="har_avvik"
                checked={formData.har_avvik}
                onCheckedChange={(checked) => setFormData({...formData, har_avvik: checked})}
              />
              <label
                htmlFor="har_avvik"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Er det avvik?
              </label>
            </div>

            {formData.har_avvik && (
              <div className="p-4 bg-red-50 rounded-xl space-y-4">
                <div>
                  <Label>Beskrivelse av avvik</Label>
                  <Textarea
                    value={formData.avvik_beskrivelse}
                    onChange={(e) => setFormData({...formData, avvik_beskrivelse: e.target.value})}
                    rows={3}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Tiltak</Label>
                  <Textarea
                    value={formData.avvik_tiltak}
                    onChange={(e) => setFormData({...formData, avvik_tiltak: e.target.value})}
                    rows={2}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Ansvarlig</Label>
                  <Select
                    value={formData.avvik_ansvarlig}
                    onValueChange={(value) => setFormData({...formData, avvik_ansvarlig: value})}
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
              </div>
            )}

            <FileUploadSection
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projectId={formData.project_id}
              moduleType="manual"
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setFormData({
                    project_id: '',
                    leverandor: '',
                    ordre_leveransenummer: '',
                    beskrivelse_leveranse: '',
                    kontrollert: false,
                    har_avvik: false,
                    avvik_beskrivelse: '',
                    avvik_tiltak: '',
                    avvik_ansvarlig: ''
                  });
                  setAttachments([]);
                }}
                className="rounded-xl"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!formData.project_id || !formData.leverandor || !formData.beskrivelse_leveranse || createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Registrerer...' : 'Registrer mottakskontroll'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette {selectedItems.length} mottakskontroll(er). Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Sletter...' : 'Slett'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}