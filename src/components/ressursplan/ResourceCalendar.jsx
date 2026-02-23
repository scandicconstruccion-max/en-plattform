import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Grid3x3 } from 'lucide-react';
import { format, startOfWeek, startOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isWithinInterval, parseISO, endOfWeek, endOfMonth, eachDayOfInterval } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ResourceCalendar({ 
  assignments, 
  resources, 
  projects,
  viewMode = 'week',
  onAssignmentDrop,
  onAssignmentClick,
  canEdit
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getViewDates = () => {
    if (viewMode === 'day') {
      return [currentDate];
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  };

  const navigate = (direction) => {
    if (viewMode === 'day') {
      setCurrentDate(direction > 0 ? addDays(currentDate, 1) : addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const getProjectColor = (projectId) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    const index = projects.findIndex(p => p.id === projectId);
    return colors[index % colors.length];
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent';
  };

  const getAssignmentsForResourceAndDay = (resourceId, day) => {
    return assignments.filter(a => {
      if (a.resource_id !== resourceId) return false;
      if (!a.start_dato_tid || !a.slutt_dato_tid) return false;
      const start = parseISO(a.start_dato_tid);
      const end = parseISO(a.slutt_dato_tid);
      return isWithinInterval(day, { start, end });
    });
  };

  const getCapacityColor = (resourceId, dates) => {
    let totalBooked = 0;
    dates.forEach(day => {
      const dayAssignments = getAssignmentsForResourceAndDay(resourceId, day);
      if (dayAssignments.length > 0) totalBooked++;
    });
    
    const percentage = (totalBooked / dates.length) * 100;
    if (percentage === 0) return 'bg-green-100 text-green-700';
    if (percentage < 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleDragStart = (e, assignment) => {
    if (!canEdit) return;
    e.dataTransfer.setData('assignment', JSON.stringify(assignment));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, resourceId, day) => {
    if (!canEdit) return;
    e.preventDefault();
    const assignment = JSON.parse(e.dataTransfer.getData('assignment'));
    
    // Calculate time difference and update assignment times
    const originalStart = parseISO(assignment.start_dato_tid);
    const timeDiff = day.getTime() - new Date(originalStart.getFullYear(), originalStart.getMonth(), originalStart.getDate()).getTime();
    
    const newStart = new Date(originalStart.getTime() + timeDiff);
    const originalEnd = parseISO(assignment.slutt_dato_tid);
    const newEnd = new Date(originalEnd.getTime() + timeDiff);
    
    onAssignmentDrop(assignment, resourceId, newStart.toISOString(), newEnd.toISOString());
  };

  const handleDragOver = (e) => {
    if (!canEdit) return;
    e.preventDefault();
  };

  const viewDates = getViewDates();

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
              {viewMode === 'week' && `Uke ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'w', { locale: nb })} - ${format(currentDate, 'yyyy')}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: nb })}
            </h2>
            {viewMode === 'week' && (
              <p className="text-sm text-slate-500">
                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM', { locale: nb })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM', { locale: nb })}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            className="rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 font-medium text-slate-600 w-48 sticky left-0 bg-slate-50 z-10">
                  Ressurs
                </th>
                {viewDates.map((day) => (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      "text-center p-4 font-medium min-w-[120px]",
                      isSameDay(day, new Date()) ? "text-emerald-600 bg-emerald-50" : "text-slate-600"
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
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id} className="border-t border-slate-100">
                  <td className="p-4 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-emerald-700">
                          {resource.navn?.charAt(0) || 'R'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{resource.navn}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {resource.type === 'employee' ? resource.stilling : resource.rolle}
                        </p>
                      </div>
                      <div className={cn(
                        "ml-auto px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                        getCapacityColor(resource.id, viewDates)
                      )}>
                        {(() => {
                          let totalBooked = 0;
                          viewDates.forEach(day => {
                            const dayAssignments = getAssignmentsForResourceAndDay(resource.id, day);
                            if (dayAssignments.length > 0) totalBooked++;
                          });
                          const percentage = Math.round((totalBooked / viewDates.length) * 100);
                          return `${percentage}%`;
                        })()}
                      </div>
                    </div>
                  </td>
                  {viewDates.map((day) => {
                    const dayAssignments = getAssignmentsForResourceAndDay(resource.id, day);
                    return (
                      <td
                        key={day.toISOString()}
                        className={cn(
                          "p-2 border-l border-slate-100",
                          isSameDay(day, new Date()) && "bg-emerald-50/50"
                        )}
                        onDrop={(e) => handleDrop(e, resource.id, day)}
                        onDragOver={handleDragOver}
                      >
                        <div className="space-y-1 min-h-[40px]">
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              draggable={canEdit}
                              onDragStart={(e) => handleDragStart(e, assignment)}
                              onClick={() => onAssignmentClick(assignment)}
                              onMouseEnter={(e) => {
                                e.currentTarget.dataset.showTooltip = 'true';
                                setTimeout(() => {
                                  if (e.currentTarget.dataset.showTooltip === 'true') {
                                    onAssignmentClick(assignment);
                                  }
                                }, 800);
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.dataset.showTooltip = 'false';
                              }}
                              className={cn(
                                "px-2 py-1.5 rounded text-xs text-white truncate cursor-pointer hover:opacity-90 hover:shadow-lg transition-all",
                                getProjectColor(assignment.prosjekt_id),
                                canEdit && "cursor-move"
                              )}
                              title={`${getProjectName(assignment.prosjekt_id)} - ${assignment.rolle_pa_prosjekt || ''}`}
                            >
                              {getProjectName(assignment.prosjekt_id)}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}