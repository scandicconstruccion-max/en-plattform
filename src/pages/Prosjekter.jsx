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
import { Building2, Search, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Prosjekter() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    project_number: '',
    description: '',
    client_name: '',
    address: '',
    start_date: '',
    end_date: '',
    status: 'planlagt',
    budget: ''
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
      address: '',
      start_date: '',
      end_date: '',
      status: 'planlagt',
      budget: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    });
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter prosjekt eller kunde..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Alle statuser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="planlagt">Planlagt</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="pause">På pause</SelectItem>
              <SelectItem value="fullfort">Fullført</SelectItem>
            </SelectContent>
          </Select>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}
              >
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
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {project.client_name}
                      </div>
                    )}
                    {project.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {project.address}
                      </div>
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
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nytt prosjekt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={formData.project_number}
                  onChange={(e) => setFormData({...formData, project_number: e.target.value})}
                  placeholder="f.eks. P-2024-001"
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
                  placeholder="Kundenavn"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label>Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Prosjektadresse"
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
                  rows={3}
                  className="mt-1.5 rounded-xl"
                />
              </div>
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
                {createMutation.isPending ? 'Oppretter...' : 'Opprett prosjekt'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}