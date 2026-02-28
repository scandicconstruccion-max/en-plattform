import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { BefaringStatusBadge } from '@/components/befaring/BefaringStatusBadge';
import BefaringForm from '@/components/befaring/BefaringForm';
import BefaringDetaljer from '@/components/befaring/BefaringDetaljer';
import CustomerDialog from '@/components/crm/CustomerDialog';
import { 
  ClipboardCheck, Search, Calendar, Building2, 
  ChevronRight, Filter, Users, LayoutGrid, List
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const befaringTypeLabels = {
  hms: 'HMS',
  kvalitet: 'Kvalitet',
  sluttkontroll: 'Sluttkontroll',
  overtakelse: 'Overtakelse',
  garantibefaring: 'Garantibefaring',
  annet: 'Annet'
};

export default function Befaring() {
  const [activeTab, setActiveTab] = useState('befaringer');
  const [showForm, setShowForm] = useState(false);
  const [selectedBefaring, setSelectedBefaring] = useState(null);
  const [editingBefaring, setEditingBefaring] = useState(null);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerView, setCustomerView] = useState('grid');
  const [customerSearch, setCustomerSearch] = useState('');

  const queryClient = useQueryClient();

  const { data: befaringer = [], isLoading } = useQuery({
    queryKey: ['befaringer'],
    queryFn: () => base44.entities.Befaring.list('-created_date'),
  });

  const { data: punkter = [] } = useQuery({
    queryKey: ['befaringPunkter'],
    queryFn: () => base44.entities.BefaringPunkt.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Befaring.create({ ...data, status: 'utkast' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringer'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Befaring.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringer'] });
      setShowForm(false);
      setEditingBefaring(null);
      setFormData({});
    },
  });

  const handleNew = () => {
    setFormData({ befaring_type: 'kvalitet' });
    setEditingBefaring(null);
    setShowForm(true);
  };

  const handleEdit = (befaring) => {
    setEditingBefaring(befaring);
    setFormData({
      name: befaring.name,
      befaring_type: befaring.befaring_type,
      project_id: befaring.project_id,
      date: befaring.date,
      notes: befaring.notes
    });
    setShowForm(true);
    setSelectedBefaring(null);
  };

  const handleSubmit = () => {
    if (editingBefaring) {
      updateMutation.mutate({ id: editingBefaring.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Ukjent prosjekt';
  };

  const getProject = (projectId) => {
    return projects.find(p => p.id === projectId);
  };

  const getPunkterCount = (befaringId) => {
    return punkter.filter(p => p.befaring_id === befaringId).length;
  };

  const getCompletedCount = (befaringId) => {
    return punkter.filter(p => p.befaring_id === befaringId && p.status === 'utfort').length;
  };

  const filteredBefaringer = befaringer.filter(b => {
    const matchesSearch = b.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesProject = projectFilter === 'all' || b.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Stats
  const activeCount = befaringer.filter(b => ['utkast', 'aktiv', 'signert', 'sendt'].includes(b.status)).length;
  const totalPunkter = punkter.length;
  const completedPunkter = punkter.filter(p => p.status === 'utfort').length;

  if (selectedBefaring) {
    const befaringPunkter = punkter.filter(p => p.befaring_id === selectedBefaring.id);
    const project = getProject(selectedBefaring.project_id);
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="px-6 lg:px-8 py-6">
            <BefaringDetaljer
              befaring={selectedBefaring}
              punkter={befaringPunkter}
              project={project}
              employees={employees}
              onBack={() => setSelectedBefaring(null)}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Befaring"
        subtitle="Gjennomfør og dokumenter befaringer"
        onAdd={handleNew}
        addLabel="Ny befaring"
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pågående befaringer</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Filter className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPunkter}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Totalt punkter</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedPunkter}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Utførte punkter</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter befaring..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="utkast">Utkast</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="signert">Signert</SelectItem>
              <SelectItem value="sendt">Sendt</SelectItem>
              <SelectItem value="fullfort">Fullført</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
        ) : filteredBefaringer.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Ingen befaringer"
            description="Opprett en befaring for å dokumentere og følge opp punkter"
            actionLabel="Ny befaring"
            onAction={handleNew}
          />
        ) : (
          <div className="grid gap-4">
            {filteredBefaringer.map((befaring) => {
              const punkterCount = getPunkterCount(befaring.id);
              const completedCount = getCompletedCount(befaring.id);
              const progress = punkterCount > 0 ? Math.round((completedCount / punkterCount) * 100) : 0;

              return (
                <Card 
                  key={befaring.id} 
                  className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900"
                  onClick={() => setSelectedBefaring(befaring)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{befaring.name}</h3>
                        <BefaringStatusBadge status={befaring.status} />
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {befaringTypeLabels[befaring.befaring_type]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {getProjectName(befaring.project_id)}
                        </span>
                        {befaring.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(befaring.date), 'd. MMM yyyy', { locale: nb })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="h-4 w-4" />
                          {punkterCount} punkt{punkterCount !== 1 ? 'er' : ''}
                          {punkterCount > 0 && ` (${completedCount} utført)`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {punkterCount > 0 && (
                        <div className="mt-3 max-w-xs">
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                              )}
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <BefaringForm
        open={showForm}
        onOpenChange={setShowForm}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEdit={!!editingBefaring}
      />
    </div>
  );
}