import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

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

export default function SjekklisteMalbibliotek() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list('-updated_date', 100)
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setShowDialog(false);
    }
  });

  const filteredTemplates = templates.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (template) => {
    navigate(createPageUrl('SjekklisteMalDetaljer') + `?id=${template.id}`);
  };

  const handleDelete = (template) => {
    setSelectedTemplate(template);
    setShowDialog(true);
  };

  const confirmDelete = () => {
    if (selectedTemplate) {
      deleteTemplateMutation.mutate(selectedTemplate.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Sjekklistemalbiblotek"
          subtitle="Administrer og opprett sjekklistemaler"
          actions={
            <Button 
              onClick={() => navigate(createPageUrl('SjekklisteMalDetaljer'))}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Ny mal
            </Button>
          }
        />

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk i maler..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-8">Laster maler...</div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-8 text-center bg-white">
            <p className="text-slate-600 mb-4">Ingen maler funnet</p>
            <Button 
              onClick={() => navigate(createPageUrl('SjekklisteMalDetaljer'))}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Opprett første mal
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="p-4 flex flex-col bg-white hover:shadow-lg transition-shadow">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base line-clamp-2">{template.name}</h3>
                      {template.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{template.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-2 my-4 text-xs text-slate-600">
                    <div>
                      <span className="font-medium">Kategori:</span> {categoryLabels[template.category] || template.category}
                    </div>
                    <div>
                      <span className="font-medium">Punkter:</span> {template.items?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Versjon:</span> {template.version}
                    </div>
                    {template.validity_days && (
                      <div>
                        <span className="font-medium">Gyldig:</span> {template.validity_days} dager
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    {template.is_active ? (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        ✓ Aktiv
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        Inaktiv
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1 gap-2"
                  >
                    <Edit2 className="h-3 w-3" />
                    Rediger
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett mal</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette malen "{selectedTemplate?.name}"? Dette kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
            >
              Slett
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}