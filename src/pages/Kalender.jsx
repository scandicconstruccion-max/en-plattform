import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Kalender() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
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

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_time'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
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
    return events.filter(event => {
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

  const eventTypeLabels = {
    mote: 'Møte',
    befaring: 'Befaring',
    frist: 'Frist',
    annet: 'Annet'
  };

  // Events for selected date
  const selectedDateEvents = getEventsForDay(selectedDate);

  return (
    <div className="min-h-screen bg-slate-50">
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

      <div className="px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-3 border-0 shadow-sm overflow-hidden">
            {/* Month Navigation */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold text-slate-900">
                {format(currentMonth, 'MMMM yyyy', { locale: nb })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-slate-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
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
                      "min-h-[100px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors",
                      !isCurrentMonth && "bg-slate-50",
                      isSelected && "bg-emerald-50",
                      isToday(day) && "ring-2 ring-inset ring-emerald-500",
                      "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      !isCurrentMonth && "text-slate-300",
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
                        <div className="text-xs text-slate-500">
                          +{dayEvents.length - 3} mer
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Sidebar - Selected Date Events */}
          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">
                {format(selectedDate, 'EEEE d. MMMM', { locale: nb })}
              </h3>
            </div>
            <div className="p-4">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Ingen hendelser</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-xl bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5",
                          eventTypeColors[event.event_type] || 'bg-slate-500'
                        )} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{event.title}</p>
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
                            <p className="text-xs text-emerald-600 mt-2">
                              {getProjectName(event.project_id)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
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
              <Select 
                value={formData.event_type} 
                onValueChange={(v) => setFormData({...formData, event_type: v})}
              >
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
            {!formData.all_day && (
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
            )}
            {formData.all_day && (
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