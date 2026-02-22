import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Grid3x3, List, Calendar, Download, Trash2, MoreVertical, Grid2x2, LayoutGrid } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const VIEW_MODES = [
  { id: 'grid-large', label: 'Stor rutenett', icon: Grid2x2, cols: 'grid-cols-2 lg:grid-cols-3' },
  { id: 'grid-medium', label: 'Medium rutenett', icon: Grid3x3, cols: 'grid-cols-3 lg:grid-cols-4' },
  { id: 'grid-compact', label: 'Kompakt rutenett', icon: LayoutGrid, cols: 'grid-cols-4 lg:grid-cols-6' },
  { id: 'list', label: 'Liste', icon: List, cols: null },
  { id: 'timeline', label: 'Tidslinje', icon: Calendar, cols: null }
];

export default function ImageGallery({ 
  images, 
  selectedFiles, 
  onToggleSelection, 
  onOpenImage, 
  onDelete,
  userAccessLevel 
}) {
  const [viewMode, setViewMode] = useState('grid-medium');

  const currentMode = VIEW_MODES.find(m => m.id === viewMode);

  // Group images by date for timeline view
  const imagesByDate = useMemo(() => {
    const grouped = {};
    images.forEach(img => {
      const date = format(parseISO(img.created_date), 'yyyy-MM-dd');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(img);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [images]);

  const renderGridView = () => {
    const mode = VIEW_MODES.find(m => m.id === viewMode);
    return (
      <div className={cn('grid gap-3', mode.cols)}>
        {images.map(img => (
          <div key={img.id} className="relative group">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedFiles.includes(img.id)}
                onCheckedChange={() => onToggleSelection(img.id)}
                className="bg-white/90 border-white/50"
              />
            </div>
            <div 
              onClick={() => onOpenImage(img)}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-slate-100 relative"
            >
              <img 
                src={img.file_url} 
                alt={img.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            {viewMode === 'grid-large' && (
              <div className="mt-2 px-1">
                <p className="text-sm font-medium truncate">{img.name}</p>
                <p className="text-xs text-slate-500">
                  {format(parseISO(img.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-2">
      {images.map(img => (
        <Card key={img.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedFiles.includes(img.id)}
              onCheckedChange={() => onToggleSelection(img.id)}
            />
            <div 
              onClick={() => onOpenImage(img)}
              className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer bg-slate-100 flex-shrink-0"
            >
              <img 
                src={img.file_url} 
                alt={img.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{img.name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>{format(parseISO(img.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}</span>
                {img.uploaded_by_name && (
                  <>
                    <span>•</span>
                    <span>{img.uploaded_by_name}</span>
                  </>
                )}
              </div>
              {img.description && (
                <p className="text-sm text-slate-600 mt-1">{img.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={img.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Last ned
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(img.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Slett
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderTimelineView = () => (
    <div className="space-y-6">
      {imagesByDate.map(([date, imgs]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full">
              <Calendar className="h-4 w-4" />
              <span className="font-medium text-sm">
                {format(parseISO(date), 'EEEE d. MMMM yyyy', { locale: nb })}
              </span>
              <Badge variant="secondary" className="ml-2">
                {imgs.length} {imgs.length === 1 ? 'bilde' : 'bilder'}
              </Badge>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {imgs.map(img => (
              <div key={img.id} className="relative group">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedFiles.includes(img.id)}
                    onCheckedChange={() => onToggleSelection(img.id)}
                    className="bg-white/90 border-white/50"
                  />
                </div>
                <div 
                  onClick={() => onOpenImage(img)}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-slate-100 relative"
                >
                  <img 
                    src={img.file_url} 
                    alt={img.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm truncate">
                      {format(parseISO(img.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {VIEW_MODES.map(mode => {
          const Icon = mode.icon;
          return (
            <Button
              key={mode.id}
              variant={viewMode === mode.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode.id)}
              className={cn(
                "gap-2",
                viewMode === mode.id && "bg-white shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{mode.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Gallery Content */}
      {viewMode.startsWith('grid-') && renderGridView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'timeline' && renderTimelineView()}

      {images.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">Ingen bilder i denne kategorien</p>
        </div>
      )}
    </div>
  );
}