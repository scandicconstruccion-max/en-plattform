import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimesheetForm from './TimesheetForm';
import { Plus, Copy } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function WeekView({ weekStart, weekNumber, year, employee, timesheets, projects, isLoading }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [timesheetToEdit, setTimesheetToEdit] = useState(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTimesheetsForDay = (date) => {
    return timesheets.filter(t => isSameDay(new Date(t.date), date));
  };

  const getDayTotal = (date) => {
    const dayTimesheets = getTimesheetsForDay(date);
    return dayTimesheets.reduce((sum, t) => sum + t.hours, 0);
  };

  const handleCopyPreviousDay = (date) => {
    const previousDate = addDays(date, -1);
    const previousTimesheets = getTimesheetsForDay(previousDate);
    
    if (previousTimesheets.length > 0) {
      setSelectedDay({
        date,
        copyFrom: previousTimesheets[0]
      });
    }
  };

  const isToday = (date) => isSameDay(date, new Date());
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((date) => {
          const dayTimesheets = getTimesheetsForDay(date);
          const dayTotal = getDayTotal(date);
          const isRest = isWeekend(date);
          const today = isToday(date);

          return (
            <Card
              key={date.toISOString()}
              className={cn(
                "p-4 transition-all hover:shadow-md",
                isRest && "bg-slate-50",
                today && "ring-2 ring-emerald-500"
              )}
            >
              <div className="mb-3">
                <p className={cn(
                  "text-sm font-medium",
                  today ? "text-emerald-600" : "text-slate-900"
                )}>
                  {format(date, 'EEEE', { locale: nb })}
                </p>
                <p className="text-xs text-slate-600">
                  {format(date, 'd. MMM', { locale: nb })}
                </p>
              </div>

              <div className="space-y-2 mb-3 min-h-[100px]">
                {dayTimesheets.map((timesheet) => (
                  <button
                    key={timesheet.id}
                    onClick={() => {
                      if (timesheet.status === 'kladd') {
                        setTimesheetToEdit(timesheet);
                      }
                    }}
                    disabled={timesheet.status !== 'kladd'}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-all",
                      timesheet.status === 'kladd' && "bg-slate-100 hover:bg-slate-200 cursor-pointer",
                      timesheet.status === 'sendt_inn' && "bg-blue-50 border border-blue-200",
                      timesheet.status === 'godkjent' && "bg-green-50 border border-green-200",
                      timesheet.status === 'avvist' && "bg-red-50 border border-red-200"
                    )}
                  >
                    <p className="font-medium text-slate-900 truncate">{timesheet.project_name}</p>
                    <p className="text-slate-600 truncate">{timesheet.work_category?.replace('_', ' ')}</p>
                    <p className="font-semibold text-emerald-600 mt-1">{timesheet.hours}t</p>
                  </button>
                ))}
              </div>

              {dayTotal > 0 && (
                <div className="mb-2 pb-2 border-t pt-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Total: {dayTotal}t
                  </p>
                  {dayTotal > 9 && (
                    <p className="text-xs text-orange-600">⚠️ Over 9 timer</p>
                  )}
                </div>
              )}

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDay({ date })}
                  className="flex-1 rounded-lg text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Legg til
                </Button>
                {getTimesheetsForDay(addDays(date, -1)).length > 0 && !dayTimesheets.length && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyPreviousDay(date)}
                    className="rounded-lg"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Timesheet Form Dialog */}
      <TimesheetForm
        open={!!(selectedDay || timesheetToEdit)}
        onClose={() => {
          setSelectedDay(null);
          setTimesheetToEdit(null);
        }}
        date={selectedDay?.date || (timesheetToEdit && new Date(timesheetToEdit.date))}
        weekNumber={weekNumber}
        year={year}
        employee={employee}
        projects={projects}
        timesheet={timesheetToEdit}
        copyFrom={selectedDay?.copyFrom}
      />
    </>
  );
}