import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ImageModal({ image, images, isOpen, onClose, onDelete, onNavigate }) {
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState(null);

  const currentIndex = images.findIndex(img => img.id === image?.id);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
    }
  }, [isOpen, image?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft' && canGoPrev) {
        onNavigate(images[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onNavigate(images[currentIndex + 1]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canGoPrev, canGoNext, currentIndex, images, onNavigate, onClose]);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && canGoNext) {
        onNavigate(images[currentIndex + 1]);
      } else if (diff < 0 && canGoPrev) {
        onNavigate(images[currentIndex - 1]);
      }
    }
    setTouchStart(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full p-0 bg-black/95">
        <div className="relative h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex-1">
              <h3 className="text-white font-medium">{image.name}</h3>
              <p className="text-sm text-slate-300">
                {format(parseISO(image.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                {image.uploaded_by_name && ` • ${image.uploaded_by_name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="text-white hover:bg-white/10"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm min-w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/10"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-white hover:bg-white/10"
              >
                <a href={image.file_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onDelete(image.id);
                  onClose();
                }}
                className="text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div 
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={image.file_url}
              alt={image.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />

            {/* Navigation Arrows */}
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate(images[currentIndex - 1])}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {canGoNext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate(images[currentIndex + 1])}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <div>
                {image.description && <p>{image.description}</p>}
              </div>
              <div>
                Bilde {currentIndex + 1} av {images.length}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}