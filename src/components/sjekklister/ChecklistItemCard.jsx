import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChecklistItemCard({ 
  item, 
  itemIndex, 
  response, 
  onStatusChange, 
  onCommentChange, 
  onImageAdd, 
  onImageRemove 
}) {
  const [showComment, setShowComment] = useState(!!response?.comment);

  const statusConfig = {
    ok: { color: 'bg-green-50 border-green-200', textColor: 'text-green-700', label: 'OK', icon: Check },
    ikke_ok: { color: 'bg-red-50 border-red-200', textColor: 'text-red-700', label: 'Ikke OK', icon: X },
    ikke_relevant: { color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700', label: 'Ikke relevant', icon: AlertCircle }
  };

  const config = statusConfig[response?.status] || { color: 'bg-white', textColor: 'text-slate-600' };
  const StatusIcon = config.icon;

  return (
    <Card className={cn('p-4 transition-all border-2', config.color)}>
      {/* Item Title */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{itemIndex + 1}. {item.title}</h3>
            {item.description && (
              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button
          onClick={() => onStatusChange(itemIndex, 'ok')}
          variant={response?.status === 'ok' ? 'default' : 'outline'}
          className={cn(
            'h-auto py-3 flex flex-col items-center gap-1 text-xs sm:text-sm',
            response?.status === 'ok' && 'bg-green-600 hover:bg-green-700 text-white'
          )}
        >
          <Check className="h-4 w-4" />
          <span>OK</span>
        </Button>
        <Button
          onClick={() => onStatusChange(itemIndex, 'ikke_ok')}
          variant={response?.status === 'ikke_ok' ? 'destructive' : 'outline'}
          className={cn(
            'h-auto py-3 flex flex-col items-center gap-1 text-xs sm:text-sm',
            response?.status === 'ikke_ok' && 'bg-red-600 hover:bg-red-700 text-white'
          )}
        >
          <X className="h-4 w-4" />
          <span>Ikke OK</span>
        </Button>
        <Button
          onClick={() => onStatusChange(itemIndex, 'ikke_relevant')}
          variant={response?.status === 'ikke_relevant' ? 'default' : 'outline'}
          className={cn(
            'h-auto py-3 flex flex-col items-center gap-1 text-xs sm:text-sm',
            response?.status === 'ikke_relevant' && 'bg-gray-600 hover:bg-gray-700 text-white'
          )}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Ikke rel.</span>
        </Button>
      </div>

      {/* Images Section */}
      {item.allow_image && (
        <div className="mb-4 pb-4 border-b">
          <label className="text-sm font-semibold mb-2 block">Bilder</label>
          <div className="flex gap-2 mb-3">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onImageAdd(itemIndex, e.target.files?.[0])}
                className="hidden"
              />
              <Button 
                as="div" 
                variant="outline" 
                className="w-full gap-2 cursor-pointer h-10 text-sm"
              >
                <Upload className="h-4 w-4" />
                Last opp
              </Button>
            </label>
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onImageAdd(itemIndex, e.target.files?.[0])}
                className="hidden"
              />
              <Button 
                as="div" 
                variant="outline" 
                className="w-full gap-2 cursor-pointer h-10 text-sm"
              >
                <Camera className="h-4 w-4" />
                Ta bilde
              </Button>
            </label>
          </div>

          {response?.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {response.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={img} 
                    alt={`Bilde ${idx + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onImageRemove(itemIndex, idx)}
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment Section */}
      {item.allow_comment && (
        <div>
          <button
            onClick={() => setShowComment(!showComment)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
          >
            {showComment ? '− Kommentar' : '+ Legg til kommentar'}
          </button>
          {showComment && (
            <Textarea
              placeholder="Legg til kommentar..."
              value={response?.comment || ''}
              onChange={(e) => onCommentChange(itemIndex, e.target.value)}
              className="text-sm"
            />
          )}
        </div>
      )}
    </Card>
  );
}