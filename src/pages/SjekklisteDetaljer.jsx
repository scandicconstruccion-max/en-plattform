import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Check, CheckCircle2, Download } from 'lucide-react';
import ChecklistItemCard from '@/components/sjekklister/ChecklistItemCard';
import { cn } from '@/lib/utils';

export default function SjekklisteDetaljer() {
  const [checklistId, setChecklistId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  // Fetch checklist
  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ['checklist', checklistId],
    queryFn: () => base44.entities.Checklist.read(checklistId),
    enabled: !!checklistId,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0
  });

  // Update checklist
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Checklist.update(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    }
  });

  // Upload file
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Feil ved lasting av sjekkliste</p>
          <Button onClick={() => navigate(createPageUrl('Sjekklister'))}>
            Tilbake til sjekklister
          </Button>
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
  const totalItems = checklist.items?.length || 1;
  const progress = Math.round((completedItems / totalItems) * 100);
  const isComplete = progress === 100 && checklist.status === 'fullfort';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
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

            {/* Progress */}
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

            {/* Status and Actions */}
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
            </div>
          </Card>
        </div>

        {/* Checklist Items */}
        <div className="space-y-4">
          {(checklist.items || []).map((item, idx) => {
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
          })}
        </div>
      </div>
    </div>
  );
}