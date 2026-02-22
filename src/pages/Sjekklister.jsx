import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { Plus, Settings, Trash2, Copy, Search, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import ProjectDropdown from '@/components/dashboard/ProjectDropdown';

export default function Sjekklister() {
  const [activeTab, setActiveTab] = useState('project');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('alle');
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showSelectTemplateDialog, setShowSelectTemplateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('annet');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    const stored = localStorage.getItem('selectedProject');
    if (stored) {
      setSelectedProject(JSON.parse(stored));
    }
    const handleProjectChange = () => {
      const updated = localStorage.getItem('selectedProject');
      if (updated) {
        setSelectedProject(JSON.parse(updated));
      }
    };
    window.addEventListener('projectSelected', handleProjectChange);
    return () => window.removeEventListener('projectSelected', handleProjectChange);
  }, []);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list('-updated_date', 100)
  });

  const { data: checklists = [], isLoading: checklistsLoading } = useQuery({
    queryKey: ['checklists', selectedProject?.id],
    queryFn: () => selectedProject?.id ?
    base44.entities.Checklist.filter({ project_id: selectedProject.id }, '-updated_date', 100) :
    Promise.resolve([]),
    enabled: !!selectedProject?.id
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setShowNewTemplateDialog(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateCategory('annet');
      setNewTemplateItems([]);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    }
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (id) => base44.entities.Checklist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  const createChecklistFromTemplateMutation = useMutation({
    mutationFn: (template) => {
      return base44.entities.Checklist.create({
        name: template.name,
        project_id: selectedProject.id,
        template_id: template.id,
        template_version: template.version,
        items: template.items || [],
        status: 'ikke_startet',
        responses: []
      });
    },
    onSuccess: (newChecklist) => {
      setShowSelectTemplateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.setQueryData(['checklist', newChecklist.id], newChecklist);
      setTimeout(() => {
        navigate(createPageUrl('SjekklisteDetaljer') + `?id=${newChecklist.id}`);
      }, 100);
    },
    onError: (error) => {
      console.error('Feil ved opprettelse av sjekkliste:', error);
      alert('Feil ved opprettelse av sjekkliste');
    }
  });

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    createTemplateMutation.mutate({
      name: newTemplateName,
      category: newTemplateCategory,
      description: newTemplateDescription,
      items: newTemplateItems.map((item, idx) => ({
        ...item,
        order: idx
      }))
    });
  };

  const handleAddTemplateItem = () => {
    setNewTemplateItems([...newTemplateItems, {
      title: '',
      description: '',
      required: true,
      allow_image: true,
      allow_comment: true
    }]);
  };

  const handleRemoveTemplateItem = (index) => {
    setNewTemplateItems(newTemplateItems.filter((_, i) => i !== index));
  };

  const handleUpdateTemplateItem = (index, field, value) => {
    const updated = [...newTemplateItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewTemplateItems(updated);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'alle' || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const filteredChecklists = checklists.filter((c) =>
  (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Sjekklister"
          subtitle="Håndter sjekklistemaler og prosjektsjekklister"
          actions={
          activeTab === 'templates' ?
          <Button onClick={() => setShowNewTemplateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ny mal
              </Button> :

          <Button onClick={() => {
            if (!selectedProject) {
              alert('Velg et prosjekt først');
              return;
            }
            setShowSelectTemplateDialog(true);
          }} className="gap-2">
                <Plus className="h-4 w-4" />
                Ny sjekkliste
              </Button>

          } />


        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="project">Prosjektsjekklister</TabsTrigger>
            <TabsTrigger value="templates">Sjekklistemaler</TabsTrigger>
          </TabsList>

          {/* Project Checklists Tab */}
          <TabsContent value="project" className="space-y-4">
            {!selectedProject ?
            <EmptyState
              title="Velg prosjekt"
              description="Velg et prosjekt fra dropdown øverst til høyre" /> :

            checklistsLoading ?
            <div className="text-center py-8">Laster sjekklister...</div> :
            filteredChecklists.length === 0 ?
            <EmptyState
              title="Ingen sjekklister"
              description="Opprett en ny sjekkliste eller velg fra malbibliotek"
              icon={null} /> :


            <div className="grid gap-4">
                {filteredChecklists.map((checklist) =>
              <Card key={checklist.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(createPageUrl('SjekklisteDetaljer') + `?id=${checklist.id}`)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{checklist.name}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          {checklist.location && <span>📍 {checklist.location}</span>}
                          {checklist.date && <span>📅 {checklist.date}</span>}
                          {checklist.assigned_to_name && <span>👤 {checklist.assigned_to_name}</span>}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <StatusBadge status={checklist.status} />
                          <span className="text-xs text-slate-500">
                            {checklist.responses?.filter((r) => r.status === 'ok').length || 0} / {checklist.items?.length || 0} utført
                          </span>
                        </div>
                      </div>
                      <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChecklistMutation.mutate(checklist.id);
                    }}
                    className="text-red-500 hover:text-red-700">

                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
              )}
              </div>
            }
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Søk i maler..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9" />

              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle kategorier</SelectItem>
                  <SelectItem value="tømrer">Tømrer</SelectItem>
                  <SelectItem value="betong">Betong</SelectItem>
                  <SelectItem value="tak">Tak</SelectItem>
                  <SelectItem value="våtrom">Våtrom</SelectItem>
                  <SelectItem value="internkontroll">Internkontroll</SelectItem>
                  <SelectItem value="overtakelse">Overtakelse</SelectItem>
                  <SelectItem value="hms">HMS</SelectItem>
                  <SelectItem value="kvalitet">Kvalitet</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templatesLoading ?
            <div className="text-center py-8">Laster maler...</div> :
            filteredTemplates.length === 0 ?
            <EmptyState
              title="Ingen maler"
              description="Opprett din første sjekklistemal" /> :


            <div className="grid gap-4">
                {filteredTemplates.map((template) =>
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer"
                  onClick={() => navigate(createPageUrl('SjekklisteMalDetaljer') + `?id=${template.id}`)}>
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        {template.description &&
                    <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                    }
                        <div className="flex gap-3 mt-2 text-sm text-slate-500">
                          <span>📂 {template.category}</span>
                          <span>v{template.version}</span>
                          <span>📌 {template.items?.length || 0} punkter</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {

                        // Duplicate template
                      }} title="Duplisere mal">

                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      className="text-red-500 hover:text-red-700">

                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
              )}
              </div>
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Opprett ny sjekklistemal</DialogTitle>
            <DialogDescription>Fyll inn malen med navn, kategori og sjekkpunkter</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Navn på mal</Label>
              <Input
                id="name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="F.eks. Kvalitetskontroll Tak" />
            </div>
            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tømrer">Tømrer</SelectItem>
                  <SelectItem value="betong">Betong</SelectItem>
                  <SelectItem value="tak">Tak</SelectItem>
                  <SelectItem value="våtrom">Våtrom</SelectItem>
                  <SelectItem value="internkontroll">Internkontroll</SelectItem>
                  <SelectItem value="overtakelse">Overtakelse</SelectItem>
                  <SelectItem value="hms">HMS</SelectItem>
                  <SelectItem value="kvalitet">Kvalitet</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
              <Textarea
                id="description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Beskrivelse av malen..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label>Sjekkpunkter</Label>
                <Button onClick={handleAddTemplateItem} size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Legg til punkt
                </Button>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {newTemplateItems.map((item, idx) => (
                  <Card key={idx} className="p-3 bg-slate-50">
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <Input
                          placeholder="Tittel på sjekkpunkt"
                          value={item.title}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'title', e.target.value)}
                          className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTemplateItem(idx)}
                          className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Beskrivelse (valgfritt)"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateTemplateItem(idx, 'description', e.target.value)}
                        className="text-sm" />
                    </div>
                  </Card>
                ))}
                {newTemplateItems.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Ingen sjekkpunkter ennå. Klikk "Legg til punkt" for å legge til.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewTemplateDialog(false);
              setNewTemplateName('');
              setNewTemplateDescription('');
              setNewTemplateCategory('annet');
              setNewTemplateItems([]);
            }}>
              Avbryt
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
              Opprett mal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Template Dialog */}
      <Dialog open={showSelectTemplateDialog} onOpenChange={setShowSelectTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Velg sjekklistemal</DialogTitle>
            <DialogDescription>Velg en mal som skal legges til i prosjektet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {templatesLoading ? (
              <div className="text-center py-8">Laster maler...</div>
            ) : templates.length === 0 ? (
              <EmptyState
                title="Ingen maler"
                description="Opprett maler først" />
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all hover:bg-slate-50"
                    onClick={() => createChecklistFromTemplateMutation.mutate(template)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                          <span>📂 {template.category}</span>
                          <span>📌 {template.items?.length || 0} punkter</span>
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}