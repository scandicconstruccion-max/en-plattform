import React, { useState, useCallback, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, startOfWeek, startOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isWithinInterval, parseISO, endOfWeek, endOfMonth, eachDayOfInterval, differenceInMinutes, addMinutes, getDay } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AssignmentPopover from './AssignmentPopover';
import { isNorwegianHoliday, getHolidayName } from '@/lib/norwegianHolidays';

// Snap to 30-minute intervals
const snapToInterval = (date) => {
  const minutes = date.getMinutes();
  const snappedMinutes = Math.round(minutes / 30) * 30;
  return addMinutes(new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()), snappedMinutes);
};

// Memoized assignment block component with resize handles
const AssignmentBlock = memo(({ 
  assignment, 
  projectColor, 
  projectName, 
  canEdit, 
  onDragStart, 
  onClick,
  onEdit,
  onResizeStart,
  isDragging,
  isConflict
}) => {
  const handleResizeLeft = (e) => {
    if (!canEdit) return;
    e.stopPropagation();
    onResizeStart(assignment, 'start');
  };

  const handleResizeRight = (e) => {
    if (!canEdit) return;
    e.stopPropagation();
    onResizeStart(assignment, 'end');
  };

  return (
    <AssignmentPopover 
      assignment={assignment} 
      projectName={projectName}
      onEdit={onEdit}
      canEdit={canEdit}
    >
      <div
        draggable={canEdit}
        onDragStart={onDragStart}
        className={cn(
          "group relative px-2 py-1.5 rounded text-xs text-white truncate cursor-pointer hover:opacity-90 transition-all select-none touch-manipulation",
          projectColor,
          canEdit && "cursor-move",
          isDragging && "opacity-50",
          isConflict && "ring-2 ring-red-500 ring-offset-1"
        )}
        style={{ 
          WebkitTouchCallout: 'none',
          touchAction: canEdit ? 'none' : 'auto'
        }}
      >
        {canEdit && (
          <>
            <div 
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={handleResizeLeft}
              onTouchStart={handleResizeLeft}
            />
            <div 
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={handleResizeRight}
              onTouchStart={handleResizeRight}
            />
          </>
        )}
        {projectName}
      </div>
    </AssignmentPopover>
  );
});

AssignmentBlock.displayName = 'AssignmentBlock';

// Memoized resource row component
const ResourceRow = memo(({ 
  resource, 
  viewDates, 
  assignments,
  projects,
  canEdit,
  getProjectColor,
  getProjectName,
  onAssignmentDrop,
  onAssignmentClick,
  onAssignmentResize,
  onCellClick,
  draggedAssignment,
  ghostPreview,
  conflicts,
  isHoliday,
  holidayName,
  style
}) => {
  const [dragStart, setDragStart] = useState(null);
  const [resizing, setResizing] = useState(null);

  const getAssignmentsForDay = useCallback((day) => {
    return assignments.filter(a => {
      if (a.resource_id !== resource.id) return false;
      if (!a.start_dato_tid || !a.slutt_dato_tid) return false;
      const start = parseISO(a.start_dato_tid);
      const end = parseISO(a.slutt_dato_tid);
      return isWithinInterval(day, { start, end });
    });
  }, [assignments, resource.id]);

  const capacityPercentage = useMemo(() => {
    let totalBooked = 0;
    viewDates.forEach(day => {
      const dayAssignments = getAssignmentsForDay(day);
      if (dayAssignments.length > 0) totalBooked++;
    });
    return Math.round((totalBooked / viewDates.length) * 100);
  }, [viewDates, getAssignmentsForDay]);

  const capacityColor = capacityPercentage === 0 ? 'bg-green-100 text-green-700' :
                        capacityPercentage < 70 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700';

  const handleDragStart = useCallback((e, assignment) => {
    if (!canEdit) return;
    e.dataTransfer.setData('assignment', JSON.stringify(assignment));
    e.dataTransfer.effectAllowed = 'move';
  }, [canEdit]);

  const handleCellMouseDown = useCallback((e, day) => {
    if (!canEdit || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hourFraction = clickY / rect.height;
    const startTime = new Date(day);
    startTime.setHours(8 + Math.floor(hourFraction * 8), Math.round((hourFraction * 8 % 1) * 60));
    setDragStart({ day, startTime: snapToInterval(startTime), rect });
  }, [canEdit]);

  const handleCellMouseUp = useCallback((e, day) => {
    if (!dragStart || !canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hourFraction = clickY / rect.height;
    const endTime = new Date(day);
    endTime.setHours(8 + Math.floor(hourFraction * 8), Math.round((hourFraction * 8 % 1) * 60));
    const snappedEnd = snapToInterval(endTime);
    
    if (differenceInMinutes(snappedEnd, dragStart.startTime) >= 30) {
      onCellClick(resource.id, dragStart.startTime, snappedEnd);
    }
    setDragStart(null);
  }, [dragStart, canEdit, resource.id, onCellClick]);

  const handleDrop = useCallback((e, day) => {
    if (!canEdit) return;
    e.preventDefault();
    const assignment = JSON.parse(e.dataTransfer.getData('assignment'));
    
    const originalStart = parseISO(assignment.start_dato_tid);
    const timeDiff = day.getTime() - new Date(originalStart.getFullYear(), originalStart.getMonth(), originalStart.getDate()).getTime();
    
    const newStart = snapToInterval(new Date(originalStart.getTime() + timeDiff));
    const originalEnd = parseISO(assignment.slutt_dato_tid);
    const newEnd = snapToInterval(new Date(originalEnd.getTime() + timeDiff));
    
    onAssignmentDrop(assignment, resource.id, newStart.toISOString(), newEnd.toISOString());
  }, [canEdit, resource.id, onAssignmentDrop]);

  const handleDragOver = useCallback((e) => {
    if (!canEdit) return;
    e.preventDefault();
  }, [canEdit]);

  const handleResizeStart = useCallback((assignment, edge) => {
    if (!canEdit) return;
    setResizing({ assignment, edge });
  }, [canEdit]);

  const handleResizeMove = useCallback((e, day) => {
    if (!resizing || !canEdit) return;
    // Visual feedback during resize can be added here
  }, [resizing, canEdit]);

  const handleResizeEnd = useCallback((e, day) => {
    if (!resizing || !canEdit) return;
    const { assignment, edge } = resizing;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hourFraction = Math.max(0, Math.min(1, clickY / rect.height));
    const newTime = new Date(day);
    newTime.setHours(8 + Math.floor(hourFraction * 8), Math.round((hourFraction * 8 % 1) * 60));
    const snappedTime = snapToInterval(newTime);

    if (edge === 'start') {
      const endTime = parseISO(assignment.slutt_dato_tid);
      if (snappedTime < endTime) {
        onAssignmentResize(assignment, snappedTime.toISOString(), assignment.slutt_dato_tid);
      }
    } else {
      const startTime = parseISO(assignment.start_dato_tid);
      if (snappedTime > startTime) {
        onAssignmentResize(assignment, assignment.start_dato_tid, snappedTime.toISOString());
      }
    }
    
    setResizing(null);
  }, [resizing, canEdit, onAssignmentResize]);

  return (
    <div style={style} className="flex border-t border-slate-100">
      <div className="w-48 p-4 sticky left-0 bg-white z-10 border-r border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-emerald-700">
              {resource.navn?.charAt(0) || 'R'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 text-sm truncate">{resource.navn}</p>
            <p className="text-xs text-slate-500 truncate">
              {resource.type === 'employee' ? resource.stilling : resource.rolle}
            </p>
          </div>
          <div className={cn("px-2 py-1 rounded-full text-xs font-medium flex-shrink-0", capacityColor)}>
            {capacityPercentage}%
          </div>
        </div>
      </div>
      <div className="flex flex-1">
        {viewDates.map((day) => {
          const dayAssignments = getAssignmentsForDay(day);
          const isToday = isSameDay(day, new Date());
          const showGhost = ghostPreview && ghostPreview.resourceId === resource.id && isSameDay(day, parseISO(ghostPreview.start));
          const dayIsHoliday = isHoliday(day);
          const dayHolidayName = holidayName(day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 border-l border-slate-100 min-w-[120px] flex-1 relative",
                isToday && "bg-emerald-50/50",
                dayIsHoliday && "bg-red-50/30"
              )}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={handleDragOver}
              onMouseDown={(e) => handleCellMouseDown(e, day)}
              onMouseUp={(e) => resizing ? handleResizeEnd(e, day) : handleCellMouseUp(e, day)}
              onMouseMove={(e) => handleResizeMove(e, day)}
            >
              {dayIsHoliday && dayHolidayName && (
                <div className="absolute top-1 left-1 text-[10px] text-red-600 font-medium pointer-events-none">
                  {dayHolidayName}
                </div>
              )}
              <div className="space-y-1 min-h-[60px]">
                {dayAssignments.map((assignment) => {
                  const isConflict = conflicts.some(c => c.id === assignment.id);
                  return (
                    <AssignmentBlock
                      key={assignment.id}
                      assignment={assignment}
                      projectColor={getProjectColor(assignment.prosjekt_id)}
                      projectName={getProjectName(assignment.prosjekt_id)}
                      canEdit={canEdit}
                      onDragStart={(e) => handleDragStart(e, assignment)}
                      onClick={() => onAssignmentClick(assignment)}
                      onEdit={() => onAssignmentClick(assignment)}
                      onResizeStart={handleResizeStart}
                      isDragging={draggedAssignment?.id === assignment.id}
                      isConflict={isConflict}
                    />
                  );
                })}
                {showGhost && (
                  <div className="px-2 py-1.5 rounded text-xs text-white truncate bg-slate-400 opacity-50 border-2 border-dashed border-slate-600">
                    Ny planlegging
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ResourceRow.displayName = 'ResourceRow';

export default function OptimizedResourceCalendar({ 
  assignments, 
  resources, 
  projects,
  viewMode = 'week',
  onAssignmentDrop,
  onAssignmentClick,
  onAssignmentResize,
  onCreateAssignment,
  canEdit,
  optimisticAssignments = [],
  conflicts = []
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedAssignment, setDraggedAssignment] = useState(null);
  const [ghostPreview, setGhostPreview] = useState(null);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);

  const getViewDates = useCallback(() => {
    let dates = [];
    
    if (viewMode === 'day') {
      dates = [currentDate];
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else if (viewMode === 'twoweeks') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      dates = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      dates = eachDayOfInterval({ start: monthStart, end: monthEnd });
    }

    // Filter out weekends if disabled
    if (!showWeekends) {
      dates = dates.filter(date => {
        const day = getDay(date);
        return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
      });
    }

    return dates;
  }, [currentDate, viewMode, showWeekends]);

  const navigate = useCallback((direction) => {
    if (viewMode === 'day') {
      setCurrentDate(direction > 0 ? addDays(currentDate, 1) : addDays(currentDate, -1));
    } else if (viewMode === 'week' || viewMode === 'twoweeks') {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  }, [currentDate, viewMode]);

  const getProjectColor = useCallback((projectId) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    const index = projects.findIndex(p => p.id === projectId);
    return colors[index % colors.length];
  }, [projects]);

  const getProjectName = useCallback((projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent';
  }, [projects]);

  const viewDates = useMemo(() => getViewDates(), [getViewDates]);
  
  // Merge optimistic assignments
  const allAssignments = useMemo(() => {
    return [...assignments, ...optimisticAssignments];
  }, [assignments, optimisticAssignments]);

  const handleCellClick = useCallback((resourceId, startTime, endTime) => {
    if (!canEdit) return;
    onCreateAssignment(resourceId, startTime.toISOString(), endTime.toISOString());
  }, [canEdit, onCreateAssignment]);

  const isHolidayFunc = useCallback((date) => {
    return showHolidays && isNorwegianHoliday(date);
  }, [showHolidays]);

  const getHolidayNameFunc = useCallback((date) => {
    return showHolidays ? getHolidayName(date) : null;
  }, [showHolidays]);

  const Row = useCallback(({ index, style }) => {
    const resource = resources[index];
    return (
      <ResourceRow
        resource={resource}
        viewDates={viewDates}
        assignments={allAssignments}
        projects={projects}
        canEdit={canEdit}
        getProjectColor={getProjectColor}
        getProjectName={getProjectName}
        onAssignmentDrop={onAssignmentDrop}
        onAssignmentClick={onAssignmentClick}
        onAssignmentResize={onAssignmentResize}
        onCellClick={handleCellClick}
        draggedAssignment={draggedAssignment}
        ghostPreview={ghostPreview}
        conflicts={conflicts}
        isHoliday={isHolidayFunc}
        holidayName={getHolidayNameFunc}
        style={style}
      />
    );
  }, [resources, viewDates, allAssignments, projects, canEdit, getProjectColor, getProjectName, onAssignmentDrop, onAssignmentClick, onAssignmentResize, handleCellClick, draggedAssignment, ghostPreview, conflicts, isHolidayFunc, getHolidayNameFunc]);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className="font-semibold text-slate-900">
              {viewMode === 'day' && format(currentDate, 'd. MMMM yyyy', { locale: nb })}
              {(viewMode === 'week' || viewMode === 'twoweeks') && `Uke ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'w', { locale: nb })} - ${format(currentDate, 'yyyy')}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: nb })}
            </h2>
            {(viewMode === 'week' || viewMode === 'twoweeks') && (
              <p className="text-sm text-slate-500">
                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM', { locale: nb })} - {format(viewMode === 'twoweeks' ? addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 13) : endOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM', { locale: nb })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={showWeekends}
                  onCheckedChange={setShowWeekends}
                >
                  Vis helger
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showHolidays}
                  onCheckedChange={setShowHolidays}
                >
                  Vis helligdager
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(1)}
              className="rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Calendar Grid with Virtualization */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="flex bg-slate-50 border-b border-slate-200">
            <div className="w-48 p-4 font-medium text-slate-600 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 flex-shrink-0">
              Ressurs
            </div>
            <div className="flex flex-1">
              {viewDates.map((day) => {
                const dayIsHoliday = isHolidayFunc(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "text-center p-4 font-medium min-w-[120px] flex-1 border-l border-slate-100",
                      isSameDay(day, new Date()) ? "text-emerald-600 bg-emerald-50" : "text-slate-600",
                      dayIsHoliday && "bg-red-50/50 text-red-700"
                    )}
                  >
                    {viewMode !== 'month' ? (
                      <>
                        <div className="text-xs uppercase">{format(day, 'EEE', { locale: nb })}</div>
                        <div className="text-lg">{format(day, 'd')}</div>
                      </>
                    ) : (
                      <div className="text-sm">{format(day, 'd')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Virtualized Rows */}
          <List
            height={Math.min(600, resources.length * 80)}
            itemCount={resources.length}
            itemSize={80}
            width="100%"
            className="scrollbar-thin"
          >
            {Row}
          </List>
        </div>
      </Card>
    </div>
  );
}