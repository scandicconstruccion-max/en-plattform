import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, ChevronRight, FolderOpen, Folder, FileText, Plus, RefreshCw, CheckSquare } from 'lucide-react';

const FAGGRUPPE_CONFIG = {
  'Tømrer':         { emoji: '🪵', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  'Elektrikker':    { emoji: '⚡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Rørlegger':      { emoji: '🔧', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Maler':          { emoji: '🖌️', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  'Murerer':        { emoji: '🧱', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'Blikkenslager':  { emoji: '🔩', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  'Taktekker':      { emoji: '🏠', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  'Membranlegger':  { emoji: '🛡️', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  'Sveiser':        { emoji: '🔥', color: 'bg-red-100 text-red-800 border-red-200' },
  'Betongarbeider': { emoji: '🏗️', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export default function SjekklisteBibliotek() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaggruppe, setSelectedFaggruppe] = useState(null);
  const [selectedBygningsdel, setSelectedBygningsdel] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list('-created_date', 300)
  });

  // Only templates that have faggruppe field (bibliotek-maler)
  const libTemplates = useMemo(() =>
    templates.filter(t => t.faggruppe),
    [templates]
  );

  // Build hierarchy
  const hierarchy = useMemo(() => {
    const map = {};
    for (const t of libTemplates) {
      const fg = t.faggruppe || 'Annet';
      const bd = t.bygningsdel || 'Generelt';
      if (!map[fg]) map[fg] = {};
      if (!map[fg][bd]) map[fg][bd] = [];
      map[fg][bd].push(t);
    }
    return map;
  }, [libTemplates]);

  // Filtered view for search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return libTemplates.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.faggruppe || '').toLowerCase().includes(q) ||
      (t.bygningsdel || '').toLowerCase().includes(q) ||
      (t.fokusomrade || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }, [libTemplates, searchTerm]);

  const selectedProject = (() => {
    try { return JSON.parse(localStorage.getItem('selectedProject')); } catch { return null; }
  })();

  const createChecklistMutation = useMutation({
    mutationFn: async (template) => {
      if (!selectedProject) throw new Error('Velg et prosjekt først');
      const date = new Date().toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const checklistData = {
        name: `${template.name} - ${selectedProject.name} (${date})`,
        project_id: selectedProject.id,
        template_id: template.id,
        template_version: template.version || 1,
        date: new Date().toISOString().split('T')[0],
        status: 'ikke_startet',
        responses: [],
        sections: template.sections || [],
        assigned_to: user?.email || '',
        assigned_to_name: user?.full_name || ''
      };
      return base44.entities.Checklist.create(checklistData);
    },
    onSuccess: (newChecklist) => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      navigate(createPageUrl('SjekklisteDetaljer') + `?id=${newChecklist.id}`);
    }
  });

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const res = await base44.functions.invoke('seedChecklistTemplates', {});
      setSeedMsg(res.data?.message || 'Ferdig!');
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    } catch (e) {
      setSeedMsg('Feil: ' + e.message);
    }
    setSeeding(false);
  };

  const faggrupper = Object.keys(hierarchy);
  const bygningsdeler = selectedFaggruppe ? Object.keys(hierarchy[selectedFaggruppe] || {}) : [];
  const visibleTemplates = selectedFaggruppe && selectedBygningsdel
    ? hierarchy[selectedFaggruppe]?.[selectedBygningsdel] || []
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('Sjekklister'))} className="gap-2 -ml-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Tilbake
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-7 w-7 text-emerald-600" />
              Sjekkliste-bibliotek
            </h1>
            <p className="text-slate-500 mt-1">Fagspesifikke sjekklister for alle bygningsfag</p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              {seedMsg && <span className="text-xs text-slate-500">{seedMsg}</span>}
              <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'Importerer...' : 'Importer standard-maler'}
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk etter faggruppe, bygningsdel, fokusområde..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedFaggruppe(null); setSelectedBygningsdel(null); }}
            className="pl-10 bg-white text-base"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Laster bibliotek...</div>
        ) : libTemplates.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-2">Ingen bibliotek-maler funnet</p>
            <p className="text-slate-400 text-sm mb-6">Klikk "Importer standard-maler" for å laste inn alle fagspesifikke maler.</p>
            {user?.role === 'admin' && (
              <Button onClick={handleSeed} disabled={seeding} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <RefreshCw className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'Importerer...' : 'Importer nå'}
              </Button>
            )}
          </Card>
        ) : searchTerm ? (
          /* Search results */
          <div>
            <p className="text-sm text-slate-500 mb-3">{searchResults.length} treff for "{searchTerm}"</p>
            {searchResults.length === 0 ? (
              <Card className="p-8 text-center bg-white">
                <p className="text-slate-500">Ingen maler matcher søket ditt.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {searchResults.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selectedProject={selectedProject}
                    onUse={() => createChecklistMutation.mutate(tpl)}
                    isLoading={createChecklistMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Hierarkisk navigasjon */
          <div className="flex flex-col md:flex-row gap-4">
            {/* Faggruppe-liste */}
            <div className="md:w-56 flex-shrink-0">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Faggruppe</h2>
              <div className="space-y-1">
                {faggrupper.map(fg => {
                  const cfg = FAGGRUPPE_CONFIG[fg] || { emoji: '📁', color: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const count = Object.values(hierarchy[fg]).reduce((s, arr) => s + arr.length, 0);
                  return (
                    <button
                      key={fg}
                      onClick={() => { setSelectedFaggruppe(fg); setSelectedBygningsdel(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all text-sm font-medium border
                        ${selectedFaggruppe === fg
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}
                    >
                      <span className="text-lg">{cfg.emoji}</span>
                      <span className="flex-1 truncate">{fg}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${selectedFaggruppe === fg ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bygningsdel + maler */}
            <div className="flex-1 min-w-0">
              {!selectedFaggruppe ? (
                <div className="text-center py-16 text-slate-400">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Velg en faggruppe til venstre for å se sjekklister</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Bygningsdel */}
                  <div className="sm:w-52 flex-shrink-0">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Bygningsdel</h2>
                    <div className="space-y-1">
                      {bygningsdeler.map(bd => {
                        const count = hierarchy[selectedFaggruppe][bd].length;
                        return (
                          <button
                            key={bd}
                            onClick={() => setSelectedBygningsdel(bd)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm border
                              ${selectedBygningsdel === bd
                                ? 'bg-slate-800 text-white border-slate-800 shadow'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}
                          >
                            {selectedBygningsdel === bd
                              ? <FolderOpen className="h-4 w-4 flex-shrink-0" />
                              : <Folder className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                            <span className="flex-1 truncate">{bd}</span>
                            <span className={`text-xs ${selectedBygningsdel === bd ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Maler */}
                  <div className="flex-1 min-w-0">
                    {!selectedBygningsdel ? (
                      <div className="text-center py-12 text-slate-400">
                        <Folder className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Velg en bygningsdel</p>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                          Sjekklister – {selectedBygningsdel}
                        </h2>
                        <div className="space-y-3">
                          {visibleTemplates.map(tpl => (
                            <TemplateCard
                              key={tpl.id}
                              template={tpl}
                              selectedProject={selectedProject}
                              onUse={() => createChecklistMutation.mutate(tpl)}
                              isLoading={createChecklistMutation.isPending}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, selectedProject, onUse, isLoading }) {
  const cfg = FAGGRUPPE_CONFIG[template.faggruppe] || { emoji: '📋', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  const totalItems = (template.sections || []).reduce((s, sec) => s + (sec.items?.length || 0), 0);

  return (
    <Card className="p-4 bg-white border hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="text-2xl mt-0.5">{cfg.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {template.faggruppe && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                {template.faggruppe}
              </span>
            )}
            {template.bygningsdel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {template.bygningsdel}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{template.name}</h3>
          {template.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span><FileText className="h-3 w-3 inline mr-1" />{totalItems} punkter</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onUse}
          disabled={isLoading || !selectedProject}
          title={!selectedProject ? 'Velg et prosjekt først' : 'Opprett sjekkliste'}
          className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Bruk</span>
        </Button>
      </div>
    </Card>
  );
}