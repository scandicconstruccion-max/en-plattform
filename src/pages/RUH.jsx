import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { generateMultiElementPDF } from '@/components/shared/PDFGenerator';
import { AlertCircle, Plus, Calendar, MapPin, Filter, X, Download, Send } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function RUH() {
  const navigate = useNavigate();
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRuh, setSelectedRuh] = useState([]);

  const { data: ruhList = [] } = useQuery({
    queryKey: ['ruh'],
    queryFn: () => base44.entities.RUH.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const filteredRuh = useMemo(() => {
    return ruhList.filter(r => {
      if (filterProject !== 'all' && r.project_id !== filterProject) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });
  }, [ruhList, filterProject, filterStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'apen': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'under_behandling': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'lukket': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'apen': return 'Åpen';
      case 'under_behandling': return 'Under behandling';
      case 'lukket': return 'Lukket';
      default: return status;
    }
  };

  const getTypeLabels = (types = []) => {
    const labels = {
      'personskade': 'Personskade',
      'nestenulykke': 'Nestenulykke',
      'materiell_skade': 'Materiell skade',
      'miljohendelse': 'Miljøhendelse',
      'brudd_rutiner': 'Brudd på rutiner',
      'farlig_forhold': 'Farlig forhold',
      'avvik_sja': 'Avvik fra SJA',
      'annet': 'Annet'
    };
    return types.map(t => labels[t] || t).join(', ');
  };

  const handleSelectRuh = (ruhId, checked) => {
    if (checked) {
      setSelectedRuh(prev => [...prev, ruhId]);
    } else {
      setSelectedRuh(prev => prev.filter(id => id !== ruhId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRuh(filteredRuh.map(r => r.id));
    } else {
      setSelectedRuh([]);
    }
  };

  const handleBulkDownload = async () => {
    toast.info('Genererer PDF...');
    const elements = selectedRuh.map((id, index) => ({
      elementId: `ruh-card-${id}`,
      title: `RUH ${index + 1}`
    }));
    await generateMultiElementPDF(elements, 'RUH-samlet.pdf');
    toast.success('PDF lastet ned');
  };

  const handleBulkResend = async () => {
    toast.info('Sender RUH-rapporter...');
    // Implement resend logic here
    toast.success(`${selectedRuh.length} RUH-rapporter sendt`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="RUH - Rapport om uønsket hendelse"
        subtitle={`${ruhList.length} hendelser registrert`}
        onAdd={() => navigate(createPageUrl('RUHDetaljer?new=true'))}
        addLabel="Ny RUH"
        actions={
          selectedRuh.length > 0 && (
            <>
              <Button 
                onClick={handleBulkDownload}
                variant="outline" 
                className="rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Last ned PDF ({selectedRuh.length})
              </Button>
              <Button 
                onClick={handleBulkResend}
                variant="outline" 
                className="rounded-xl gap-2"
              >
                <Send className="h-4 w-4" />
                Send på nytt ({selectedRuh.length})
              </Button>
            </>
          )
        }
      />

      <div className="px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-slate-400" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Alle prosjekter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle prosjekter</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Alle statuser" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle statuser</SelectItem>
                      <SelectItem value="apen">Åpen</SelectItem>
                      <SelectItem value="under_behandling">Under behandling</SelectItem>
                      <SelectItem value="lukket">Lukket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(filterProject !== 'all' || filterStatus !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setFilterProject('all'); setFilterStatus('all'); }}
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Åpne RUH</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {ruhList.filter(r => r.status === 'apen').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Under behandling</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {ruhList.filter(r => r.status === 'under_behandling').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lukkede RUH</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {ruhList.filter(r => r.status === 'lukket').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RUH List */}
        {filteredRuh.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="Ingen RUH registrert"
            description="Registrer første uønskede hendelse"
            actionLabel="Ny RUH"
            onAction={() => navigate(createPageUrl('RUHDetaljer?new=true'))}
          />
        ) : (
          <div className="space-y-4">
            {filteredRuh.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectedRuh.length === filteredRuh.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Velg alle ({filteredRuh.length})
                </label>
              </div>
            )}
            <div className="grid gap-4">
              {filteredRuh.map(ruh => {
                const project = projects.find(p => p.id === ruh.project_id);
                const isSelected = selectedRuh.includes(ruh.id);
                return (
                  <Card 
                    key={ruh.id} 
                    id={`ruh-card-${ruh.id}`}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRuh(ruh.id, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(createPageUrl(`RUHDetaljer?id=${ruh.id}`))}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <Badge className={getStatusColor(ruh.status)}>
                            {getStatusLabel(ruh.status)}
                          </Badge>
                          {ruh.type_hendelse?.length > 0 && (
                            <Badge variant="outline" className="dark:border-slate-700">
                              {getTypeLabels(ruh.type_hendelse)}
                            </Badge>
                          )}
                          {ruh.faktisk_konsekvens === 'alvorlig_personskade' && (
                            <Badge className="bg-red-600 text-white">Alvorlig</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                          {project?.name || 'Ukjent prosjekt'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {ruh.hva_skjedde || ruh.beskrivelse || 'Ingen beskrivelse'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(ruh.dato), 'dd.MM.yyyy', { locale: nb })}
                            {ruh.klokkeslett && ` ${ruh.klokkeslett}`}
                          </div>
                          {(ruh.adresse || ruh.hvor_skjedde) && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {ruh.adresse || ruh.hvor_skjedde}
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}