import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  'ok': { color: 'bg-green-100 text-green-800 border-green-300', label: '✓ OK', icon: '✓' },
  'ikke_ok': { color: 'bg-red-100 text-red-800 border-red-300', label: '✗ Ikke OK', icon: '✗' },
  'ikke_relevant': { color: 'bg-gray-100 text-gray-800 border-gray-300', label: '○ Ikke relevant', icon: '○' }
};

export default function ChecklistItemCard({
  item,
  itemIndex,
  response,
  onStatusChange,
  onCommentChange,
  onImageAdd,
  onImageRemove
}) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState(response?.comment || '');

  const currentStatus = response?.status;
  const currentImages = response?.images || [];

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) onImageAdd(itemIndex, file);
    e.target.value = '';
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (file) onImageAdd(itemIndex, file);
    e.target.value = '';
  };

  return (
    <Card className="p-4 bg-white border-l-4 border-l-emerald-600">
      <div className="mb-3">
        <h3 className="font-semibold text-base">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-slate-600 mt-1">{item.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={currentStatus === 'ok' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange(itemIndex, 'ok')}
          className={cn(
            currentStatus === 'ok' && 'bg-green-600 hover:bg-green-700 text-white'
          )}
        >
          ✓ OK
        </Button>
        <Button
          variant={currentStatus === 'ikke_ok' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange(itemIndex, 'ikke_ok')}
          className={cn(
            currentStatus === 'ikke_ok' && 'bg-red-600 hover:bg-red-700 text-white'
          )}
        >
          ✗ Ikke OK
        </Button>
        <Button
          variant={currentStatus === 'ikke_relevant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange(itemIndex, 'ikke_relevant')}
          className={cn(
            currentStatus === 'ikke_relevant' && 'bg-gray-600 hover:bg-gray-700 text-white'
          )}
        >
          ○ Ikke relevant
        </Button>
      </div>

      {item.allow_image && (
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild className="cursor-pointer gap-2">
                <span>
                  <Plus className="h-4 w-4" />
                  Bilde
                </span>
              </Button>
            </label>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild className="cursor-pointer gap-2">
                <span>
                  📷 Kamera
                </span>
              </Button>
            </label>
          </div>

          {currentImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {currentImages.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="Opplastet bilde" className="w-full h-24 object-cover rounded border" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-0 right-0 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-bl"
                    onClick={() => onImageRemove(itemIndex, idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {item.allow_comment && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-600 mb-2"
            onClick={() => setShowCommentInput(!showCommentInput)}
          >
            <MessageSquare className="h-4 w-4" />
            {response?.comment ? 'Endre kommentar' : 'Legg til kommentar'}
          </Button>

          {showCommentInput && (
            <div className="space-y-2">
              <Textarea
                placeholder="Legg til kommentar..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  onCommentChange(itemIndex, commentText);
                  setShowCommentInput(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Lagre kommentar
              </Button>
            </div>
          )}
          {response?.comment && !showCommentInput && (
            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mt-2">"{response.comment}"</p>
          )}
        </div>
      )}
    </Card>
  );
}