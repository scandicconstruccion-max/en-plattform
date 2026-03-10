import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, Check, CheckCircle2, Edit2, Plus, Trash2, X,
  PenLine, Download, Mail, History, AlertTriangle, FileText
} from 'lucide-react';
import ChecklistItemCard from '@/components/sjekklister/ChecklistItemCard.jsx';
import ChecklistSignDialog from '@/components/sjekklister/ChecklistSignDialog.jsx';
import ChecklistHistorikk from '@/components/sjekklister/ChecklistHistorikk.jsx';
import ChecklistSendEmailDialog from '@/components/sjekklister/ChecklistSendEmailDialog.jsx';
import { generateChecklistPDF } from '@/components/sjekklister/ChecklistPDFExport.jsx';

export default function SjekklisteDetaljer() {
  const [checklistId] = useState(() => new URLSearchParams(window.location.search).get('id'));
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ['checklist', checklistId],
    queryFn: async () => {
      if (!checklistId) throw new Error('Ingen sjekkliste-ID');
      const results = await base44.entities.Checklist.filter({ id: checklistId });
      if (!results?.length) throw new Error('Sjekkliste ikke funnet');
      return results[0];
    },
    enabled: !!checklistId,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 3000)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !!checklist?.project_id
  });
  const project = projects.find(p => p.id === checklist?.project_id);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Checklist.update(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  const uploadFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const logActivity = (checklist, action, details) => {
    const log = [...(checklist.activity_log || [])];
    log.push({
      action,
      details: details || '',
      user_email: user?.email || '',
      user_name: user?.full_name || user?.email || '',
      timestamp: new Date().toISOString()
    });
    return log;
  };

  const handleStatusChange = (itemIndex, status) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    const entry = {
      item_order: itemIndex,
      status,
      responded_by: user?.email,
      responded_by_name: user?.full_name || user?.email,
      responded_date: new Date().toISOString()
    };
    if (idx >= 0) {
      responses[idx] = { ...responses[idx], ...entry };
    } else {
      responses.push(entry);
    }
    const allItems = getAllItems(checklist);
    const itemTitle = allItems.find(e => e.type === 'item' && e.globalIdx === itemIndex)?.item?.title || `Punkt ${itemIndex + 1}`;
    const activity_log = logActivity(checklist, `Status endret på "${itemTitle}"`, `Ny status: ${statusLabel(status)}`);
    updateMutation.mutate({ responses, activity_log });
  };

  const handleCommentChange = (itemIndex, comment) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    const commentData = {
      comment,
      comment_by: user?.email,
      comment_by_name: user?.full_name || user?.email,
      comment_date: new Date().toISOString()
    };
    if (idx >= 0) {
      responses[idx] = { ...responses[idx], ...commentData };
    } else {
      responses.push({ item_order: itemIndex, responded_by: user?.email, responded_date: new Date().toISOString(), ...commentData });
    }
    updateMutation.mutate({ responses });
  };

  const handleImageAdd = async (itemIndex, file) => {
    if (!file) return;
    const url = await uploadFile(file);
    const responses = [...(checklist?.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    const newImage = { url, uploaded_by: user?.email, uploaded_by_name: user?.full_name || user?.email, uploaded_date: new Date().toISOString() };
    if (idx >= 0) {
      // Support both old string[] and new object[]
      const existing = (responses[idx].images || []).map(img => typeof img === 'string' ? { url: img } : img);
      responses[idx] = { ...responses[idx], images: [...existing, newImage] };
    } else {
      responses.push({ item_order: itemIndex, images: [newImage], responded_by: user?.email, responded_date: new Date().toISOString() });
    }
    updateMutation.mutate({ responses });
  };

  const handleImageRemove = (itemIndex, imageIndex) => {
    if (!checklist) return;
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    if (idx >= 0) {
      const existing = (responses[idx].images || []).map(img => typeof img === 'string' ? { url: img } : img);
      responses[idx].images = existing.filter((_, i) => i !== imageIndex);
      updateMutation.mutate({ responses });
    }
  };

  const handleCreateDeviation = async (itemIndex) => {
    if (!checklist) return;
    const allItems = getAllItems(checklist);
    const entry = allItems.find(e => e.type === 'item' && e.globalIdx === itemIndex);
    const itemTitle = entry?.item?.title || `Punkt ${itemIndex + 1}`;
    const response = checklist.responses?.find(r => r.item_order === itemIndex);

    const deviation = await base44.entities.Deviation.create({
      title: `Avvik fra sjekkliste: ${itemTitle}`,
      description: response?.comment || `Avvik registrert fra sjekklisten "${checklist.name}"`,
      project_id: checklist.project_id,
      category: 'kvalitet',
      severity: 'middels',
      status: 'opprettet'
    });

    // Koble avviket tilbake til sjekkliste-svaret
    const responses = [...(checklist.responses || [])];
    const idx = responses.findIndex(r => r.item_order === itemIndex);
    if (idx >= 0) {
      responses[idx] = { ...responses[idx], deviation_id: deviation.id };
    }
    const activity_log = logActivity(checklist, `Avvik opprettet fra "${itemTitle}"`, `Avviks-ID: ${deviation.id}`);
    updateMutation.mutate({ responses, activity_log });
    navigate(createPageUrl('AvvikDetaljer') + `?id=${deviation.id}`);
  };

  const handleComplete = () => {
    const activity_log = logActivity(checklist, 'Sjekkliste fullført', '');
    updateMutation.mutate({ status: 'fullfort', completed_date: new Date().toISOString(), activity_log });
  };

  const handleSign = ({ role }) => {
    const signatures = [...(checklist.signatures || [])];
    signatures.push({
      signed_by: user?.email,
      signed_by_name: user?.full_name || user?.email,
      role,
      signed_date: new Date().toISOString()
    });
    const activity_log = logActivity(checklist, `Sjekkliste signert av ${user?.full_name || user?.email}`, `Rolle: ${role}`);
    updateMutation.mutate({ signatures, activity_log });
  };

  // Edit-mode helpers
  const addItemToSection = (sectionIndex) => {
    if (!checklist) return;
    const sections = [...(checklist.sections || [])];
    sections[sectionIndex].items = [...(sections[sectionIndex].items || []), {
      order: sections[sectionIndex].items?.length || 0,
      title: 'Nytt punkt', description: '', required: true, allow_image: true, allow_comment: true
    }];
    updateMutation.mutate({ sections });
  };

  const removeItemFromSection = (sectionIndex, itemIndex) => {
    const sections = [...(checklist.sections || [])];
    sections[sectionIndex].items = sections[sectionIndex].items.filter((_, i) => i !== itemIndex);
    updateMutation.mutate({ sections });
  };

  const updateItemInSection = (sectionIndex, itemIndex, field, value) => {
    const sections = [...(checklist.sections || [])];
    sections[sectionIndex].items[itemIndex][field] = value;
    updateMutation.mutate({ sections });
  };

  const addSection = () => {
    const sections = [...(checklist.sections || [])];
    sections.push({ title: 'Ny seksjon', description: '', order: sections.length, items: [] });
    updateMutation.mutate({ sections });
  };

  const removeSection = (sectionIndex) => {
    const sections = checklist.sections.filter((_, i) => i !== sectionIndex);
    updateMutation.mutate({ sections });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600">Laster sjekkliste...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <p className="text-red-600 mb-2 font-semibold">Kunne ikke laste sjekkliste</p>
        <p className="text-sm text-slate-600 mb-4">Sjekklisten ble kanskje nettopp opprettet. Prøv å gå tilbake og åpne den på nytt.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate(createPageUrl('Sjekklister'))}>Tilbake til sjekklister</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Last siden på nytt</Button>
        </div>
      </div>
    </div>
  );

  if (!checklist) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-600">Sjekklisten ble ikke funnet</p>
    </div>
  );

  const totalItems = checklist.sections?.length > 0
    ? checklist.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
    : (checklist.items?.length || 1);
  const controlledItems = checklist.responses?.filter(r => r.status && r.status !== 'ikke_kontrollert').length || 0;
  const avvikItems = checklist.responses?.filter(r => r.status === 'avvik' || r.status === 'ikke_ok').length || 0;
  const progress = totalItems > 0 ? Math.round((controlledItems / totalItems) * 100) : 0;
  const isComplete = checklist.status === 'fullfort';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('Sjekklister'))} className="gap-2 mb-4">
          <ChevronLeft className="h-4 w-4" />
          Tilbake
        </Button>

        {/* Header-kort */}
        <Card className="bg-white p-5 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{checklist.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                {checklist.location && <span>📍 {checklist.location}</span>}
                {checklist.building_part && <span>🏗 {checklist.building_part}</span>}
                {checklist.date && <span>📅 {checklist.date}</span>}
                {checklist.assigned_to_name && <span>👤 {checklist.assigned_to_name}</span>}
              </div>
            </div>
            {isComplete && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" /> Fullført
              </Badge>
            )}
          </div>

          {/* Fremdrift */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-slate-700">Fremdrift</span>
              <div className="flex items-center gap-3">
                {avvikItems > 0 && (
                  <span className="text-xs font-medium text-red-600">{avvikItems} avvik</span>
                )}
                <span className="text-sm font-bold text-emerald-600">{controlledItems} av {totalItems}</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Handlingsknapper */}
          <div className="flex flex-wrap gap-2">
            {!isComplete && (
              <Button
                onClick={handleComplete}
                disabled={controlledItems === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                <Check className="h-4 w-4" />
                Fullfør
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowSignDialog(true)}
              className="gap-2 text-sm"
            >
              <PenLine className="h-4 w-4" />
              Signer
              {checklist.signatures?.length > 0 && (
                <Badge className="ml-1 bg-green-100 text-green-700 border-0 text-xs px-1.5">{checklist.signatures.length}</Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => generateChecklistPDF(checklist, project?.name)}
              className="gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(true)}
              className="gap-2 text-sm"
            >
              <Mail className="h-4 w-4" />
              Send
            </Button>
            <Button
              variant={editMode ? 'default' : 'outline'}
              onClick={() => setEditMode(!editMode)}
              className="gap-2 text-sm"
            >
              {editMode ? <><X className="h-4 w-4" /> Avslutt</> : <><Edit2 className="h-4 w-4" /> Rediger</>}
            </Button>
          </div>
        </Card>

        {/* Tabs: Sjekkpunkter / Historikk */}
        <Tabs defaultValue="items">
          <TabsList className="mb-4">
            <TabsTrigger value="items" className="gap-2">
              <FileText className="h-4 w-4" /> Sjekkpunkter
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> Historikk
              {checklist.activity_log?.length > 0 && (
                <Badge className="ml-1 bg-slate-100 text-slate-600 border-0 text-xs px-1.5">{checklist.activity_log.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <div className="space-y-6">
              {(checklist.sections || []).length > 0 ? (
                <>
                  {checklist.sections.map((section, secIdx) => {
                    let globalOffset = checklist.sections.slice(0, secIdx).reduce((sum, s) => sum + (s.items?.length || 0), 0);
                    return (
                      <div key={secIdx}>
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            {editMode ? (
                              <div className="space-y-2">
                                <Input
                                  value={section.title}
                                  onChange={(e) => { const s = [...checklist.sections]; s[secIdx].title = e.target.value; updateMutation.mutate({ sections: s }); }}
                                  className="text-lg font-bold"
                                />
                                <Textarea
                                  value={section.description || ''}
                                  onChange={(e) => { const s = [...checklist.sections]; s[secIdx].description = e.target.value; updateMutation.mutate({ sections: s }); }}
                                  placeholder="Beskrivelse"
                                  className="text-sm"
                                  rows={2}
                                />
                              </div>
                            ) : (
                              <>
                                {section.title && <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>}
                                {section.description && <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>}
                              </>
                            )}
                          </div>
                          {editMode && (
                            <Button variant="ghost" size="icon" onClick={() => removeSection(secIdx)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {(section.items || []).map((item, itemIdx) => {
                            const globalIdx = globalOffset + itemIdx;
                            const response = checklist.responses?.find(r => r.item_order === globalIdx);
                            if (!editMode && item.conditional_display) {
                              const condResp = checklist.responses?.find(r => r.item_order === item.conditional_display.item_order);
                              if (!condResp || condResp.status !== item.conditional_display.required_status) return null;
                            }
                            return editMode ? (
                              <Card key={globalIdx} className="p-4 border-2 border-dashed border-slate-300">
                                <div className="flex gap-3">
                                  <div className="flex-1 space-y-2">
                                    <Input value={item.title} onChange={(e) => updateItemInSection(secIdx, itemIdx, 'title', e.target.value)} placeholder="Punkttittel" />
                                    <Textarea value={item.description || ''} onChange={(e) => updateItemInSection(secIdx, itemIdx, 'description', e.target.value)} placeholder="Beskrivelse" rows={2} />
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeItemFromSection(secIdx, itemIdx)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            ) : (
                              <ChecklistItemCard
                                key={globalIdx}
                                item={item}
                                itemIndex={globalIdx}
                                response={response}
                                onStatusChange={handleStatusChange}
                                onCommentChange={handleCommentChange}
                                onImageAdd={handleImageAdd}
                                onImageRemove={handleImageRemove}
                                onCreateDeviation={handleCreateDeviation}
                                user={user}
                              />
                            );
                          })}
                          {editMode && (
                            <Button variant="outline" onClick={() => addItemToSection(secIdx)} className="w-full gap-2 border-dashed text-sm">
                              <Plus className="h-4 w-4" /> Legg til punkt
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {editMode && (
                    <Button variant="outline" onClick={addSection} className="w-full gap-2 border-dashed border-2 text-sm">
                      <Plus className="h-4 w-4" /> Legg til seksjon
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
                      onCreateDeviation={handleCreateDeviation}
                      user={user}
                    />
                  );
                })
              )}

              {/* Custom fields */}
              {(checklist.custom_fields_data || []).length > 0 && (
                <Card className="p-5 bg-slate-50 border-l-4 border-l-blue-500">
                  <h3 className="font-semibold text-base mb-3">Tilleggsinformasjon</h3>
                  <div className="space-y-3">
                    {checklist.custom_fields_data.map((field) => (
                      <div key={field.field_id}>
                        <label className="text-sm font-medium text-slate-700 block mb-1">{field.label}</label>
                        {field.field_type === 'textarea' ? (
                          <Textarea defaultValue={field.value || ''} onChange={(e) => {
                            const updated = checklist.custom_fields_data.map(f => f.field_id === field.field_id ? { ...f, value: e.target.value } : f);
                            updateMutation.mutate({ custom_fields_data: updated });
                          }} placeholder="Skriv inn verdi" />
                        ) : (
                          <Input type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'} defaultValue={field.value || ''} onChange={(e) => {
                            const updated = checklist.custom_fields_data.map(f => f.field_id === field.field_id ? { ...f, value: e.target.value } : f);
                            updateMutation.mutate({ custom_fields_data: updated });
                          }} placeholder="Skriv inn verdi" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-5 bg-white">
              <ChecklistHistorikk activityLog={checklist.activity_log || []} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ChecklistSignDialog
        open={showSignDialog}
        onOpenChange={setShowSignDialog}
        onSign={handleSign}
        existingSignatures={checklist.signatures || []}
        user={user}
      />

      <ChecklistSendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        checklist={checklist}
        project={project}
      />
    </div>
  );
}

// Helper – hentes uten import (brukes lokalt i filen)
function getAllItems(checklist) {
  const result = [];
  if (checklist.sections?.length > 0) {
    let globalIdx = 0;
    for (const section of checklist.sections) {
      result.push({ type: 'section', title: section.title });
      for (const item of (section.items || [])) {
        result.push({ type: 'item', item, globalIdx });
        globalIdx++;
      }
    }
  } else {
    for (let i = 0; i < (checklist.items || []).length; i++) {
      result.push({ type: 'item', item: checklist.items[i], globalIdx: i });
    }
  }
  return result;
}

function statusLabel(status) {
  const labels = { ok: 'OK', avvik: 'Avvik', ikke_relevant: 'Ikke relevant', ikke_kontrollert: 'Ikke kontrollert' };
  return labels[status] || status;
}