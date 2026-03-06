import React, { useState, useMemo } from 'react';
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
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import ProjectSelector from '@/components/shared/ProjectSelector';
import LocationAutocomplete from '@/components/shared/LocationAutocomplete';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Building2, Palette } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const EMPLOYEE_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export default function Kalender() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [viewMode, setViewMode] = useState('company'); // 'company' | 'project'
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [activeView, setActiveView] = useState('calendar'); // 'calendar' | 'employees'
  const [employeeColors, setEmployeeColors] = useState({});
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // empty = show all
  const [employeeFilterMode, setEmployeeFilterMode] = useState('all'); // 'all' | 'selection'
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
    queryFn: () => base44.entities.CalendarEvent.list('-start_time'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => base44.entities.Timesheet.list('-date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowDialog(false);
      resetForm();
    },
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
    setFormData({
      ...formData,
      start_time: `${format(day, 'yyyy-MM-dd')}T09:00`,
      end_time: `${format(day, 'yyyy-MM-dd')}T10:00`
    });
    setShowDialog(true);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || '';
  };

  const getEmployeeColor = (employeeId, index) => {
    return employeeColors[employeeId] || EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (viewMode === 'project' && selectedProjectFilter !== 'all') {
      return events.filter(e => e.project_id === selectedProjectFilter);
    }
    return events;
  }, [events, viewMode, selectedProjectFilter]);

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
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
      const empTimesheets = timesheets.filter(t =>
        t.employee_id === emp.id && t.date?.startsWith(monthStr)
      );
      const totalHours = empTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
      const projectIds = [...new Set(empTimesheets.map(t => t.project_id).filter(Boolean))];
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Kalender"
        subtitle={format(currentMonth, 'MMMM yyyy', { locale: nb })}
        onAdd={() => {
          setFormData({
            ...formData,
            start_time: `${format(new Date(), 'yyyy-MM-dd')}T09:00`,
            end_time: `${format(new Date(), 'yyyy-MM-dd')}T10:00`
          });
          setShowDialog(true);
        }}
        addLabel="Ny hendelse"
      />

      <div className="px-6 lg:px-8 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle: calendar vs employees */}
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveView('calendar')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeView === 'calendar'
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              Kalender
            </button>
            <button
              onClick={() => setActiveView('employees')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeView === 'employees'
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Users className="h-4 w-4" />
              Ansatte
            </button>
          </div>

          {activeView === 'calendar' && (
            <>
              {/* Company / Project toggle */}
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setViewMode('company')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'company'
                      ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Hele bedriften
                </button>
                <button
                  onClick={() => setViewMode('project')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'project'
                      ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Per prosjekt
                </button>
              </div>

              {viewMode === 'project' && (
                <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger className="w-52 rounded-xl dark:bg-slate-900 dark:border-slate-700">
                    <SelectValue placeholder="Velg prosjekt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle prosjekter</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>

        {activeView === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-3 border-0 shadow-sm overflow-hidden dark:bg-slate-900">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy', { locale: nb })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((d) => (
                  <div key={d} className="p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "min-h-[100px] p-2 border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors",
                        !isCurrentMonth && "bg-slate-50 dark:bg-slate-950/50",
                        isSelected && "bg-emerald-50 dark:bg-emerald-900/20",
                        isToday(day) && "ring-2 ring-inset ring-emerald-500",
                        "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        !isCurrentMonth && "text-slate-300 dark:text-slate-600",
                        isToday(day) && "text-emerald-600"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded truncate text-white",
                              eventTypeColors[event.event_type] || 'bg-slate-500'
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-slate-500">+{dayEvents.length - 3} mer</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              {/* Day events */}
              <Card className="border-0 shadow-sm dark:bg-slate-900">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {format(selectedDate, 'EEEE d. MMMM', { locale: nb })}
                  </h3>
                </div>
                <div className="p-4">
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Ingen hendelser</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <div className="flex items-start gap-2">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", eventTypeColors[event.event_type] || 'bg-slate-500')} />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                              {event.start_time && (
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(event.start_time), 'HH:mm')}
                                  {event.end_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                </p>
                              )}
                              {event.location && (
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                              {event.project_id && (
                                <p className="text-xs text-emerald-600 mt-2">{getProjectName(event.project_id)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Employee list with checkboxes */}
              <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    Ansatte
                  </h3>
                  {selectedEmployees.length > 0 && (
                    <button
                      onClick={() => setSelectedEmployees([])}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      Nullstill
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-72 p-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Ingen ansatte</p>
                  ) : (
                    <div className="space-y-1">
                      {employees.map((emp, idx) => {
                        const color = employeeColors[emp.id] || EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
                        const isChecked = selectedEmployees.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedEmployees(prev =>
                              prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                            )}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left",
                              isChecked
                                ? "bg-slate-50 dark:bg-slate-800"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                isChecked ? "border-transparent" : "border-slate-300 dark:border-slate-600"
                              )}
                              style={isChecked ? { backgroundColor: color, borderColor: color } : {}}
                            >
                              {isChecked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedEmployees.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedEmployees.length} ansatt(e) valgt — kalender filtreres
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          /* Employee Overview */
          <div className="space-y-4">
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
                    onClick={() => { setEmployeeFilterMode('all'); setSelectedEmployees([]); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      employeeFilterMode === 'all'
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    Alle ansatte
                  </button>
                  <button
                    onClick={() => setEmployeeFilterMode('selection')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      employeeFilterMode === 'selection'
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    Utvalg {employeeFilterMode === 'selection' && selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {employeeFilterMode === 'all' ? employees.length : selectedEmployees.length} ansatte
                </p>
              </div>
            </div>

            {/* Employee selection checkboxes */}
            {employeeFilterMode === 'selection' && (
              <Card className="border-0 shadow-sm dark:bg-slate-900 p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Velg ansatte å vise:</p>
                <div className="flex flex-wrap gap-2">
                  {employees.map((emp, idx) => {
                    const color = employeeColors[emp.id] || EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
                    const isSelected = selectedEmployees.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmployees(prev =>
                          prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        )}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all",
                          isSelected
                            ? "text-white border-transparent"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        )}
                        style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={!isSelected ? { backgroundColor: color, color: 'white' } : {}}
                        >
                          {emp.first_name?.charAt(0)}
                        </span>
                        {emp.first_name} {emp.last_name}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employeeActivity.filter(emp =>
                employeeFilterMode === 'all' || selectedEmployees.length === 0 || selectedEmployees.includes(emp.id)
              ).map((emp) => (
                <Card key={emp.id} className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                  {/* Color bar */}
                  <div className="h-1.5" style={{ backgroundColor: emp.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                          style={{ backgroundColor: emp.color }}
                        >
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
                        title="Velg farge"
                      >
                        <Palette className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>

                    {/* Color picker */}
                    {colorPickerFor === emp.id && (
                      <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Velg farge</p>
                        <div className="flex flex-wrap gap-2">
                          {EMPLOYEE_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                setEmployeeColors(prev => ({ ...prev, [emp.id]: color }));
                                setColorPickerFor(null);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                emp.color === color ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

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
                          style={{ backgroundColor: emp.color }}
                        >
                          {emp.is_active !== false ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {(employeeFilterMode === 'selection' && selectedEmployees.length === 0) && (
                <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>Velg ansatte i filteret over</p>
                </div>
              )}
              {employees.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-500 dark:text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p>Ingen ansatte registrert</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Navn på hendelsen"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({...formData, event_type: v})}>
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
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all_day"
                checked={formData.all_day}
                onCheckedChange={(checked) => setFormData({...formData, all_day: checked})}
              />
              <Label htmlFor="all_day" className="cursor-pointer">Hele dagen</Label>
            </div>
            {!formData.all_day ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Slutt</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            ) : (
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
                  className="mt-1.5 rounded-xl"
                />
              </div>
            )}
            <div>
              <Label>Sted</Label>
              <div className="mt-1.5">
                <LocationAutocomplete
                  value={formData.location}
                  onChange={(v) => setFormData({...formData, location: v})}
                  placeholder="Adresse eller møterom"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detaljer..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}