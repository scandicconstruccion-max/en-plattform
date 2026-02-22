import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Plus, Trash2, GripVertical, Copy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function SjekklisteMalDetaljer() {
  const [templateId, setTemplateId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: '',
    required: true,
    allow_image: true,
    allow_comment: true
  });
  const [editData, setEditData] = useState({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTemplateId(params.get('id'));
  }, []);

  const { data: template, isLoading } = useQuery({
    queryKey: ['checklistTemplate', templateId],
    queryFn: () => templateId ? base44.entities.ChecklistTemplate.read(templateId) : null,
    enabled: !!templateId
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.update(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplate', templateId] });
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setEditMode(false);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: () => {
      const updatedItems = (template.items || []).filter((_, idx) => idx !== itemToDelete);
      return updateTemplateMutation.mutateAsync({
        items: updatedItems.map((item, idx) => ({ ...item, order: idx }))
      });
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  });

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;
    const items = [...(template?.items || [])];
    items.push({
      ...newItem,
      order: items.length
    });
    updateTemplateMutation.mutate({ items });
    setNewItem({
      title: '',
      description: '',
      category: '',
      required: true,
      allow_image: true,
      allow_comment: true
    });
    setShowNewItemDialog(false);
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const items = Array.from(template?.items || []);
    const [removed] = items.splice(source.index, 1);
    items.splice(destination.index, 0, removed);

    const reorderedItems = items.map((item, idx) => ({ ...item, order: idx }));
    updateTemplateMutation.mutate({ items: reorderedItems });
  };

  if (isLoading) return <div className="p-6">Laster mal...</div>;
  if (!template) return <div className="p-6">Malen ble ikke funnet</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Sjekklister'))}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Tilbake
        </Button>

        {!editMode ? (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">{template.name}</h1>
                  {template.description && (
                    <p className="text-slate-600 mt-2">{template.description}</p>
                  )}
                  <div className="flex gap-3 mt-3 text-sm text-slate-500">
                    <span>📂 {template.category}</span>
                    <span>v{template.version}</span>
                    <span>📌 {template.items?.length || 0} punkter</span>
                  </div>
                </div>
                <Button onClick={() => setEditMode(true)}>Rediger</Button>
              </div>
            </Card>

            <div className="space-y-3">
              {(template.items || []).map((item, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex gap-3">
                    <span className="font-bold text-slate-400">{idx + 1}.</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Påkrevd</span>}
                        {item.allow_image && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Bilde tillatt</span>}
                        {item.allow_comment && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Kommentar tillatt</span>}
                        {item.category && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{item.category}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Rediger mal</h2>
              <div className="space-y-4">
                <div>
                  <Label>Navn</Label>
                  <Input value={editData.name || template.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div>
                  <Label>Beskrivelse</Label>
                  <Textarea value={editData.description || template.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Sjekkpunkter</h2>
                <Button onClick={() => setShowNewItemDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nytt punkt
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="items">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {(template.items || []).map((item, idx) => (
                        <Draggable key={idx} draggableId={`item-${idx}`} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex gap-3 p-3 rounded-lg border ${snapshot.isDragging ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'}`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-slate-400 mt-1" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{item.title}</p>
                                {item.description && <p className="text-xs text-slate-600">{item.description}</p>}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setItemToDelete(idx);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>Avbryt</Button>
              <Button onClick={() => updateTemplateMutation.mutate(editData)}>Lagre endringer</Button>
            </div>
          </div>
        )}
      </div>

      {/* New Item Dialog */}
      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til sjekkpunkt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tittel</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Punktets tittel"
              />
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Detaljert beskrivelse"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newItem.required}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, required: checked })}
                  id="required"
                />
                <Label htmlFor="required">Påkrevd punkt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newItem.allow_image}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, allow_image: checked })}
                  id="allow_image"
                />
                <Label htmlFor="allow_image">Tillat bilder</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newItem.allow_comment}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, allow_comment: checked })}
                  id="allow_comment"
                />
                <Label htmlFor="allow_comment">Tillat kommentarer</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>Avbryt</Button>
            <Button onClick={handleAddItem} disabled={!newItem.title.trim()}>Legg til punkt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Slett sjekkpunkt?</AlertDialogTitle>
          <AlertDialogDescription>Denne handlingen kan ikke angres.</AlertDialogDescription>
          <div className="flex gap-2">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemMutation.mutate()} className="bg-red-600">Slett</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}