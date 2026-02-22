import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, Check, X, AlertCircle, Download, CheckCircle2, Upload, Camera, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SjekklisteDetaljer() {
  const [checklistId, setChecklistId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });
  const [responses, setResponses] = useState({});
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
  const [user, setUser] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error('Error fetching user:', e);
      }
    };
    fetchUser();
  }, []);

  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ['checklist', checklistId],
    queryFn: () => {
      if (!checklistId) return null;
      return base44.entities.Checklist.read(checklistId);
    },
    enabled: !!checklistId,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0,
    gcTime: 0
  });

  useEffect(() => {
    if (checklist?.responses) {
      const responseMap = {};
      checklist.responses.forEach(r => {
        responseMap[r.item_order] = r;
      });
      setResponses(responseMap);
    }
  }, [checklist]);

  const updateChecklistMutation = useMutation({
    mutationFn: (data) => base44.entities.Checklist.update(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  const handleSetResponse = (itemOrder, status) => {
    const updatedResponses = [...(checklist?.responses || [])];
    const existingIndex = updatedResponses.findIndex(r => r.item_order === itemOrder);
    
    if (existingIndex >= 0) {
      updatedResponses[existingIndex] = {
        ...updatedResponses[existingIndex],
        status,
        responded_date: new Date().toISOString(),
        responded_by: user?.email
      };
    } else {
      updatedResponses.push({
        item_order: itemOrder,
        status,
        responded_date: new Date().toISOString(),
        responded_by: user?.email
      });
    }

    setResponses({ ...responses, [itemOrder]: updatedResponses.find(r => r.item_order === itemOrder) });
    updateChecklistMutation.mutate({ responses: updatedResponses });
  };

  const handleAddImage = useCallback(async (itemOrder, file) => {
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const updatedResponses = [...(checklist?.responses || [])];
      const existingIndex = updatedResponses.findIndex(r => r.item_order === itemOrder);
      
      if (existingIndex >= 0) {
        updatedResponses[existingIndex] = {
          ...updatedResponses[existingIndex],
          images: [...(updatedResponses[existingIndex].images || []), file_url]
        };
      } else {
        updatedResponses.push({
          item_order: itemOrder,
          images: [file_url]
        });
      }
      
      setResponses({ ...responses, [itemOrder]: updatedResponses.find(r => r.item_order === itemOrder) });
      updateChecklistMutation.mutate({ responses: updatedResponses });
    } catch (e) {
      console.error('Bildeupplasting feilet:', e);
    }
  }, [checklist?.responses, responses, updateChecklistMutation]);

  const handleRemoveImage = (itemOrder, imageIndex) => {
    const updatedResponses = [...(checklist?.responses || [])];
    const existingIndex = updatedResponses.findIndex(r => r.item_order === itemOrder);
    
    if (existingIndex >= 0) {
      updatedResponses[existingIndex].images = updatedResponses[existingIndex].images?.filter((_, i) => i !== imageIndex) || [];
    }
    
    setResponses({ ...responses, [itemOrder]: updatedResponses.find(r => r.item_order === itemOrder) });
    updateChecklistMutation.mutate({ responses: updatedResponses });
  };

  const handleSign = (signatureImage) => {
    updateChecklistMutation.mutate({
      signed: true,
      signed_by: checklist?.assigned_to,
      signed_date: new Date().toISOString(),
      signature_image_url: signatureImage,
      status: 'fullfort',
      completed_date: new Date().toISOString()
    });
    setShowSignDialog(false);
  };

  if (isLoading) return <div className="p-6">Laster sjekkliste...</div>;
  if (error) return <div className="p-6 text-red-600">Feil ved lasting: {error.message}</div>;
  if (!checklist) return <div className="p-6">Sjekklisten ble ikke funnet (ID: {checklistId})</div>;

  const completionPercentage = Math.round(
    ((checklist.responses?.filter(r => r.status && ['ok', 'ikke_ok', 'avvik'].includes(r.status)).length || 0) / (checklist.items?.length || 1)) * 100
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Sjekklister'))}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Tilbake
        </Button>

        <Card className="p-4 md:p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{checklist.name}</h1>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-4">
            {checklist.location && <span>📍 {checklist.location}</span>}
            {checklist.date && <span>📅 {checklist.date}</span>}
            {checklist.assigned_to_name && <span>👤 {checklist.assigned_to_name}</span>}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Fremdrift</span>
              <span className="text-sm font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {checklist.status !== 'fullfort' && (
              <Button
                onClick={() => setShowSignDialog(true)}
                className="gap-2"
                disabled={completionPercentage < 100}
              >
                <CheckCircle2 className="h-4 w-4" />
                Signér og fullfør
              </Button>
            )}
            {checklist.signed && (
              <Button variant="outline" className="gap-2" disabled>
                <Check className="h-4 w-4 text-green-600" />
                Signert
              </Button>
            )}
          </div>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-3">
          {(checklist.items || []).map((item, idx) => {
            const response = responses[idx];
            return (
              <Card key={idx} className={cn(
                'p-4 transition-colors',
                response?.status === 'ok' && 'bg-green-50 border-green-200',
                response?.status === 'ikke_ok' && 'bg-red-50 border-red-200',
                response?.status === 'avvik' && 'bg-yellow-50 border-yellow-200'
              )}>
                <div className="mb-3">
                  <h3 className="font-semibold text-base">{idx + 1}. {item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                  )}
                </div>

                {/* Status Buttons - Mobile Optimized */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => handleSetResponse(idx, 'ok')}
                    variant={response?.status === 'ok' ? 'default' : 'outline'}
                    className={cn(
                      'flex-1 h-12 text-base font-semibold gap-2',
                      response?.status === 'ok' && 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    <Check className="h-5 w-5" />
                    OK
                  </Button>
                  <Button
                    onClick={() => handleSetResponse(idx, 'ikke_ok')}
                    variant={response?.status === 'ikke_ok' ? 'destructive' : 'outline'}
                    className={cn(
                      'flex-1 h-12 text-base font-semibold gap-2',
                      response?.status === 'ikke_ok' && 'bg-red-600 hover:bg-red-700'
                    )}
                  >
                    <X className="h-5 w-5" />
                    Ikke OK
                  </Button>
                  <Button
                    onClick={() => handleSetResponse(idx, 'avvik')}
                    variant={response?.status === 'avvik' ? 'default' : 'outline'}
                    className={cn(
                      'flex-1 h-12 text-base font-semibold gap-2',
                      response?.status === 'avvik' && 'bg-yellow-600 hover:bg-yellow-700'
                    )}
                  >
                    <AlertCircle className="h-5 w-5" />
                    Avvik
                  </Button>
                </div>

                {item.allow_comment && (
                   <div className="mb-4">
                     <label className="text-sm font-semibold mb-2 block">Kommentar</label>
                     <Textarea
                       placeholder="Legg til kommentar..."
                       value={response?.comment || ''}
                       onChange={(e) => {
                         const updatedResponses = [...(checklist?.responses || [])];
                         const idx2 = updatedResponses.findIndex(r => r.item_order === idx);
                         if (idx2 >= 0) {
                           updatedResponses[idx2].comment = e.target.value;
                         } else {
                           updatedResponses.push({ item_order: idx, comment: e.target.value, responded_by: user?.email, responded_date: new Date().toISOString() });
                         }
                         updateChecklistMutation.mutate({ responses: updatedResponses });
                       }}
                       className="text-base"
                     />
                   </div>
                 )}

                {item.allow_image && (
                   <div className="mb-4">
                     <label className="text-sm font-semibold mb-2 block">Bilder</label>

                     {/* Image Upload */}
                     <div className="flex gap-2 mb-3">
                       <label className="flex-1">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) handleAddImage(idx, file);
                             e.target.value = '';
                           }}
                           className="hidden"
                         />
                         <Button as="div" variant="outline" className="w-full gap-2 cursor-pointer">
                           <Upload className="h-4 w-4" />
                           Last opp bilde
                         </Button>
                       </label>
                       <label className="flex-1">
                         <input
                           type="file"
                           accept="image/*"
                           capture="environment"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) handleAddImage(idx, file);
                             e.target.value = '';
                           }}
                           className="hidden"
                         />
                         <Button as="div" variant="outline" className="w-full gap-2 cursor-pointer">
                           <Camera className="h-4 w-4" />
                           Ta bilde
                         </Button>
                       </label>
                     </div>

                     {/* Image Thumbnails */}
                     {(response?.images?.length > 0) && (
                       <div className="grid grid-cols-3 gap-2">
                         {response.images.map((imageUrl, imgIdx) => (
                           <div key={imgIdx} className="relative group">
                             <img
                               src={imageUrl}
                               alt={`Bilde ${imgIdx + 1}`}
                               className="w-full h-24 object-cover rounded-lg border"
                             />
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleRemoveImage(idx, imgIdx)}
                               className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                             >
                               <Trash2 className="h-3 w-3" />
                             </Button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                {response && (
                   <div className="text-xs text-slate-500 pt-2 border-t mt-4">
                     <div>Utfylt av: {response.responded_by || '-'}</div>
                     <div>Dato: {response.responded_date ? new Date(response.responded_date).toLocaleString('no-NO') : '-'}</div>
                   </div>
                 )}
                </Card>
            );
          })}
        </div>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signér sjekklisten</DialogTitle>
            <DialogDescription>
              Tegn din signatur under for å fullføre sjekklisten
            </DialogDescription>
          </DialogHeader>
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            className="border-2 border-slate-300 rounded-lg bg-white cursor-crosshair w-full"
            style={{ maxWidth: '500px', height: 'auto' }}
            onMouseDown={(e) => {
              setIsDrawing(true);
              const canvas = canvasRef;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext('2d');
              ctx?.beginPath();
              ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            }}
            onMouseMove={(e) => {
              if (!isDrawing || !canvasRef) return;
              const rect = canvasRef.getBoundingClientRect();
              const ctx = canvasRef.getContext('2d');
              ctx?.lineTo(e.clientX - rect.left, e.clientY - rect.top);
              ctx?.stroke();
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (canvasRef) {
                const ctx = canvasRef.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.width, canvasRef.height);
              }
            }}>
              Tøm
            </Button>
            <Button onClick={() => {
              if (canvasRef) {
                handleSign(canvasRef.toDataURL());
              }
            }}>
              Signér
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}