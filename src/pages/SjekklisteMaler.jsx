import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Copy, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import TemplateEditor from '@/components/sjekklister/TemplateEditor.jsx';

export default function SjekklisteMaler() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list('-updated_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (template) => base44.entities.ChecklistTemplate.create(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setShowEditor(false);
      setEditingTemplate(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setShowEditor(false);
      setEditingTemplate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const newVersion = (template.version || 1) + 1;
      const newTemplate = {
        ...template,
        name: template.name,
        version: newVersion,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        created_by: undefined
      };
      return base44.entities.ChecklistTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    }
  });

  const filteredTemplates = templates.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveTemplate = (templateData) => {
    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  const categoryLabels = {
    'tømrer': '🪵 Tømrer',
    'betong': '🏗️ Betong',
    'tak': '🏠 Tak',
    'våtrom': '💧 Våtrom',
    'internkontroll': '✓ Internkontroll',
    'overtakelse': '🎯 Overtakelse',
    'hms': '⚠️ HMS',
    'kvalitet': '🔍 Kvalitet',
    'annet': '📋 Annet'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Sjekklistemaler"
          subtitle="Opprett og administrer maler for dine sjekklister"
          actions={
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowEditor(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Ny mal
            </Button>
          }
        />

        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk i maler..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Laster maler...</div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center bg-white">
              <p className="text-slate-600 mb-4">Ingen maler ennå</p>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowEditor(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Opprett første mal
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-lg transition-all bg-white border"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-base line-clamp-2">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {categoryLabels[template.category] || template.category}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      v{template.version}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {(() => {
                        const totalItems = template.sections && template.sections.length > 0
                          ? template.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
                          : (template.items?.length || 0);
                        return `${totalItems} punkter`;
                      })()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowEditor(true);
                      }}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Rediger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateMutation.mutate(template)}
                      className="gap-2"
                      title="Kopier mal"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmTemplate(template)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Rediger mal' : 'Opprett ny mal'}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmTemplate} onOpenChange={(open) => !open && setDeleteConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette malen "{deleteConfirmTemplate?.name}"? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(deleteConfirmTemplate.id);
                setDeleteConfirmTemplate(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett mal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}