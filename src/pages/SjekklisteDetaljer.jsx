import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Check, CheckCircle2, Edit2, Plus, Trash2, Save, X } from 'lucide-react';
import ChecklistItemCard from '@/components/sjekklister/ChecklistItemCard.jsx';

export default function SjekklisteDetaljer() {
  const [checklistId, setChecklistId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: checklist, isLoading, error, refetch } = useQuery({
    queryKey: ['checklist', checklistId],
    queryFn: async () => {
      if (!checklistId) {
        console.error('Missing checklist ID');
        throw new Error('Ingen sjekkliste-ID oppgitt');
      }
      console.log('Fetching checklist:', checklistId);
      try {
        const results = await base44.entities.Checklist.filter({ id: checklistId });
        console.log('Checklist loaded:', results);
        if (!results || results.length === 0) {
          throw new Error('Sjekkliste ikke funnet');
        }
        return results[0];
      } catch (err) {
        console.error('Failed to load checklist:', err);
        throw err;
      }
    },
    enabled: !!checklistId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000)
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Checklist.update(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  const uploadFile = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (e) {
      console.error('Upload failed:', e);
      throw e;
    }
  };

  const handleStatusChange = (itemIndex, status) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    
    if (idx >= 0) {
      responses[idx] = {
        ...responses[idx],
        status,
        responded_by: user?.email,
        responded_date: new Date().toISOString()
      };
    } else {
      responses.push({
        item_order: itemIndex,
        status,
        responded_by: user?.email,
        responded_date: new Date().toISOString()
      });
    }
    
    updateMutation.mutate({ responses });
  };

  const handleCommentChange = (itemIndex, comment) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    
    if (idx >= 0) {
      responses[idx] = { ...responses[idx], comment };
    } else {
      responses.push({
        item_order: itemIndex,
        comment,
        responded_by: user?.email,
        responded_date: new Date().toISOString()
      });
    }
    
    updateMutation.mutate({ responses });
  };

  const handleImageAdd = async (itemIndex, file) => {
    if (!file) return;
    try {
      const fileUrl = await uploadFile(file);
      const responses = [...(checklist?.responses || [])];
      const idx = responses.findIndex(r => r.item_order === itemIndex);
      
      if (idx >= 0) {
        responses[idx] = {
          ...responses[idx],
          images: [...(responses[idx].images || []), fileUrl]
        };
      } else {
        responses.push({
          item_order: itemIndex,
          images: [fileUrl]
        });
      }
      
      updateMutation.mutate({ responses });
    } catch (e) {
      console.error('Image add failed:', e);
    }
  };

  const handleImageRemove = (itemIndex, imageIndex) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    
    if (idx >= 0) {
      responses[idx].images = responses[idx].images?.filter((_, i) => i !== imageIndex) || [];
      updateMutation.mutate({ responses });
    }
  };

  const handleComplete = () => {
    updateMutation.mutate({
      status: 'fullfort',
      completed_date: new Date().toISOString()
    });
  };

  const addItemToSection = (sectionIndex) => {
    if (!checklist) return;
    const sections = [...(checklist.sections || [])];
    const newItem = {
      order: sections[sectionIndex].items?.length || 0,
      title: 'Nytt punkt',
      description: '',
      required: true,
      allow_image: true,
      allow_comment: true
    };
    sections[sectionIndex].items = [...(sections[sectionIndex].items || []), newItem];
    updateMutation.mutate({ sections });
  };

  const removeItemFromSection = (sectionIndex, itemIndex) => {
    if (!checklist) return;
    const sections = [...(checklist.sections || [])];
    sections[sectionIndex].items = sections[sectionIndex].items.filter((_, i) => i !== itemIndex);
    updateMutation.mutate({ sections });
  };

  const updateItemInSection = (sectionIndex, itemIndex, field, value) => {
    if (!checklist) return;
    const sections = [...(checklist.sections || [])];
    sections[sectionIndex].items[itemIndex][field] = value;
    updateMutation.mutate({ sections });
  };

  const addSection = () => {
    if (!checklist) return;
    const sections = [...(checklist.sections || [])];
    sections.push({
      title: 'Ny seksjon',
      description: '',
      order: sections.length,
      items: []
    });
    updateMutation.mutate({ sections });
  };

  const removeSection = (sectionIndex) => {
    if (!checklist) return;
    const sections = checklist.sections.filter((_, i) => i !== sectionIndex);
    updateMutation.mutate({ sections });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600">Laster sjekkliste...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Checklist load error:', error, 'ID:', checklistId);
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-2 font-semibold">Kunne ikke laste sjekkliste</p>
          <p className="text-sm text-slate-600 mb-4">
            Sjekklisten ble kanskje nettopp opprettet. Prøv å gå tilbake og åpne den på nytt.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate(createPageUrl('Sjekklister'))}>
              Tilbake til sjekklister
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Last siden på nytt
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Sjekklisten ble ikke funnet</p>
      </div>
    );
  }

  const completedItems = checklist.responses?.filter(r => r.status).length || 0;
  const totalItems = checklist.sections && checklist.sections.length > 0
    ? checklist.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
    : (checklist.items?.length || 1);
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isComplete = progress === 100 && checklist.status === 'fullfort';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Sjekklister'))}
            className="gap-2 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Tilbake
          </Button>

          <Card className="bg-white p-6 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{checklist.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
              {checklist.location && <span>📍 {checklist.location}</span>}
              {checklist.date && <span>📅 {checklist.date}</span>}
              {checklist.assigned_to_name && <span>👤 {checklist.assigned_to_name}</span>}
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Fremdrift</span>
                <span className="text-lg font-bold text-emerald-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {completedItems} av {totalItems} punkter fullført
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {isComplete && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Fullført</span>
                </div>
              )}
              {!isComplete && checklist.status !== 'fullfort' && (
                <Button
                  onClick={handleComplete}
                  disabled={progress < 100}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Fullfør sjekkliste
                </Button>
              )}
              <Button
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
                className="gap-2"
              >
                {editMode ? <><X className="h-4 w-4" /> Avslutt redigering</> : <><Edit2 className="h-4 w-4" /> Rediger punkter</>}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Seksjoner */}
          {(checklist.sections || []).length > 0 ? (
            <>
              {checklist.sections.map((section, secIdx) => (
                <div key={secIdx}>
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      {editMode ? (
                        <div className="space-y-2">
                          <Input
                            value={section.title}
                            onChange={(e) => {
                              const sections = [...checklist.sections];
                              sections[secIdx].title = e.target.value;
                              updateMutation.mutate({ sections });
                            }}
                            className="text-xl font-bold"
                            placeholder="Seksjonstittel"
                          />
                          <Textarea
                            value={section.description || ''}
                            onChange={(e) => {
                              const sections = [...checklist.sections];
                              sections[secIdx].description = e.target.value;
                              updateMutation.mutate({ sections });
                            }}
                            className="text-sm"
                            placeholder="Beskrivelse"
                          />
                        </div>
                      ) : (
                        <>
                          {section.title && <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>}
                          {section.description && <p className="text-sm text-slate-600 mt-1">{section.description}</p>}
                        </>
                      )}
                    </div>
                    {editMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(secIdx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(section.items || []).map((item, itemIdx) => {
                      const globalIdx = (checklist.sections
                        .slice(0, secIdx)
                        .reduce((sum, s) => sum + (s.items?.length || 0), 0)) + itemIdx;
                      const response = checklist.responses?.find(r => r.item_order === globalIdx);

                      // Sjekk betinget visning
                      if (!editMode && item.conditional_display) {
                        const conditionalResponse = checklist.responses?.find(
                          r => r.item_order === item.conditional_display.item_order
                        );
                        if (!conditionalResponse || conditionalResponse.status !== item.conditional_display.required_status) {
                          return null;
                        }
                      }

                      return (
                        <div key={globalIdx}>
                          {editMode ? (
                            <Card className="p-4 border-2 border-dashed border-slate-300">
                              <div className="flex gap-3">
                                <div className="flex-1 space-y-3">
                                  <Input
                                    value={item.title}
                                    onChange={(e) => updateItemInSection(secIdx, itemIdx, 'title', e.target.value)}
                                    placeholder="Punkttittel"
                                  />
                                  <Textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateItemInSection(secIdx, itemIdx, 'description', e.target.value)}
                                    placeholder="Beskrivelse"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItemFromSection(secIdx, itemIdx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ) : (
                            <ChecklistItemCard
                              item={item}
                              itemIndex={globalIdx}
                              response={response}
                              onStatusChange={handleStatusChange}
                              onCommentChange={handleCommentChange}
                              onImageAdd={handleImageAdd}
                              onImageRemove={handleImageRemove}
                            />
                          )}
                        </div>
                      );
                    })}
                    {editMode && (
                      <Button
                        variant="outline"
                        onClick={() => addItemToSection(secIdx)}
                        className="w-full gap-2 border-dashed"
                      >
                        <Plus className="h-4 w-4" />
                        Legg til punkt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {editMode && (
                <Button
                  variant="outline"
                  onClick={addSection}
                  className="w-full gap-2 border-dashed border-2"
                >
                  <Plus className="h-4 w-4" />
                  Legg til seksjon
                </Button>
              )}
            </>
          ) : (
            // Legacy items uten seksjoner
            (checklist.items || []).map((item, idx) => {
              const response = checklist.responses?.find(r => r.item_order === idx);
              return (
                <ChecklistItemCard
                  key={idx}
                  item={item}
                  itemIndex={idx}
                  response={response}
                  onStatusChange={handleStatusChange}
                  onCommentChange={handleCommentChange}
                  onImageAdd={handleImageAdd}
                  onImageRemove={handleImageRemove}
                />
              );
            })
          )}

          {/* Egendefinerte felt */}
          {(checklist.custom_fields_data || []).length > 0 && (
            <Card className="p-6 bg-slate-50 border-l-4 border-l-blue-600">
              <h3 className="font-semibold text-lg mb-4">Tilleggsinformasjon</h3>
              <div className="space-y-4">
                {checklist.custom_fields_data.map((field) => (
                  <div key={field.field_id}>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      {field.label}
                    </label>
                    {field.field_type === 'textarea' ? (
                      <Textarea
                        defaultValue={field.value || ''}
                        onChange={(e) => {
                          const updated = checklist.custom_fields_data.map(f =>
                            f.field_id === field.field_id
                              ? { ...f, value: e.target.value }
                              : f
                          );
                          updateMutation.mutate({ custom_fields_data: updated });
                        }}
                        placeholder="Skriv inn verdi"
                      />
                    ) : field.field_type === 'date' ? (
                      <Input
                        type="date"
                        defaultValue={field.value || ''}
                        onChange={(e) => {
                          const updated = checklist.custom_fields_data.map(f =>
                            f.field_id === field.field_id
                              ? { ...f, value: e.target.value }
                              : f
                          );
                          updateMutation.mutate({ custom_fields_data: updated });
                        }}
                      />
                    ) : field.field_type === 'number' ? (
                      <Input
                        type="number"
                        defaultValue={field.value || ''}
                        onChange={(e) => {
                          const updated = checklist.custom_fields_data.map(f =>
                            f.field_id === field.field_id
                              ? { ...f, value: e.target.value }
                              : f
                          );
                          updateMutation.mutate({ custom_fields_data: updated });
                        }}
                        placeholder="Skriv inn tall"
                      />
                    ) : (
                      <Input
                        type="text"
                        defaultValue={field.value || ''}
                        onChange={(e) => {
                          const updated = checklist.custom_fields_data.map(f =>
                            f.field_id === field.field_id
                              ? { ...f, value: e.target.value }
                              : f
                          );
                          updateMutation.mutate({ custom_fields_data: updated });
                        }}
                        placeholder="Skriv inn tekst"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}