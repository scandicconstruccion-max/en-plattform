import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Filter } from 'lucide-react';
import { parseISO, format, isFuture } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ResourceActivityPanel({
  open,
  onOpenChange,
  resource,
  assignments,
  projects,
  onActivityClick,
  getProjectColor,
  getProjectName
}) {
  const [showFutureOnly, setShowFutureOnly] = useState(false);

  const sortedActivities = useMemo(() => {
    if (!resource || !assignments) return [];

    const filtered = assignments
      .filter(a => a.resource_id === resource.id)
      .filter(a => {
        if (!showFutureOnly) return true;
        const start = parseISO(a.start_dato_tid);
        return isFuture(start);
      })
      .sort((a, b) => {
        const aStart = parseISO(a.start_dato_tid);
        const bStart = parseISO(b.start_dato_tid);
        return aStart - bStart;
      });

    return filtered;
  }, [resource, assignments, showFutureOnly]);

  const calculateDuration = (start, end) => {
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const getActivityTypeLabel = (type) => {
    const typeMap = {
      arbeid: 'Arbeid',
      syk: 'Syk',
      egenemelding: 'Egenmelding',
      ferie: 'Ferie'
    };
    return typeMap[type] || 'Aktivitet';
  };

  if (!resource) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-slate-100 rounded transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <SheetTitle className="text-base">
                {resource.navn}
              </SheetTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {resource.type === 'employee' ? resource.stilling : resource.rolle}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Filter Tab */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showFutureOnly}
              onChange={(e) => setShowFutureOnly(e.target.checked)}
              className="rounded"
            />
            <span>Bare fremtid</span>
          </label>
        </div>

        {/* Activities List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {sortedActivities.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500">Ingen aktiviteter</p>
              </div>
            ) : (
              sortedActivities.map((activity) => {
                const start = parseISO(activity.start_dato_tid);
                const end = parseISO(activity.slutt_dato_tid);
                const { hours, minutes } = calculateDuration(start, end);
                const projectColor = getProjectColor(activity.prosjekt_id);
                const projectName = getProjectName(activity.prosjekt_id);
                const activityType = activity.assignment_type || 'arbeid';

                return (
                  <button
                    key={activity.id}
                    onClick={() => onActivityClick(activity)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors group">
                    
                    {/* Header: Date and Type */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-600">
                          {format(start, 'd. MMM', { locale: nb })} – {format(end, 'd. MMM yyyy', { locale: nb })}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {format(start, 'HH:mm', { locale: nb })} – {format(end, 'HH:mm', { locale: nb })}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-slate-100 flex-shrink-0">
                        {getActivityTypeLabel(activityType)}
                      </span>
                    </div>

                    {/* Project info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full flex-shrink-0",
                          projectColor
                        )}
                      />
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {projectName}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-600">
                        {hours}t {minutes}m
                      </span>
                      {activity.notater && (
                        <span className="text-slate-500 truncate">
                          {activity.notater}
                        </span>
                      )}
                    </div>

                    {/* Click hint */}
                    <p className="text-[10px] text-slate-400 mt-2 group-hover:text-slate-500 transition-colors">
                      Klikk for å redigere
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer: Summary */}
        {sortedActivities.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-600">
              <span className="font-semibold">{sortedActivities.length}</span> aktivitet{sortedActivities.length === 1 ? '' : 'er'}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}