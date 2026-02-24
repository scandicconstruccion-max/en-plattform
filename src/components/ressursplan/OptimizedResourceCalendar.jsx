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
import { isNorwegianHoliday, getHolidayName } from './norwegianHolidays';

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
  onResizeStart,
  isDragging,
  isConflict,
  isResizing
}) => {
  const [isResizingLocal, setIsResizingLocal] = React.useState(false);

  const handleResizeStart = (e, edge) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizingLocal(true);
    onResizeStart(e, assignment, edge);
  };

  const handleMainDragStart = (e) => {
    if (!canEdit || isResizing || isResizingLocal) return;
    e.stopPropagation();
    onDragStart(e);
  };

  React.useEffect(() => {
    if (!isResizing) {
      setIsResizingLocal(false);
    }
  }, [isResizing]);

  // Assignment type colors
  const assignmentTypeColors = {
    arbeid: projectColor,
    syk: 'bg-red-400',
    egenemelding: 'bg-orange-400',
    ferie: 'bg-blue-400'
  };

  const assignmentTypeLabels = {
    arbeid: projectName,
    syk: '🤒 Syk',
    egenemelding: '📋 Egenemelding',
    ferie: '🏖️ Ferie'
  };

  const type = assignment.assignment_type || 'arbeid';
  const bgColor = assignmentTypeColors[type] || projectColor;
  const label = assignmentTypeLabels[type] || projectName;

  return (
    <div
      draggable={canEdit && !isResizing && !isResizingLocal}
      onDragStart={handleMainDragStart}
      className={cn(
        "group relative px-2 py-1 rounded text-[11px] text-white truncate transition-all select-none font-medium",
        bgColor,
        canEdit && !isResizing && !isResizingLocal && "cursor-move hover:shadow-md hover:scale-[1.02]",
        (isDragging || isResizing || isResizingLocal) && "opacity-50 scale-95",
        isConflict && "ring-2 ring-red-500 ring-offset-1"
      )}
    >
      {canEdit && (
        <>
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity z-20 touch-none rounded-l"
            onPointerDown={(e) => handleResizeStart(e, 'start')}
            style={{ touchAction: 'none' }}
            title="Dra for å endre starttid"
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity z-20 touch-none rounded-r"
            onPointerDown={(e) => handleResizeStart(e, 'end')}
            style={{ touchAction: 'none' }}
            title="Dra for å endre sluttid"
          />
        </>
      )}
      <span onClick={() => onClick()} className="pointer-events-auto cursor-pointer block">
        {label}
      </span>
    </div>
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
  resizingAssignment,
  resizeGhost,
  conflicts,
  isHoliday,
  holidayName,
  style
}) => {
  const [dragStart, setDragStart] = useState(null);
  const [resizeState, setResizeState] = useState(null);

  const getAssignmentsForDay = useCallback((day) => {
    return assignments.filter(a => {
      if (a.resource_id !== resource.id) return false;
      if (!a.start_dato_tid || !a.slutt_dato_tid) return false;
      const start = parseISO(a.start_dato_tid);
      const end = parseISO(a.slutt_dato_tid);
      return isWithinInterval(day, { start, end });
    });
  }, [assignments, resource.id]);

  const weekAllocationPercentage = useMemo(() => {
    let totalMinutes = 0;
    const normalHoursPerWeek = (resource.normal_hours_per_day || 8) * 5; // 5 working days
    
    viewDates.forEach(day => {
      const dayAssignments = getAssignmentsForDay(day);
      dayAssignments.forEach(a => {
        const start = parseISO(a.start_dato_tid);
        const end = parseISO(a.slutt_dato_tid);
        totalMinutes += differenceInMinutes(end, start);
      });
    });
    
    const totalHours = totalMinutes / 60;
    return Math.min(100, Math.round((totalHours / normalHoursPerWeek) * 100));
  }, [viewDates, getAssignmentsForDay, resource.normal_hours_per_day]);

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

  const handleResizeStart = useCallback((e, assignment, edge) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();

    const startPos = { x: e.clientX, y: e.clientY };
    const originalStart = parseISO(assignment.start_dato_tid);
    const originalEnd = parseISO(assignment.slutt_dato_tid);
    
    let currentPreviewStart = originalStart;
    let currentPreviewEnd = originalEnd;

    setResizeState({ assignment, edge, startPos, originalStart, originalEnd });

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      
      // Calculate time delta based on horizontal movement
      const deltaX = moveEvent.clientX - startPos.x;
      const dayWidth = 120; // Min width per day
      const daysDelta = Math.round(deltaX / dayWidth);
      
      let newStart = originalStart;
      let newEnd = originalEnd;

      if (edge === 'start') {
        newStart = addDays(originalStart, daysDelta);
        // Ensure minimum 30 minute duration
        if (differenceInMinutes(originalEnd, newStart) < 30) {
          newStart = addMinutes(originalEnd, -30);
        }
      } else if (edge === 'end') {
        newEnd = addDays(originalEnd, daysDelta);
        // Ensure minimum 30 minute duration
        if (differenceInMinutes(newEnd, originalStart) < 30) {
          newEnd = addMinutes(originalStart, 30);
        }
      }

      currentPreviewStart = newStart;
      currentPreviewEnd = newEnd;

      // Update visual preview
      setResizeState(prev => ({
        ...prev,
        previewStart: newStart,
        previewEnd: newEnd
      }));
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      
      if (currentPreviewStart && currentPreviewEnd) {
        const finalStart = snapToInterval(currentPreviewStart);
        const finalEnd = snapToInterval(currentPreviewEnd);
        
        // Call resize handler
        onAssignmentResize(
          assignment,
          finalStart.toISOString(),
          finalEnd.toISOString()
        );
      }
      
      setResizeState(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [canEdit, onAssignmentResize]);

  const resourceColWidth = style.resourceColumnCollapsed ? 'w-16' : 'w-52';
  const collapsed = style.resourceColumnCollapsed;

  const colWidth = collapsed ? 64 : 208;

  return (
    <div style={style} className="flex border-t border-slate-50">
      <div 
        className={cn(
          "sticky left-0 bg-white z-10 border-r border-slate-200 flex-shrink-0",
          collapsed ? "w-16 px-1.5 py-2" : "w-52 px-3 py-2"
        )}
        style={{ width: colWidth }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-emerald-700">
                {resource.navn?.charAt(0) || 'R'}
              </span>
            </div>
            <span className={cn(
              "px-1 py-0.5 rounded text-[9px] font-bold",
              weekAllocationPercentage >= 100 ? "bg-red-100 text-red-700" :
              weekAllocationPercentage >= 80 ? "bg-amber-100 text-amber-700" :
              "bg-green-100 text-green-700"
            )}>
              {weekAllocationPercentage}%
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-emerald-700">
                {resource.navn?.charAt(0) || 'R'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-900 text-xs truncate" title={resource.navn}>
                  {resource.navn}
                </p>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0",
                  weekAllocationPercentage >= 100 ? "bg-red-100 text-red-700" :
                  weekAllocationPercentage >= 80 ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                )}>
                  {weekAllocationPercentage}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={resource.type === 'employee' ? resource.stilling : resource.rolle}>
                {resource.type === 'employee' ? resource.stilling : resource.rolle}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex">
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
                "w-[120px] flex-shrink-0 p-1.5 border-l border-slate-100 relative hover:bg-slate-50/50 transition-colors",
                isToday && "bg-emerald-50/40",
                dayIsHoliday && "bg-red-50/20"
              )}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={handleDragOver}
              onMouseDown={(e) => handleCellMouseDown(e, day)}
              onMouseUp={(e) => handleCellMouseUp(e, day)}
            >
              {dayIsHoliday && dayHolidayName && (
                <div className="absolute top-0.5 left-0.5 text-[9px] text-red-600 font-semibold pointer-events-none">
                  {dayHolidayName}
                </div>
              )}
              <div className="space-y-1 min-h-[48px]">
                {dayAssignments.map((assignment) => {
                  const isConflict = conflicts.some(c => c.id === assignment.id);
                  const isCurrentlyResizing = resizingAssignment?.id === assignment.id;
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
                      isResizing={isCurrentlyResizing}
                      isConflict={isConflict}
                    />
                  );
                })}
                {showGhost && (
                  <div className="px-2 py-1 rounded text-xs text-white truncate bg-slate-400 opacity-50 border border-dashed border-slate-600">
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
  conflicts = [],
  resourceColumnCollapsed = false,
  onToggleResourceColumn,
  isFullscreen = false
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedAssignment, setDraggedAssignment] = useState(null);
  const [ghostPreview, setGhostPreview] = useState(null);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [resizingAssignment, setResizingAssignment] = useState(null);
  const [resizeGhost, setResizeGhost] = useState(null);

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
        resizingAssignment={resizingAssignment}
        resizeGhost={resizeGhost}
        conflicts={conflicts}
        isHoliday={isHolidayFunc}
        holidayName={getHolidayNameFunc}
        style={{ ...style, resourceColumnCollapsed }}
      />
    );
  }, [resources, viewDates, allAssignments, projects, canEdit, getProjectColor, getProjectName, onAssignmentDrop, onAssignmentClick, onAssignmentResize, handleCellClick, draggedAssignment, ghostPreview, resizingAssignment, resizeGhost, conflicts, isHolidayFunc, getHolidayNameFunc, resourceColumnCollapsed]);

  const resourceColWidth = resourceColumnCollapsed ? 'w-16' : 'w-52';

  const totalCalendarWidth = viewDates.length * 120 + (resourceColumnCollapsed ? 64 : 208);

  return (
    <div className={cn(
      "flex flex-col",
      isFullscreen ? "h-screen" : "h-full"
    )}>
      {/* Compact Navigation Bar */}
      <div className={cn(
        "flex items-center justify-between bg-white border-b border-slate-200 flex-shrink-0",
        isFullscreen ? "px-3 py-2" : "px-4 py-2.5"
      )}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-slate-900">
            {viewMode === 'day' && format(currentDate, 'd. MMM yyyy', { locale: nb })}
            {(viewMode === 'week' || viewMode === 'twoweeks') && `Uke ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'w', { locale: nb })}`}
            {viewMode === 'month' && format(currentDate, 'MMM yyyy', { locale: nb })}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(1)}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <MoreVertical className="h-3.5 w-3.5" />
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
      </div>

      {/* Calendar Grid - Sticky Header with Horizontal Scroll */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="h-full flex flex-col">
          {/* Sticky Header */}
          <div className="flex-shrink-0 sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            <div className="flex" style={{ minWidth: totalCalendarWidth }}>
              <div className={cn(
                "flex-shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 flex items-center justify-between",
                resourceColumnCollapsed ? "w-16 px-2" : "w-52 px-3",
                "py-2.5"
              )}>
                {!resourceColumnCollapsed && <span className="text-xs font-semibold text-slate-700">Ressurs</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleResourceColumn}
                  className="h-6 w-6 p-0 hover:bg-slate-200 rounded"
                  title={resourceColumnCollapsed ? 'Utvid' : 'Kollaps'}
                >
                  <span className="text-xs font-bold text-slate-600">
                    {resourceColumnCollapsed ? '→' : '←'}
                  </span>
                </Button>
              </div>
              {viewDates.map((day) => {
                const dayIsHoliday = isHolidayFunc(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "w-[120px] flex-shrink-0 text-center px-2 py-2.5 border-l border-slate-100",
                      isToday && "bg-emerald-50/80 text-emerald-700",
                      !isToday && dayIsHoliday && "bg-red-50/50 text-red-700",
                      !isToday && !dayIsHoliday && "text-slate-600"
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide">{format(day, 'EEE', { locale: nb })}</div>
                    <div className="text-sm font-bold mt-0.5">{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable Calendar Body */}
          <div className="flex-1 overflow-auto" style={{ minWidth: totalCalendarWidth }}>
            <List
              height={isFullscreen ? window.innerHeight - 85 : Math.min(650, resources.length * 56)}
              itemCount={resources.length}
              itemSize={56}
              width={totalCalendarWidth}
              className="scrollbar-thin"
            >
              {Row}
            </List>
          </div>
        </div>
      </div>
    </div>
  );
}