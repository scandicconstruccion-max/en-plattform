import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Trash2 } from 'lucide-react';
import TemplateSelector from '@/components/sjekklister/TemplateSelector.jsx';
import PageHeader from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Sjekklister() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [checklistToDelete, setChecklistToDelete] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    const stored = localStorage.getItem('selectedProject');
    if (stored) setSelectedProject(JSON.parse(stored));
    const handleProjectChange = () => {
      const updated = localStorage.getItem('selectedProject');
      if (updated) setSelectedProject(JSON.parse(updated));
    };
    window.addEventListener('projectSelected', handleProjectChange);
    return () => window.removeEventListener('projectSelected', handleProjectChange);
  }, []);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: async () => {
      const existing = await base44.entities.ChecklistTemplate.list('-updated_date', 100);
      // Hvis ingen maler finnes, opprett standardmaler
      if (existing.length === 0) {
        const { DEFAULT_TEMPLATES } = await import('@/components/sjekklister/DefaultTemplates.jsx');
        for (const template of DEFAULT_TEMPLATES) {
          await base44.entities.ChecklistTemplate.create(template);
        }
        return base44.entities.ChecklistTemplate.list('-updated_date', 100);
      }
      return existing;
    }
  });

  const { data: checklists = [], isLoading: checklistsLoading, error: checklistsError } = useQuery({
    queryKey: ['checklists', selectedProject?.id],
    queryFn: () => selectedProject?.id 
      ? base44.entities.Checklist.filter({ project_id: selectedProject.id }, '-updated_date', 100)
      : Promise.resolve([]),
    enabled: !!selectedProject?.id
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (template) => {
      const projectName = selectedProject?.name || 'Prosjekt';
      const date = new Date().toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const checklistName = `${template.name} - ${projectName} (${date})`;
      
      // Properly structure sections from template
      const sections = (template.sections || []).map(section => ({
        title: section.title || '',
        description: section.description || '',
        order: section.order || 0,
        items: (section.items || []).map(item => ({
          order: item.order || 0,
          title: item.title || '',
          description: item.description || '',
          required: item.required !== undefined ? item.required : true,
          allow_image: item.allow_image !== undefined ? item.allow_image : true,
          allow_comment: item.allow_comment !== undefined ? item.allow_comment : true,
          conditional_display: item.conditional_display || undefined
        }))
      }));

      // Structure custom fields data
      const custom_fields_data = (template.custom_fields || []).map(field => ({
        field_id: field.id,
        label: field.label,
        field_type: field.field_type,
        value: ''
      }));

      const checklistData = {
        name: checklistName,
        project_id: selectedProject.id,
        template_id: template.id,
        template_version: template.version || 1,
        date: new Date().toISOString().split('T')[0],
        status: 'ikke_startet',
        responses: [],
        assigned_to: user?.email || '',
        assigned_to_name: user?.full_name || ''
      };

      // Add sections if they exist
      if (sections.length > 0) {
        checklistData.sections = sections;
      }

      // Add legacy items if no sections (backward compatibility)
      if (sections.length === 0 && template.items && template.items.length > 0) {
        checklistData.items = template.items.map((item, idx) => ({
          order: idx,
          title: item.title || '',
          description: item.description || '',
          required: item.required !== undefined ? item.required : true,
          allow_image: item.allow_image !== undefined ? item.allow_image : true,
          allow_comment: item.allow_comment !== undefined ? item.allow_comment : true
        }));
      }

      // Add custom fields if they exist
      if (custom_fields_data.length > 0) {
        checklistData.custom_fields_data = custom_fields_data;
      }

      return base44.entities.Checklist.create(checklistData);
    },
    onSuccess: async (newChecklist) => {
      console.log('Checklist created successfully:', newChecklist.id);
      setShowTemplateDialog(false);
      await queryClient.invalidateQueries({ queryKey: ['checklists'] });
      await queryClient.invalidateQueries({ queryKey: ['checklist', newChecklist.id] });
      // Navigate immediately with the fresh data
      navigate(createPageUrl('SjekklisteDetaljer') + `?id=${newChecklist.id}`);
    },
    onError: (error) => {
      console.error('Failed to create checklist:', error);
      alert('Kunne ikke opprette sjekkliste. Prøv igjen.');
    }
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (id) => base44.entities.Checklist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  const filteredChecklists = checklists.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressPercentage = (checklist) => {
    const totalItems = checklist.sections && checklist.sections.length > 0
      ? checklist.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
      : (checklist.items?.length || 0);
    if (!totalItems) return 0;
    const answered = checklist.responses?.filter(r => r.status).length || 0;
    return Math.round((answered / totalItems) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fullfort': return 'bg-green-100 text-green-800';
      case 'pagaende': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Sjekklister"
          subtitle="Opprett og gjennomfør sjekklister for dine prosjekter"
          actions={
            selectedProject && (
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowTemplateDialog(true)}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Ny sjekkliste
                </Button>
                <Link to={createPageUrl('SjekklisteMaler')}>
                  <Button variant="outline" className="gap-2">
                    📋 Maler
                  </Button>
                </Link>
              </div>
            )
          }
        />

        {!selectedProject && (
          <Card className="p-8 text-center bg-white">
            <p className="text-slate-600 text-lg">Velg et prosjekt fra dropdown øverst til høyre for å komme i gang</p>
          </Card>
        )}

        {selectedProject && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk i sjekklister..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {checklistsError && (
              <Card className="p-6 bg-red-50 border-red-200">
                <p className="text-red-800">⚠️ Feil ved lasting av sjekklister. Prøv igjen senere.</p>
              </Card>
            )}
            {checklistsLoading ? (
              <div className="text-center py-8">Laster sjekklister...</div>
            ) : filteredChecklists.length === 0 ? (
              <Card className="p-8 text-center bg-white">
                <p className="text-slate-600">Ingen sjekklister ennå. Opprett en ny sjekkliste fra malen din.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChecklists.map((checklist) => {
                  const progress = getProgressPercentage(checklist);
                  return (
                    <Card
                      key={checklist.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-all bg-white border hover:border-emerald-300"
                      onClick={() => navigate(createPageUrl('SjekklisteDetaljer') + `?id=${checklist.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base line-clamp-2">{checklist.name}</h3>
                          {checklist.location && (
                            <p className="text-xs text-slate-500 mt-1">📍 {checklist.location}</p>
                          )}
                        </div>
                        <Button
                           variant="ghost"
                           size="icon"
                           onClick={(e) => {
                             e.stopPropagation();
                             setChecklistToDelete(checklist);
                           }}
                           className="text-red-500 hover:text-red-700 h-8 w-8"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-600">Fremdrift</span>
                          <span className="text-xs font-semibold text-slate-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={cn('px-2 py-1 rounded-full', getStatusColor(checklist.status))}>
                          {checklist.status === 'fullfort' ? 'Fullført' : checklist.status === 'pagaende' ? 'Pågår' : 'Ikke startet'}
                        </span>
                        <span className="text-slate-500">
                          {(() => {
                            const totalItems = checklist.sections && checklist.sections.length > 0
                              ? checklist.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
                              : (checklist.items?.length || 0);
                            const answered = checklist.responses?.filter(r => r.status).length || 0;
                            return `${answered} av ${totalItems} punkter`;
                          })()}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Velg sjekklistemal</DialogTitle>
            <DialogDescription>Velg en mal for å opprette en ny sjekkliste</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <TemplateSelector
              templates={templates}
              onSelect={(template) => createChecklistMutation.mutate(template)}
              isLoading={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!checklistToDelete} onOpenChange={(open) => !open && setChecklistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett sjekkliste?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette "{checklistToDelete?.name}"? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteChecklistMutation.mutate(checklistToDelete.id);
                setChecklistToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}