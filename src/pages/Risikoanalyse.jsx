import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { FileCheck, Calendar, AlertTriangle, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Risikoanalyse() {
  const navigate = useNavigate();
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisikoniva, setFilterRisikoniva] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');

  const { data: analyser = [] } = useQuery({
    queryKey: ['risikoanalyser'],
    queryFn: () => base44.entities.Risikoanalyse.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const filteredAnalyser = useMemo(() => {
    return analyser.filter(a => {
      if (filterProject !== 'all' && a.project_id !== filterProject) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterRisikoniva !== 'all') {
        const niva = getRisikonivaTekst(a.risikoniva);
        if (niva !== filterRisikoniva) return false;
      }
      if (filterKategori !== 'all' && !a.kategorier?.includes(filterKategori)) return false;
      return true;
    });
  }, [analyser, filterProject, filterStatus, filterRisikoniva, filterKategori]);

  const getRisikonivaTekst = (niva) => {
    if (niva <= 2) return 'Lav';
    if (niva <= 4) return 'Middels';
    if (niva <= 6) return 'Høy';
    return 'Kritisk';
  };

  const getRisikonivaBadge = (niva) => {
    const nivaTekst = getRisikonivaTekst(niva);
    const colors = {
      'Lav': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Middels': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Høy': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Kritisk': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return <Badge className={colors[nivaTekst]}>{nivaTekst}</Badge>;
  };

  const getStatusColor = (status) => {
    const colors = {
      'apen': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'under_arbeid': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'lukket': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'apen': 'Åpen',
      'under_arbeid': 'Under arbeid',
      'lukket': 'Lukket'
    };
    return labels[status] || status;
  };

  const getKategoriLabel = (kategori) => {
    const labels = {
      'fall_hoyde': 'Fall fra høyde',
      'klem_kutt': 'Klem-/kuttskader',
      'elektrisk': 'Elektrisk fare',
      'brann_eksplosjon': 'Brann/eksplosjon',
      'kjemikalier_stov': 'Kjemikalier/støv',
      'ergonomi_tunge_loft': 'Ergonomi/tunge løft',
      'maskiner_kjoretoy': 'Maskiner/kjøretøy',
      'ytre_forhold_vaer': 'Ytre forhold/vær',
      'samordning': 'Samordning',
      'annet': 'Annet'
    };
    return labels[kategori] || kategori;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Risikoanalyse"
        subtitle={`${analyser.length} analyser registrert`}
        onAdd={() => navigate(createPageUrl('RisikoanalyseDetaljer?new=true'))}
        addLabel="Ny risikoanalyse"
      />

      <div className="px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-slate-400" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
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

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Alle statuser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statuser</SelectItem>
                    <SelectItem value="apen">Åpen</SelectItem>
                    <SelectItem value="under_arbeid">Under arbeid</SelectItem>
                    <SelectItem value="lukket">Lukket</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterRisikoniva} onValueChange={setFilterRisikoniva}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Alle risikonivåer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle risikonivåer</SelectItem>
                    <SelectItem value="Lav">Lav</SelectItem>
                    <SelectItem value="Middels">Middels</SelectItem>
                    <SelectItem value="Høy">Høy</SelectItem>
                    <SelectItem value="Kritisk">Kritisk</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterKategori} onValueChange={setFilterKategori}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Alle kategorier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle kategorier</SelectItem>
                    <SelectItem value="fall_hoyde">Fall fra høyde</SelectItem>
                    <SelectItem value="klem_kutt">Klem-/kuttskader</SelectItem>
                    <SelectItem value="elektrisk">Elektrisk fare</SelectItem>
                    <SelectItem value="brann_eksplosjon">Brann/eksplosjon</SelectItem>
                    <SelectItem value="kjemikalier_stov">Kjemikalier/støv</SelectItem>
                    <SelectItem value="ergonomi_tunge_loft">Ergonomi/tunge løft</SelectItem>
                    <SelectItem value="maskiner_kjoretoy">Maskiner/kjøretøy</SelectItem>
                    <SelectItem value="ytre_forhold_vaer">Ytre forhold/vær</SelectItem>
                    <SelectItem value="samordning">Samordning</SelectItem>
                    <SelectItem value="annet">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterProject !== 'all' || filterStatus !== 'all' || filterRisikoniva !== 'all' || filterKategori !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFilterProject('all');
                    setFilterStatus('all');
                    setFilterRisikoniva('all');
                    setFilterKategori('all');
                  }}
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Kritisk</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyser.filter(a => a.risikoniva > 6).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Høy</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyser.filter(a => a.risikoniva > 4 && a.risikoniva <= 6).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Middels</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyser.filter(a => a.risikoniva > 2 && a.risikoniva <= 4).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lav</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyser.filter(a => a.risikoniva <= 2).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analyser List */}
        {filteredAnalyser.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="Ingen risikoanalyser"
            description="Opprett en ny risikoanalyse for å komme i gang"
            actionLabel="Ny risikoanalyse"
            onAction={() => navigate(createPageUrl('RisikoanalyseDetaljer?new=true'))}
          />
        ) : (
          <div className="grid gap-4">
            {filteredAnalyser.map(analyse => {
              const project = projects.find(p => p.id === analyse.project_id);
              return (
                <Card 
                  key={analyse.id}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900"
                  onClick={() => navigate(createPageUrl(`RisikoanalyseDetaljer?id=${analyse.id}`))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getStatusColor(analyse.status)}>
                            {getStatusLabel(analyse.status)}
                          </Badge>
                          {getRisikonivaBadge(analyse.risikoniva)}
                          {analyse.kategorier?.slice(0, 2).map(kat => (
                            <Badge key={kat} variant="outline" className="dark:border-slate-700">
                              {getKategoriLabel(kat)}
                            </Badge>
                          ))}
                          {analyse.kategorier?.length > 2 && (
                            <Badge variant="outline" className="dark:border-slate-700">
                              +{analyse.kategorier.length - 2}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {project?.name || 'Ukjent prosjekt'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                          {analyse.arbeidsoperasjon}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {analyse.risiko_beskrivelse}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(analyse.dato_analyse || analyse.created_date), 'dd.MM.yyyy', { locale: nb })}
                          </div>
                          {analyse.ansvarlig_navn && (
                            <div>Ansvarlig: {analyse.ansvarlig_navn}</div>
                          )}
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
    </div>
  );
}