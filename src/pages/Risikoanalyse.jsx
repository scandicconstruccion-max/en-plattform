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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { generateMultiElementPDF } from '@/components/shared/PDFGenerator';
import RisikoanalysePDFView from '@/components/risikoanalyse/RisikoanalysePDFView';
import SendRisikoanalyseDialog from '@/components/risikoanalyse/SendRisikoanalyseDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileCheck, Calendar, AlertTriangle, Filter, X, Download, Send, CheckCircle, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import ReactDOM from 'react-dom/client';

export default function Risikoanalyse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisikoniva, setFilterRisikoniva] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnalyser, setSelectedAnalyser] = useState([]);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

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
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const project = projects.find(p => p.id === a.project_id);
        const projectName = project?.name?.toLowerCase() || '';
        const arbeidsoperasjon = a.arbeidsoperasjon?.toLowerCase() || '';
        const ansvarlig = a.ansvarlig_navn?.toLowerCase() || '';
        
        if (!projectName.includes(query) && 
            !arbeidsoperasjon.includes(query) && 
            !ansvarlig.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [analyser, filterProject, filterStatus, filterRisikoniva, filterKategori, searchQuery, projects]);

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

  const handleSelectAnalyse = (analyseId, checked) => {
    if (checked) {
      setSelectedAnalyser(prev => [...prev, analyseId]);
    } else {
      setSelectedAnalyser(prev => prev.filter(id => id !== analyseId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedAnalyser(filteredAnalyser.map(a => a.id));
    } else {
      setSelectedAnalyser([]);
    }
  };

  const handleBulkDownload = async () => {
    toast.info('Genererer PDF...');
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    const elements = [];
    for (let i = 0; i < selectedAnalyser.length; i++) {
      const analyseId = selectedAnalyser[i];
      const analyse = analyser.find(a => a.id === analyseId);
      const project = projects.find(p => p.id === analyse?.project_id);
      
      const div = document.createElement('div');
      div.id = `risikoanalyse-pdf-${analyseId}`;
      tempContainer.appendChild(div);
      
      const root = ReactDOM.createRoot(div);
      root.render(<RisikoanalysePDFView analyse={analyse} project={project} />);
      
      elements.push({
        elementId: `risikoanalyse-pdf-${analyseId}`,
        title: `Risikoanalyse ${i + 1} - ${project?.name || 'Ukjent'}`
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await generateMultiElementPDF(elements, 'Risikoanalyser-samlet.pdf');
    document.body.removeChild(tempContainer);
    toast.success('PDF lastet ned');
  };

  const handleBulkSend = () => {
    setSendDialogOpen(true);
  };

  const lukkAnalyserMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedAnalyser.map(analyseId => {
        const analyse = analyser.find(a => a.id === analyseId);
        const updatedLog = [...(analyse?.aktivitetslogg || []), {
          action: 'lukket',
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name,
          details: 'Risikoanalyse lukket via bulk-handling'
        }];
        
        return base44.entities.Risikoanalyse.update(analyseId, {
          status: 'lukket',
          lukket_dato: new Date().toISOString(),
          lukket_av: user?.email,
          lukket_av_navn: user?.full_name,
          aktivitetslogg: updatedLog
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyser']);
      toast.success(`${selectedAnalyser.length} risikoanalyser lukket`);
      setSelectedAnalyser([]);
    },
    onError: () => {
      toast.error('Feil ved lukking av analyser');
    }
  });

  const slettAnalyserMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedAnalyser.map(analyseId => 
        base44.entities.Risikoanalyse.delete(analyseId)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['risikoanalyser']);
      toast.success(`${selectedAnalyser.length} risikoanalyser slettet`);
      setSelectedAnalyser([]);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Feil ved sletting av analyser');
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Risikoanalyse"
        subtitle={`${analyser.length} analyser registrert`}
        onAdd={() => navigate(createPageUrl('RisikoanalyseDetaljer?new=true'))}
        addLabel="Ny risikoanalyse"
        actions={
          selectedAnalyser.length > 0 && (
            <>
              <Button 
                onClick={handleBulkDownload}
                variant="outline" 
                className="rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Last ned PDF ({selectedAnalyser.length})
              </Button>
              <Button 
                onClick={handleBulkSend}
                variant="outline" 
                className="rounded-xl gap-2"
              >
                <Send className="h-4 w-4" />
                Send ({selectedAnalyser.length})
              </Button>
              <Button 
                onClick={() => lukkAnalyserMutation.mutate()}
                variant="outline" 
                className="rounded-xl gap-2"
                disabled={lukkAnalyserMutation.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Lukk ({selectedAnalyser.length})
              </Button>
              <Button 
                onClick={() => setDeleteDialogOpen(true)}
                variant="outline" 
                className="rounded-xl gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Slett ({selectedAnalyser.length})
              </Button>
            </>
          )
        }
      />

      <div className="px-6 lg:px-8 py-8">
        {/* Search */}
        <Card className="mb-4 border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-slate-400" />
              <Input
                placeholder="Søk etter prosjekt, arbeidsoperasjon eller ansvarlig..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
          <div className="space-y-4">
            {filteredAnalyser.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectedAnalyser.length === filteredAnalyser.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Velg alle ({filteredAnalyser.length})
                </label>
              </div>
            )}
            <div className="grid gap-4">
              {filteredAnalyser.map(analyse => {
                const project = projects.find(p => p.id === analyse.project_id);
                const isSelected = selectedAnalyser.includes(analyse.id);
                return (
                  <Card 
                    key={analyse.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectAnalyse(analyse.id, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(createPageUrl(`RisikoanalyseDetaljer?id=${analyse.id}`))}
                        >
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
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5">
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
          </div>
        )}
      </div>

      <SendRisikoanalyseDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        selectedAnalyser={selectedAnalyser}
        analyserList={analyser}
        projects={projects}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette {selectedAnalyser.length} risikoanalyse{selectedAnalyser.length > 1 ? 'r' : ''}? 
              Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => slettAnalyserMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={slettAnalyserMutation.isPending}
            >
              {slettAnalyserMutation.isPending ? 'Sletter...' : 'Slett'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}