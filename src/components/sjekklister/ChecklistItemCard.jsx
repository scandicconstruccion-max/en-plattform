import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, X, AlertTriangle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const statusConfig = {
  ok: { color: 'bg-green-600 hover:bg-green-700 text-white border-green-600', label: '✓ OK', borderColor: 'border-l-green-500' },
  avvik: { color: 'bg-red-600 hover:bg-red-700 text-white border-red-600', label: '⚠ Avvik', borderColor: 'border-l-red-500' },
  ikke_ok: { color: 'bg-red-600 hover:bg-red-700 text-white border-red-600', label: '⚠ Avvik', borderColor: 'border-l-red-500' }, // legacy
  ikke_relevant: { color: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500', label: '— Ikke relevant', borderColor: 'border-l-gray-400' },
  ikke_kontrollert: { color: 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-200', label: '? Ikke kontrollert', borderColor: 'border-l-slate-300' }
};

export default function ChecklistItemCard({
  item,
  itemIndex,
  response,
  onStatusChange,
  onCommentChange,
  onImageAdd,
  onImageRemove,
  onCreateDeviation,
  user
}) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState(response?.comment || '');

  // Normalize legacy "ikke_ok" to "avvik"
  const currentStatus = response?.status === 'ikke_ok' ? 'avvik' : (response?.status || null);
  // Support both old (string array) and new (object array) image formats
  const currentImages = (response?.images || []).map(img =>
    typeof img === 'string' ? { url: img } : img
  );

  const borderColor = currentStatus ? statusConfig[currentStatus]?.borderColor : 'border-l-emerald-500';

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) onImageAdd(itemIndex, file);
    e.target.value = '';
  };

  const isControllert = currentStatus && currentStatus !== 'ikke_kontrollert';

  return (
    <Card className={cn('p-4 bg-white border-l-4 transition-all', borderColor)}>
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
            )}
          </div>
          {item.required && !isControllert && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 shrink-0">Påkrevd</Badge>
          )}
        </div>

        {/* Sporbarhet: hvem og når */}
        {response?.responded_by && response?.responded_date && (
          <p className="text-xs text-slate-400 mt-1">
            ✍ {response.responded_by_name || response.responded_by} — {format(new Date(response.responded_date), 'dd.MM.yy HH:mm', { locale: nb })}
          </p>
        )}
      </div>

      {/* Statusknapper */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['ok', 'avvik', 'ikke_relevant', 'ikke_kontrollert'].map((s) => (
          <Button
            key={s}
            variant={currentStatus === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(itemIndex, s)}
            className={cn(
              'text-xs',
              currentStatus === s && statusConfig[s]?.color
            )}
          >
            {statusConfig[s]?.label}
          </Button>
        ))}
      </div>

      {/* Avvik-knapp */}
      {(currentStatus === 'avvik' || currentStatus === 'ikke_ok') && onCreateDeviation && (
        <div className="mb-3">
          {response?.deviation_id ? (
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Avvik opprettet
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => onCreateDeviation(itemIndex)}
            >
              <AlertTriangle className="h-4 w-4" />
              Opprett avvik
            </Button>
          )}
        </div>
      )}

      {/* Bilder */}
      {item.allow_image !== false && (
        <div className="mb-3">
          {currentImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {currentImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img.url} alt="Dokumentasjon" className="w-full h-24 object-cover rounded border" />
                  {img.uploaded_by_name && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-b truncate">
                      {img.uploaded_by_name}
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-0 right-0 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onImageRemove(itemIndex, idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" size="sm" asChild className="cursor-pointer gap-1 text-xs">
                <span><Plus className="h-3 w-3" /> Bilde</span>
              </Button>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" size="sm" asChild className="cursor-pointer gap-1 text-xs">
                <span><Camera className="h-3 w-3" /> Kamera</span>
              </Button>
            </label>
          </div>
        </div>
      )}

      {/* Kommentar */}
      {item.allow_comment !== false && (
        <div>
          {response?.comment && !showCommentInput && (
            <div className="bg-slate-50 border rounded p-2 mb-2">
              <p className="text-sm text-slate-700">"{response.comment}"</p>
              {response.comment_by_name && (
                <p className="text-xs text-slate-400 mt-1">
                  {response.comment_by_name} — {response.comment_date ? format(new Date(response.comment_date), 'dd.MM.yy HH:mm', { locale: nb }) : ''}
                </p>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-800 p-1 h-auto text-xs"
            onClick={() => {
              setCommentText(response?.comment || '');
              setShowCommentInput(!showCommentInput);
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {response?.comment ? 'Endre kommentar' : 'Legg til kommentar'}
          </Button>

          {showCommentInput && (
            <div className="space-y-2 mt-2">
              <Textarea
                placeholder="Skriv kommentar..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onCommentChange(itemIndex, commentText);
                    setShowCommentInput(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  Lagre
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowCommentInput(false)}>
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}