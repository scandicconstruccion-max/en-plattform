import React, { useState, useCallback, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
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

// Memoized assignment block component with resize handles and live drag
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
  isResizing,
  dragTransform,
  dragConflict
}) => {
  const [isResizingLocal, setIsResizingLocal] = React.useState(false);
  const [clickStart, setClickStart] = React.useState(null);

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
    e.preventDefault();
    
    // Track click start for single click detection
    setClickStart({ x: e.clientX, y: e.clientY, time: Date.now() });
    onDragStart(e, assignment);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    
    // If we have click start position, check if this was a real drag
    if (clickStart) {
      const deltaX = Math.abs(e.clientX - clickStart.x);
      const deltaY = Math.abs(e.clientY - clickStart.y);
      const deltaTime = Date.now() - clickStart.time;
      
      // If movement is minimal and time is quick, treat as click not drag
      if (deltaX < 5 && deltaY < 5 && deltaTime < 200) {
        onClick();
        setClickStart(null);
        return;
      }
    }
    
    setClickStart(null);
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
       onPointerDown={handleMainDragStart}
       onPointerUp={handleClick}
       className={cn(
         "group relative px-2 py-1 rounded text-[11px] text-white truncate select-none font-medium",
         bgColor,
         canEdit && !isResizing && !isResizingLocal && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
         isDragging && "cursor-grabbing",
         (isResizing || isResizingLocal) && "opacity-50 scale-95",
         (isConflict || dragConflict) && "ring-2 ring-red-500 ring-offset-1"
       )}
       style={{
         transform: dragTransform || 'none',
         transition: isDragging ? 'none' : 'all 0.2s',
         opacity: isDragging ? 0.85 : 1,
         boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : undefined,
         willChange: isDragging ? 'transform' : 'auto',
         zIndex: isDragging ? 50 : 'auto'
       }}
     >
       {canEdit && !isDragging && (
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
       <span className="pointer-events-auto cursor-pointer block">
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
  style,
  activeDrag,
  onDragUpdate
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
    e.preventDefault();
    e.stopPropagation();
    
    const startPos = { x: e.clientX, y: e.clientY };
    const assignmentStart = parseISO(assignment.start_dato_tid);
    const assignmentEnd = parseISO(assignment.slutt_dato_tid);
    
    const dragState = {
      assignment,
      startPos,
      originalStart: assignmentStart,
      originalEnd: assignmentEnd,
      currentTransform: { x: 0, y: 0 },
      conflict: false
    };
    
    onDragUpdate(dragState);
    
    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.clientX - startPos.x;
      const deltaY = moveEvent.clientY - startPos.y;
      
      const dayWidth = style.dayWidth || 120;
      const rowHeight = 56;
      
      const daysDelta = Math.round(deltaX / dayWidth);
      const rowsDelta = Math.round(deltaY / rowHeight);
      
      const newStart = addDays(assignmentStart, daysDelta);
      const newEnd = addDays(assignmentEnd, daysDelta);
      
      // Check conflicts
      const hasConflict = assignments.some(a => {
        if (a.id === assignment.id) return false;
        if (a.resource_id !== assignment.resource_id) return false;
        
        const aStart = parseISO(a.start_dato_tid);
        const aEnd = parseISO(a.slutt_dato_tid);
        
        return (
          isWithinInterval(newStart, { start: aStart, end: aEnd }) ||
          isWithinInterval(newEnd, { start: aStart, end: aEnd }) ||
          isWithinInterval(aStart, { start: newStart, end: newEnd }) ||
          isWithinInterval(aEnd, { start: newStart, end: newEnd })
        );
      });
      
      onDragUpdate({
        ...dragState,
        currentTransform: { x: deltaX, y: deltaY },
        snappedTransform: { x: daysDelta * dayWidth, y: rowsDelta * rowHeight },
        newStart,
        newEnd,
        conflict: hasConflict
      });
    };
    
    const handlePointerUp = (upEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      
      const deltaX = upEvent.clientX - startPos.x;
      const deltaY = upEvent.clientY - startPos.y;
      
      const dayWidth = style.dayWidth || 120;
      const daysDelta = Math.round(deltaX / dayWidth);
      
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        const newStart = snapToInterval(addDays(assignmentStart, daysDelta));
        const newEnd = snapToInterval(addDays(assignmentEnd, daysDelta));
        
        onAssignmentDrop(
          assignment,
          assignment.resource_id,
          newStart.toISOString(),
          newEnd.toISOString()
        );
      }
      
      onDragUpdate(null);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = 'grabbing';
  }, [canEdit, assignments, style, onDragUpdate, onAssignmentDrop]);

  const handleCellClick = useCallback((e, day, resourceId) => {
    if (!canEdit) return;
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hourFraction = Math.max(0, Math.min(1, clickY / rect.height));
    const startTime = new Date(day);
    startTime.setHours(8 + Math.floor(hourFraction * 8), Math.round((hourFraction * 8 % 1) * 60));
    const snappedStart = snapToInterval(startTime);
    const snappedEnd = snapToInterval(addMinutes(snappedStart, 60));
    onCellClick(resourceId, snappedStart, snappedEnd);
  }, [canEdit, onCellClick]);

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
      const cellDayWidth = 120; // Reference width for calculation
      const daysDelta = Math.round(deltaX / cellDayWidth);
      
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
    <div style={style} className="flex border-t border-slate-200">
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
                {(() => {
                  const names = resource.navn?.split(' ') || [];
                  if (names.length >= 2) {
                    return names[0].charAt(0) + names[names.length - 1].charAt(0);
                  }
                  return resource.navn?.charAt(0) || 'R';
                })()}
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
                {(() => {
                  const names = resource.navn?.split(' ') || [];
                  if (names.length >= 2) {
                    return names[0].charAt(0) + names[names.length - 1].charAt(0);
                  }
                  return resource.navn?.charAt(0) || 'R';
                })()}
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
           const isWeekend = getDay(day) === 0 || getDay(day) === 6;
           const isEmptyCell = dayAssignments.length === 0;

          return (
            <div
              key={day.toISOString()}
              style={{ width: style.dayWidth }}
              className={cn(
                "flex-shrink-0 p-1.5 border-l border-t border-slate-200 relative transition-colors",
                isWeekend && "bg-slate-100/60",
                isToday && "bg-emerald-50/30",
                dayIsHoliday && "bg-red-50/20",
                isEmptyCell && canEdit && "cursor-pointer hover:bg-slate-200/60",
                !isEmptyCell && "hover:bg-slate-50/50"
              )}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={handleDragOver}
              onClick={(e) => isEmptyCell && handleCellClick(e, day, resource.id)}
              title={isEmptyCell && canEdit ? "Klikk for å opprette aktivitet" : ""}
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
                  const isDragging = activeDrag?.assignment?.id === assignment.id;
                  const dragTransform = isDragging && activeDrag?.snappedTransform 
                    ? `translate(${activeDrag.snappedTransform.x}px, ${activeDrag.snappedTransform.y}px)`
                    : null;
                  const dragConflict = isDragging && activeDrag?.conflict;
                  
                  return (
                    <AssignmentBlock
                      key={assignment.id}
                      assignment={assignment}
                      projectColor={getProjectColor(assignment.prosjekt_id)}
                      projectName={getProjectName(assignment.prosjekt_id)}
                      canEdit={canEdit}
                      onDragStart={handleDragStart}
                      onClick={() => onAssignmentClick(assignment)}
                      onEdit={() => onAssignmentClick(assignment)}
                      onResizeStart={handleResizeStart}
                      isDragging={isDragging}
                      isResizing={isCurrentlyResizing}
                      isConflict={isConflict}
                      dragTransform={dragTransform}
                      dragConflict={dragConflict}
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
  const [activeDrag, setActiveDrag] = useState(null);

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
      // Month view: show current month + enough days from next month to fill the screen
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const currentMonthDates = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      // Add days from next month to reach at least 42 days (6 weeks)
      const nextMonthStart = addDays(monthEnd, 1);
      const daysToAdd = Math.max(0, 42 - currentMonthDates.length);
      const nextMonthDates = Array.from({ length: daysToAdd }, (_, i) => addDays(nextMonthStart, i));
      
      dates = [...currentMonthDates, ...nextMonthDates];
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

  // Dynamic day width for week view to fill available space
  const [containerWidth, setContainerWidth] = React.useState(window.innerWidth);
  
  React.useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const resourceWidth = resourceColumnCollapsed ? 64 : 208;
  const availableWidth = containerWidth - resourceWidth - 16; // 16px for scrollbar
  const dayWidth = viewMode === 'week' 
    ? Math.max(100, Math.floor(availableWidth / viewDates.length))
    : 120;
  const totalCalendarWidth = viewMode === 'week'
    ? containerWidth
    : viewDates.length * dayWidth + resourceWidth;

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
        style={{ ...style, resourceColumnCollapsed, dayWidth }}
        activeDrag={activeDrag}
        onDragUpdate={setActiveDrag}
      />
    );
  }, [resources, viewDates, allAssignments, projects, canEdit, getProjectColor, getProjectName, onAssignmentDrop, onAssignmentClick, onAssignmentResize, handleCellClick, draggedAssignment, ghostPreview, resizingAssignment, resizeGhost, conflicts, isHolidayFunc, getHolidayNameFunc, resourceColumnCollapsed, dayWidth, activeDrag]);

  return (
    <div className={cn(
      "flex flex-col bg-white",
      isFullscreen ? "h-screen" : ""
    )}>
      {/* Compact Navigation Bar */}
      <div className={cn(
        "flex items-center justify-between bg-white border-b border-slate-200 flex-shrink-0",
        isFullscreen ? "px-2 py-1.5" : "px-3 py-2"
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
              <Settings className="h-3.5 w-3.5" />
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

      {/* Calendar Grid - Horizontal Scroll Only */}
      <div className={cn(isFullscreen ? "flex-1" : "", "overflow-hidden")}>
        <div className="flex flex-col">
          {/* Sticky Header */}
          <div className="flex-shrink-0 overflow-x-auto overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
            <div className="flex bg-slate-50 border-b border-slate-200" style={{ minWidth: 'max-content' }}>
              <div className={cn(
                "flex-shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 flex items-center justify-between",
                resourceColumnCollapsed ? "w-16 px-2" : "w-52 px-3",
                "py-2.5"
              )}
              style={{ width: resourceWidth }}>
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
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: dayWidth }}
                    className={cn(
                      "flex-shrink-0 text-center px-2 py-2.5 border-l border-slate-200 relative",
                      isWeekend && !isToday && "bg-slate-200/70",
                      isToday && "bg-emerald-100 text-emerald-900 font-bold",
                      !isToday && dayIsHoliday && "bg-red-50/50 text-red-700",
                      !isToday && !dayIsHoliday && !isWeekend && "text-slate-600",
                      isWeekend && !isToday && !dayIsHoliday && "text-slate-600 font-medium"
                    )}
                  >
                    {isToday && (
                      <div className="absolute inset-0 bg-emerald-600 opacity-10 pointer-events-none" />
                    )}
                    <div className="text-[10px] font-semibold uppercase tracking-wide relative z-10">{format(day, 'EEE', { locale: nb })}</div>
                    <div className={cn("text-sm font-bold mt-0.5 relative z-10", isToday && "text-emerald-700")}>{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable Calendar Body */}
          <div className={cn(isFullscreen ? "flex-1" : "", "overflow-hidden relative")}>
            {/* Today Marker - Vertical Line */}
            {viewDates.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              if (!isToday) return null;
              
              const leftPosition = resourceWidth + (index * dayWidth);
              
              return (
                <div
                  key="today-marker"
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{
                    left: leftPosition,
                    width: dayWidth,
                    background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    borderLeft: '2px solid rgb(16, 185, 129)',
                    borderRight: '2px solid rgb(16, 185, 129)'
                  }}
                />
              );
            })}
            
            <List
              height={isFullscreen ? window.innerHeight - 60 : resources.length * 56}
              itemCount={resources.length}
              itemSize={56}
              width={totalCalendarWidth}
              style={{ overflow: 'hidden' }}
            >
              {Row}
            </List>
          </div>
        </div>
      </div>
    </div>
  );
}