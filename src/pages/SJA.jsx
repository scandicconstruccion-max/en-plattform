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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ClipboardCheck, Search, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SJA() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    project_id: '',
    dato: new Date().toISOString().split('T')[0],
    ansvarlig: '',
    arbeidsoperasjon: '',
    beskrivelse_av_arbeid: ''
  });

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
    
    createMutation.mutate({
      ...formData,
      ansvarlig_navn: employee ? `${employee.first_name} ${employee.last_name}` : formData.ansvarlig,
      deltakere: [],
      deltakere_navn: []
    });
  };

  const filteredSJA = sjaList.filter((sja) => {
    const matchesSearch = sja.arbeidsoperasjon?.toLowerCase().includes(search.toLowerCase()) ||
                          sja.beskrivelse_av_arbeid?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sja.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-48 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="opprettet">Opprettet</SelectItem>
              <SelectItem value="godkjent">Godkjent</SelectItem>
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
          <div className="grid gap-4">
            {filteredSJA.map((sja) => {
              const project = projects.find(p => p.id === sja.project_id);
              return (
                <Card 
                  key={sja.id} 
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(createPageUrl('SJADetaljer') + `?id=${sja.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{sja.arbeidsoperasjon}</h3>
                          <Badge className={getStatusColor(sja.status)}>
                            {getStatusLabel(sja.status)}
                          </Badge>
                        </div>
                        {sja.beskrivelse_av_arbeid && (
                          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                            {sja.beskrivelse_av_arbeid}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {project?.name || 'Prosjekt ikke funnet'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(sja.dato), 'dd.MM.yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
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

            <div>
              <Label>Dato *</Label>
              <Input
                type="date"
                value={formData.dato}
                onChange={(e) => setFormData({...formData, dato: e.target.value})}
                className="mt-1.5 rounded-xl"
              />
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
              <Label>Arbeidsoperasjon *</Label>
              <Input
                value={formData.arbeidsoperasjon}
                onChange={(e) => setFormData({...formData, arbeidsoperasjon: e.target.value})}
                placeholder="F.eks. Montering av stillas"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Beskrivelse av arbeid</Label>
              <Textarea
                value={formData.beskrivelse_av_arbeid}
                onChange={(e) => setFormData({...formData, beskrivelse_av_arbeid: e.target.value})}
                rows={4}
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