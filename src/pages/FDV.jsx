import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { 
  FileText, Search, Plus, Building2, Calendar, 
  ChevronRight, Package, CheckCircle2, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FDV() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setcustomerFilter] = useState('all');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fdvPackages = [], isLoading } = useQuery({
    queryKey: ['fdvPackages'],
    queryFn: () => base44.entities.FDVPackage.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createFDVMutation = useMutation({
    mutationFn: async (projectId) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Prosjekt ikke funnet');

      return base44.entities.FDVPackage.create({
        project_id: projectId,
        project_name: project.name,
        customer_name: project.client_name,
        customer_email: project.client_email,
        status: 'kladd',
        approval_token: crypto.randomUUID()
      });
    },
    onSuccess: (newPackage) => {
      queryClient.invalidateQueries({ queryKey: ['fdvPackages'] });
      setShowCreateDialog(false);
      setSelectedProject('');
      toast.success('FDV-pakke opprettet');
      navigate(createPageUrl('FDVDetaljer') + '?id=' + newPackage.id);
    },
  });

  const filteredPackages = useMemo(() => {
    return fdvPackages.filter(pkg => {
      const matchesSearch = 
        pkg.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        pkg.customer_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
      const matchesCustomer = customerFilter === 'all' || pkg.customer_name === customerFilter;
      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [fdvPackages, search, statusFilter, customerFilter]);

  const uniqueCustomers = [...new Set(fdvPackages.map(p => p.customer_name).filter(Boolean))];

  const statusCounts = {
    kladd: fdvPackages.filter(p => p.status === 'kladd').length,
    under_arbeid: fdvPackages.filter(p => p.status === 'under_arbeid').length,
    klar_for_overlevering: fdvPackages.filter(p => p.status === 'klar_for_overlevering').length,
    overlevert: fdvPackages.filter(p => p.status === 'overlevert').length,
    signert: fdvPackages.filter(p => p.status === 'signert').length,
  };

  const projectsWithFDV = new Set(fdvPackages.map(p => p.project_id));
  const availableProjects = projects.filter(p => !projectsWithFDV.has(p.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="FDV-dokumentasjon"
        subtitle="Forvaltning, Drift og Vedlikehold"
        actions={
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
          >
            <Plus className="h-4 w-4" /> Opprett FDV fra prosjekt
          </Button>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.kladd}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Kladd</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.under_arbeid}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Under arbeid</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.klar_for_overlevering}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Klar</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.overlevert}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overlevert</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.signert}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Signert</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter prosjekt eller kunde..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="kladd">Kladd</SelectItem>
              <SelectItem value="under_arbeid">Under arbeid</SelectItem>
              <SelectItem value="klar_for_overlevering">Klar for overlevering</SelectItem>
              <SelectItem value="overlevert">Overlevert</SelectItem>
              <SelectItem value="signert">Signert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Kunde" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle kunder</SelectItem>
              {uniqueCustomers.map(customer => (
                <SelectItem key={customer} value={customer}>{customer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-sm">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredPackages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Ingen FDV-pakker"
            description="Opprett en FDV-pakke fra et eksisterende prosjekt"
            actionLabel="Opprett FDV"
            onAction={() => setShowCreateDialog(true)}
          />
        ) : (
          <div className="grid gap-4">
            {filteredPackages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900"
                onClick={() => navigate(createPageUrl('FDVDetaljer') + '?id=' + pkg.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {pkg.project_name}
                      </h3>
                      <StatusBadge status={pkg.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {pkg.customer_name}
                      </span>
                      {pkg.delivery_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Levering: {format(new Date(pkg.delivery_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                      )}
                      {pkg.signed_date && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Signert {format(new Date(pkg.signed_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Opprett FDV-pakke</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Velg prosjekt</Label>
              <ProjectSelector
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Velg prosjekt..."
                className="mt-1.5"
              />
              {availableProjects.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  Alle prosjekter har allerede FDV-pakke
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              Avbryt
            </Button>
            <Button
              onClick={() => selectedProject && createFDVMutation.mutate(selectedProject)}
              disabled={!selectedProject || createFDVMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}