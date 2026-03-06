import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import ProjectSelector from '@/components/shared/ProjectSelector';
import LocationAutocomplete from '@/components/shared/LocationAutocomplete';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Building2, Palette, Settings } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears,
  isSameMonth, isSameDay, isToday, parseISO, startOfYear, endOfYear,
  getWeek, startOfDay, endOfDay, isSameWeek, isSameYear, getYear } from
'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const EMPLOYEE_COLORS = [
'#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
'#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];


export default function Kalender() {
  const [currentDate, setCurrentDate] = useState(new Date()); // anchor date for all views
  const [currentMonth, setCurrentMonth] = useState(new Date()); // kept for compatibility
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [calendarView, setCalendarView] = useState('month'); // 'day' | 'week' | 'month' | 'year'
  const [viewMode, setViewMode] = useState('company'); // 'company' | 'project'
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [activeView, setActiveView] = useState('calendar'); // 'calendar' | 'employees'
  const [employeeColors, setEmployeeColors] = useState({});
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(null); // null = not yet initialized
  const [employeeFilterMode, setEmployeeFilterMode] = useState('all'); // 'all' | 'selection'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dayStartHour, setDayStartHour] = useState(7); // default start at 07:00
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    start_time: '',
    end_time: '',
    all_day: false,
    event_type: 'mote',
    location: ''
  });

  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_time')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  useEffect(() => {
    if (selectedEmployees === null && employees.length > 0) {
      setSelectedEmployees(employees.map((e) => e.id));
    }
  }, [employees]);

  // Derive the effective list (once employees are loaded)
  const effectiveSelectedEmployees = selectedEmployees === null ? employees.map((e) => e.id) : selectedEmployees;

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => base44.entities.Timesheet.list('-date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      start_time: '',
      end_time: '',
      all_day: false,
      event_type: 'mote',
      location: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setCurrentDate(day);
    setCurrentMonth(day);
    setFormData({
      ...formData,
      start_time: `${format(day, 'yyyy-MM-dd')}T09:00`,
      end_time: `${format(day, 'yyyy-MM-dd')}T10:00`
    });
    setShowDialog(true);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const navigatePrev = () => {
    if (calendarView === 'day') {setCurrentDate((d) => addDays(d, -1));setCurrentMonth((d) => addDays(d, -1));} else
    if (calendarView === 'week') {setCurrentDate((d) => subWeeks(d, 1));setCurrentMonth((d) => subWeeks(d, 1));} else
    if (calendarView === 'month') {setCurrentDate((d) => subMonths(d, 1));setCurrentMonth((d) => subMonths(d, 1));} else
    if (calendarView === 'year') {setCurrentDate((d) => subYears(d, 1));setCurrentMonth((d) => subYears(d, 1));}
  };

  const navigateNext = () => {
    if (calendarView === 'day') {setCurrentDate((d) => addDays(d, 1));setCurrentMonth((d) => addDays(d, 1));} else
    if (calendarView === 'week') {setCurrentDate((d) => addWeeks(d, 1));setCurrentMonth((d) => addWeeks(d, 1));} else
    if (calendarView === 'month') {setCurrentDate((d) => addMonths(d, 1));setCurrentMonth((d) => addMonths(d, 1));} else
    if (calendarView === 'year') {setCurrentDate((d) => addYears(d, 1));setCurrentMonth((d) => addYears(d, 1));}
  };

  const getPeriodLabel = () => {
    if (calendarView === 'day') return format(currentDate, 'EEEE d. MMMM yyyy', { locale: nb });
    if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `Uke ${getWeek(currentDate, { weekStartsOn: 1 })} · ${format(weekStart, 'd. MMM', { locale: nb })} – ${format(weekEnd, 'd. MMM yyyy', { locale: nb })}`;
    }
    if (calendarView === 'month') return format(currentDate, 'MMMM yyyy', { locale: nb });
    if (calendarView === 'year') return format(currentDate, 'yyyy');
    return '';
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || '';
  };

  const getEmployeeColor = (employeeId, index) => {
    return employeeColors[employeeId] || EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = events;
    if (viewMode === 'project' && selectedProjectFilter !== 'all') {
      result = result.filter((e) => e.project_id === selectedProjectFilter);
    }
    // Filter by selected employees (attendees)
    const effSelected = selectedEmployees === null ? employees.map((e) => e.id) : selectedEmployees;
    if (effSelected.length > 0 && effSelected.length < employees.length) {
      result = result.filter((e) => {
        if (!e.attendees || e.attendees.length === 0) return true;
        const empEmails = employees.
        filter((emp) => effSelected.includes(emp.id)).
        map((emp) => emp.email);
        return e.attendees.some((a) => empEmails.includes(a));
      });
    }
    return result;
  }, [events, viewMode, selectedProjectFilter, selectedEmployees, employees]);

  // Calendar generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Year view months
  const yearMonths = Array.from({ length: 12 }, (_, i) => new Date(getYear(currentDate), i, 1));

  const getEventsForDay = (day) => {
    return filteredEvents.filter((event) => {
      if (!event.start_time) return false;
      return isSameDay(parseISO(event.start_time), day);
    });
  };

  const eventTypeColors = {
    mote: 'bg-blue-500',
    befaring: 'bg-emerald-500',
    frist: 'bg-red-500',
    annet: 'bg-purple-500'
  };

  const selectedDateEvents = getEventsForDay(selectedDate);

  // Employee activity this month
  const employeeActivity = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    return employees.map((emp, idx) => {
      const empTimesheets = timesheets.filter((t) =>
      t.employee_id === emp.id && t.date?.startsWith(monthStr)
      );
      const totalHours = empTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
      const projectIds = [...new Set(empTimesheets.map((t) => t.project_id).filter(Boolean))];
      return {
        ...emp,
        totalHours,
        projectCount: projectIds.length,
        color: getEmployeeColor(emp.id, idx),
        index: idx
      };
    });
  }, [employees, timesheets, currentMonth, employeeColors]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header with all controls */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Kalender</h1>

          {/* View toggle: calendar vs employees */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            











            











          </div>

          {activeView === 'calendar' &&
          <>
              {/* Today button + nav + period label */}
              <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl text-sm font-medium">
                I dag
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={navigatePrev} className="rounded-xl h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[180px] text-center">
                  {getPeriodLabel()}
                </span>
                <Button variant="ghost" size="icon" onClick={navigateNext} className="rounded-xl h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar view selector */}
              <Select value={calendarView} onValueChange={setCalendarView}>
                <SelectTrigger className="w-32 rounded-xl dark:bg-slate-800 dark:border-slate-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dag</SelectItem>
                  <SelectItem value="week">Uke</SelectItem>
                  <SelectItem value="month">Måned</SelectItem>
                  <SelectItem value="year">År</SelectItem>
                </SelectContent>
              </Select>

              {/* Company / Project toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                











                <button
                onClick={() => setViewMode('project')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  viewMode === 'project' ?
                  "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" :
                  "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}>

                  <CalendarIcon className="h-4 w-4" />
                  Per prosjekt
                </button>
              </div>

              {viewMode === 'project' &&
            <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger className="w-52 rounded-xl dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Velg prosjekt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle prosjekter</SelectItem>
                    {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                )}
                  </SelectContent>
                </Select>
            }
            </>
          }
        </div>

        <div className="flex items-center gap-2">
          {/* Time settings gear - only for day/week view */}
          {activeView === 'calendar' && (calendarView === 'day' || calendarView === 'week') && (
            <div className="relative">
              <button
                onClick={() => setShowTimeSettings(!showTimeSettings)}
                className={cn(
                  "h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors",
                  showTimeSettings ? "bg-slate-100 dark:bg-slate-700" : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
                title="Tidsinnstillinger"
              >
                <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
              {showTimeSettings && (
                <div className="absolute right-0 top-11 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 w-64">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Tidsinnstillinger</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Kalenderdag starter fra</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setDayStartHour(0); setShowTimeSettings(false); }}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                            dayStartHour === 0 ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >00:00 – 12:00</button>
                        <button
                          onClick={() => { setDayStartHour(12); setShowTimeSettings(false); }}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                            dayStartHour === 12 ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >12:00 – 24:00</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Eller velg starttime manuelt</label>
                      <Select value={String(dayStartHour)} onValueChange={(v) => { setDayStartHour(Number(v)); setShowTimeSettings(false); }}>
                        <SelectTrigger className="rounded-xl h-8 text-sm dark:bg-slate-700 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 25 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{String(i).padStart(2,'0')}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button
            onClick={() => {
              setFormData({
                ...formData,
                start_time: `${format(new Date(), 'yyyy-MM-dd')}T09:00`,
                end_time: `${format(new Date(), 'yyyy-MM-dd')}T10:00`
              });
              setShowDialog(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
            <span className="text-lg leading-none">+</span>
            Ny hendelse
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 lg:px-8 py-4 flex flex-col gap-3">
        {activeView === 'calendar' ?
        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Calendar */}
            <Card className="flex-1 border-0 shadow-sm overflow-hidden dark:bg-slate-900 flex flex-col min-h-0">

              {/* DAY VIEW */}
              {calendarView === 'day' &&
            <div className="flex-1 overflow-auto">
                  {/* Day header */}
                  <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex">
                    <div className="w-16 flex-shrink-0" />
                    <div className={cn("flex-1 p-3 text-center border-l border-slate-100 dark:border-slate-800", isToday(currentDate) && "bg-emerald-50 dark:bg-emerald-900/20")}>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{format(currentDate, 'EEE', { locale: nb })}</p>
                      <p className={cn("text-2xl font-bold", isToday(currentDate) ? "text-emerald-600" : "text-slate-900 dark:text-white")}>{format(currentDate, 'd')}</p>
                    </div>
                  </div>
                  {/* Hourly grid */}
                  <div className="flex">
                    <div className="w-16 flex-shrink-0">
                      {Array.from({ length: 12 }, (_, i) => dayStartHour + i).map((hour) => (
                        <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-start justify-end pr-2 pt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">{String(hour % 24).padStart(2,'0')}:00</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 border-l border-slate-100 dark:border-slate-800 relative">
                      {Array.from({ length: 12 }, (_, i) => dayStartHour + i).map((hour) => {
                        const hourEvents = getEventsForDay(currentDate).filter((ev) => {
                          if (!ev.start_time) return false;
                          const h = parseISO(ev.start_time).getHours();
                          return h === (hour % 24);
                        });
                        return (
                          <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-800 relative hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            {hourEvents.map((ev, i) => (
                              <div key={ev.id} className={cn("absolute left-1 right-1 top-0.5 px-2 py-1 rounded-lg text-white text-xs truncate", eventTypeColors[ev.event_type]?.replace('bg-','bg-') || 'bg-slate-500')} style={{ top: `${i * 22}px` }}>
                                <span className="font-medium">{format(parseISO(ev.start_time), 'HH:mm')} </span>{ev.title}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            }

              {/* WEEK VIEW */}
              {calendarView === 'week' &&
            <div className="flex-1 overflow-auto flex flex-col">
                  {/* Week header */}
                  <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-shrink-0">
                    <div className="w-16 flex-shrink-0" />
                    {weekDays.map((d) =>
                  <div
                    key={d.toString()}
                    onClick={() => handleDateClick(d)}
                    className={cn(
                      "flex-1 p-2 text-center cursor-pointer border-l border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                      isToday(d) && "bg-emerald-50 dark:bg-emerald-900/20"
                    )}>

                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{format(d, 'EEE', { locale: nb })}</p>
                          <p className={cn("text-lg font-bold mt-0.5", isToday(d) ? "text-emerald-600" : "text-slate-900 dark:text-white")}>{format(d, 'd')}</p>
                        </div>
                  )}
                  </div>
                  {/* Hourly grid */}
                  <div className="flex flex-1">
                    <div className="w-16 flex-shrink-0">
                      {Array.from({ length: 12 }, (_, i) => dayStartHour + i).map((hour) => (
                        <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-start justify-end pr-2 pt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">{String(hour % 24).padStart(2,'0')}:00</span>
                        </div>
                      ))}
                    </div>
                    {weekDays.map((d) => (
                      <div key={d.toString()} className={cn("flex-1 border-l border-slate-100 dark:border-slate-800", isToday(d) && "bg-emerald-50/30 dark:bg-emerald-900/10")}>
                        {Array.from({ length: 12 }, (_, i) => dayStartHour + i).map((hour) => {
                          const hourEvents = getEventsForDay(d).filter((ev) => {
                            if (!ev.start_time) return false;
                            return parseISO(ev.start_time).getHours() === (hour % 24);
                          });
                          return (
                            <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-800 relative hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors px-0.5">
                              {hourEvents.map((ev, i) => (
                                <div key={ev.id} className={cn("absolute left-0.5 right-0.5 px-1 py-0.5 rounded text-white text-[10px] truncate leading-tight", eventTypeColors[ev.event_type] || 'bg-slate-500')} style={{ top: `${2 + i * 20}px` }}>
                                  {ev.title}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
            }

              {/* MONTH VIEW */}
              {calendarView === 'month' &&
            <>
                  <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                    {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((d) =>
                <div key={d} className="p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{d}</div>
                )}
                  </div>
                  <div className="grid grid-cols-7 flex-1 overflow-auto">
                    {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "min-h-[80px] p-2 border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors",
                        !isCurrentMonth && "bg-slate-50 dark:bg-slate-950/50",
                        isSelected && "bg-emerald-50 dark:bg-emerald-900/20",
                        isToday(day) && "ring-2 ring-inset ring-emerald-500",
                        "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}>

                          <div className={cn("text-sm font-medium mb-1", !isCurrentMonth && "text-slate-300 dark:text-slate-600", isToday(day) && "text-emerald-600")}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event, i) =>
                        <div key={i} className={cn("text-xs px-1.5 py-0.5 rounded truncate text-white", eventTypeColors[event.event_type] || 'bg-slate-500')}>
                                {event.title}
                              </div>
                        )}
                            {dayEvents.length > 3 && <div className="text-xs text-slate-500">+{dayEvents.length - 3} mer</div>}
                          </div>
                        </div>);

                })}
                  </div>
                </>
            }

              {/* YEAR VIEW */}
              {calendarView === 'year' &&
            <div className="flex-1 overflow-auto p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {yearMonths.map((monthDate, mi) => {
                  const mStart = startOfMonth(monthDate);
                  const mEnd = endOfMonth(monthDate);
                  const mCalStart = startOfWeek(mStart, { weekStartsOn: 1 });
                  const mCalEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
                  const mDays = [];
                  let md = mCalStart;
                  while (md <= mCalEnd) {mDays.push(md);md = addDays(md, 1);}
                  const monthEvents = filteredEvents.filter((e) => e.start_time && isSameMonth(parseISO(e.start_time), monthDate));
                  return (
                    <div key={mi} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => {setCalendarView('month');setCurrentDate(monthDate);setCurrentMonth(monthDate);}}>
                          <p className={cn("text-sm font-semibold mb-2 capitalize", isSameMonth(monthDate, new Date()) && "text-emerald-600")}>
                            {format(monthDate, 'MMMM', { locale: nb })}
                          </p>
                          <div className="grid grid-cols-7 gap-px">
                            {mDays.map((d, i) =>
                        <div key={i} className={cn(
                          "aspect-square flex items-center justify-center text-[10px] rounded",
                          !isSameMonth(d, monthDate) && "opacity-0",
                          isToday(d) && "bg-emerald-500 text-white font-bold",
                          getEventsForDay(d).length > 0 && !isToday(d) && "bg-blue-100 dark:bg-blue-900/40 font-medium"
                        )}>
                                {isSameMonth(d, monthDate) ? format(d, 'd') : ''}
                              </div>
                        )}
                          </div>
                          {monthEvents.length > 0 &&
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{monthEvents.length} hendelse{monthEvents.length !== 1 ? 'r' : ''}</p>
                      }
                        </div>);

                })}
                  </div>
                </div>
            }
            </Card>

            {/* Sidebar */}
            <div className={cn(
              "flex-col gap-3 overflow-y-auto min-h-0 relative transition-all duration-300",
              sidebarCollapsed ? "hidden" : "flex w-72 flex-shrink-0"
            )}>
              {/* Collapse toggle button */}
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="absolute -left-3 top-6 z-10 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title="Skjul sidepanel"
              >
                <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
              {/* Day events */}
              <Card className="border-0 shadow-sm dark:bg-slate-900">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {format(selectedDate, 'EEEE d. MMMM', { locale: nb })}
                  </h3>
                </div>
                <div className="p-4">
                  {selectedDateEvents.length === 0 ?
                <div className="text-center py-6 text-slate-500">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Ingen hendelser</p>
                    </div> :

                <div className="space-y-3">
                      {selectedDateEvents.map((event) =>
                  <div key={event.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <div className="flex items-start gap-2">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", eventTypeColors[event.event_type] || 'bg-slate-500')} />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                              {event.start_time &&
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(event.start_time), 'HH:mm')}
                                  {event.end_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                </p>
                        }
                              {event.location &&
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                        }
                              {event.project_id &&
                        <p className="text-xs text-emerald-600 mt-2">{getProjectName(event.project_id)}</p>
                        }
                            </div>
                          </div>
                        </div>
                  )}
                    </div>
                }
                </div>
              </Card>

              {/* Employee list with checkboxes */}
              <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    Ansatte
                  </h3>
                  <button
                  onClick={() =>
                  effectiveSelectedEmployees.length === employees.length ?
                  setSelectedEmployees([]) :
                  setSelectedEmployees(employees.map((e) => e.id))
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">

                    <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      effectiveSelectedEmployees.length === employees.length ?
                      "bg-emerald-600 border-emerald-600" :
                      "border-slate-300 dark:border-slate-600"
                    )}>

                      {effectiveSelectedEmployees.length === employees.length &&
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    }
                    </div>
                    Vis alle
                  </button>
                </div>
                <div className="overflow-y-auto max-h-72 p-2">
                  {employees.length === 0 ?
                <p className="text-sm text-slate-400 text-center py-4">Ingen ansatte</p> :

                <div className="space-y-1">
                      {employees.map((emp, idx) => {
                    const color = employeeColors[emp.id] || EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
                    const isChecked = effectiveSelectedEmployees.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmployees(
                          effectiveSelectedEmployees.includes(emp.id) ?
                          effectiveSelectedEmployees.filter((id) => id !== emp.id) :
                          [...effectiveSelectedEmployees, emp.id]
                        )}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left",
                          isChecked ?
                          "bg-slate-50 dark:bg-slate-800" :
                          "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}>

                            <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            isChecked ? "border-transparent" : "border-slate-300 dark:border-slate-600"
                          )}
                          style={isChecked ? { backgroundColor: color, borderColor: color } : {}}>

                              {isChecked &&
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                          }
                            </div>
                            <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: color }}>

                              {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </button>);

                  })}
                    </div>
                }
                </div>
                {effectiveSelectedEmployees.length < employees.length &&
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {effectiveSelectedEmployees.length} av {employees.length} ansatte vist
                    </p>
                  </div>
              }
              </Card>
            </div>

            {/* Expand button when sidebar is collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex-shrink-0 self-start mt-6 -mr-3 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title="Vis sidepanel"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            )}
          </div> : (

        /* Employee Overview */
        <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold text-slate-900 dark:text-white text-lg">
                  {format(currentMonth, 'MMMM yyyy', { locale: nb })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1">
                  <button
                  onClick={() => {setEmployeeFilterMode('all');setSelectedEmployees([]);}}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    employeeFilterMode === 'all' ?
                    "bg-emerald-600 text-white" :
                    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}>

                    Alle ansatte
                  </button>
                  <button
                  onClick={() => setEmployeeFilterMode('selection')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    employeeFilterMode === 'selection' ?
                    "bg-emerald-600 text-white" :
                    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}>

                    Utvalg {employeeFilterMode === 'selection' && selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {employeeFilterMode === 'all' ? employees.length : selectedEmployees.length} ansatte
                </p>
              </div>
            </div>

            {/* Employee selection checkboxes */}
            {employeeFilterMode === 'selection' &&
          <Card className="border-0 shadow-sm dark:bg-slate-900 p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Velg ansatte å vise:</p>
                <div className="flex flex-wrap gap-2">
                  {employees.map((emp, idx) => {
                const color = employeeColors[emp.id] || EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
                const isSelected = selectedEmployees.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployees((prev) =>
                    prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                    )}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all",
                      isSelected ?
                      "text-white border-transparent" :
                      "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}>

                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={!isSelected ? { backgroundColor: color, color: 'white' } : {}}>

                          {emp.first_name?.charAt(0)}
                        </span>
                        {emp.first_name} {emp.last_name}
                      </button>);

              })}
                </div>
              </Card>
          }

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employeeActivity.filter((emp) =>
            employeeFilterMode === 'all' || selectedEmployees.length === 0 || selectedEmployees.includes(emp.id)
            ).map((emp) =>
            <Card key={emp.id} className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                  {/* Color bar */}
                  <div className="h-1.5" style={{ backgroundColor: emp.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: emp.color }}>

                          {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position || emp.department || 'Ansatt'}</p>
                        </div>
                      </div>
                      <button
                    onClick={() => setColorPickerFor(colorPickerFor === emp.id ? null : emp.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Velg farge">

                        <Palette className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>

                    {/* Color picker */}
                    {colorPickerFor === emp.id &&
                <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Velg farge</p>
                        <div className="flex flex-wrap gap-2">
                          {EMPLOYEE_COLORS.map((color) =>
                    <button
                      key={color}
                      onClick={() => {
                        setEmployeeColors((prev) => ({ ...prev, [emp.id]: color }));
                        setColorPickerFor(null);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                        emp.color === color ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }} />

                    )}
                        </div>
                      </div>
                }

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{emp.totalHours.toFixed(0)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Timer</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{emp.projectCount}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Prosjekter</p>
                      </div>
                      <div className="text-center">
                        <Badge
                      className="text-white text-xs"
                      style={{ backgroundColor: emp.color }}>

                          {emp.is_active !== false ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
            )}

              {employeeFilterMode === 'selection' && selectedEmployees.length === 0 &&
            <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>Velg ansatte i filteret over</p>
                </div>
            }
              {employees.length === 0 &&
            <div className="col-span-full text-center py-16 text-slate-500 dark:text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p>Ingen ansatte registrert</p>
                </div>
            }
            </div>
          </div>)
        }

        {/* Create Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Ny hendelse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Navn på hendelsen"
                  required
                  className="mt-1.5 rounded-xl" />

            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mote">Møte</SelectItem>
                  <SelectItem value="befaring">Befaring</SelectItem>
                  <SelectItem value="frist">Frist</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prosjekt</Label>
              <ProjectSelector
                  value={formData.project_id}
                  onChange={(v) => setFormData({ ...formData, project_id: v })}
                  className="mt-1.5 rounded-xl" />

            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                  id="all_day"
                  checked={formData.all_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })} />

              <Label htmlFor="all_day" className="cursor-pointer">Hele dagen</Label>
            </div>
            {!formData.all_day ?
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="mt-1.5 rounded-xl" />

                </div>
                <div>
                  <Label>Slutt</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="mt-1.5 rounded-xl" />

                </div>
              </div> :

              <div>
                <Label>Dato *</Label>
                <Input
                  type="date"
                  value={formData.start_time?.split('T')[0] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    start_time: `${e.target.value}T00:00`,
                    end_time: `${e.target.value}T23:59`
                  })}
                  required
                  className="mt-1.5 rounded-xl" />

              </div>
              }
            <div>
              <Label>Sted</Label>
              <div className="mt-1.5">
                <LocationAutocomplete
                    value={formData.location}
                    onChange={(v) => setFormData({ ...formData, location: v })}
                    placeholder="Adresse eller møterom"
                    className="rounded-xl" />

              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detaljer..."
                  rows={2}
                  className="mt-1.5 rounded-xl" />

            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

                {createMutation.isPending ? 'Lagrer...' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
        </Dialog>
      </div>
    </div>);

}