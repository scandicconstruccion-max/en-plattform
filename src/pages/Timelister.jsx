import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import StatCard from '@/components/shared/StatCard';
import { Clock, Calendar, Building2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Timelister() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    project_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    overtime_hours: '',
    work_type: 'normal',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => base44.entities.Timesheet.list('-date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Timesheet.create({
      ...data,
      user_email: user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      project_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: '',
      overtime_hours: '',
      work_type: 'normal',
      description: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      hours: parseFloat(formData.hours),
      overtime_hours: formData.overtime_hours ? parseFloat(formData.overtime_hours) : 0
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  // Week navigation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Calculate stats
  const myTimesheets = timesheets.filter(t => t.user_email === user?.email);
  const thisWeekTimesheets = myTimesheets.filter(t => {
    const date = new Date(t.date);
    return date >= weekStart && date <= weekEnd;
  });
  const totalHoursThisWeek = thisWeekTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalOvertimeThisWeek = thisWeekTimesheets.reduce((sum, t) => sum + (t.overtime_hours || 0), 0);

  const getHoursForDay = (date) => {
    return myTimesheets
      .filter(t => isSameDay(new Date(t.date), date))
      .reduce((sum, t) => sum + (t.hours || 0), 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Timelister"
        subtitle="Registrer og følg opp arbeidstimer"
        onAdd={() => setShowDialog(true)}
        addLabel="Registrer timer"
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Timer denne uken"
            value={totalHoursThisWeek.toFixed(1)}
            icon={Clock}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            title="Overtid denne uken"
            value={totalOvertimeThisWeek.toFixed(1)}
            icon={Clock}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
          <StatCard
            title="Totalt timer"
            value={myTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1)}
            icon={Clock}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
          />
        </div>

        {/* Week View */}
        <Card className="border-0 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-slate-900">Ukeoversikt</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))}
                className="rounded-xl"
              >
                ← Forrige
              </Button>
              <span className="text-sm text-slate-600 px-3">
                Uke {format(selectedDate, 'w', { locale: nb })} - {format(selectedDate, 'yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))}
                className="rounded-xl"
              >
                Neste →
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const hours = getHoursForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-4 rounded-xl text-center cursor-pointer transition-all ${
                    isToday(day) 
                      ? 'bg-emerald-100 border-2 border-emerald-500' 
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                  onClick={() => {
                    setFormData({ ...formData, date: format(day, 'yyyy-MM-dd') });
                    setShowDialog(true);
                  }}
                >
                  <p className="text-xs text-slate-500 uppercase">
                    {format(day, 'EEE', { locale: nb })}
                  </p>
                  <p className={`text-lg font-semibold mt-1 ${isToday(day) ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {format(day, 'd')}
                  </p>
                  <p className={`text-sm mt-2 font-medium ${hours > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {hours > 0 ? `${hours}t` : '-'}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Timesheets */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Siste registreringer</h2>
          </div>
          {isLoading ? (
            <div className="p-6 animate-pulse space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : myTimesheets.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Ingen timer registrert"
              description="Kom i gang ved å registrere dine første timer"
              actionLabel="Registrer timer"
              onAction={() => setShowDialog(true)}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {myTimesheets.slice(0, 10).map((timesheet) => (
                <div key={timesheet.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{getProjectName(timesheet.project_id)}</p>
                      <p className="text-sm text-slate-500">
                        {timesheet.date && format(new Date(timesheet.date), 'EEEE d. MMMM', { locale: nb })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{timesheet.hours} timer</p>
                    {timesheet.overtime_hours > 0 && (
                      <p className="text-sm text-amber-600">+{timesheet.overtime_hours} overtid</p>
                    )}
                    <StatusBadge status={timesheet.status} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrer timer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Dato *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Timer *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.hours}
                  onChange={(e) => setFormData({...formData, hours: e.target.value})}
                  placeholder="7.5"
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Overtid</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.overtime_hours}
                  onChange={(e) => setFormData({...formData, overtime_hours: e.target.value})}
                  placeholder="0"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Type arbeid</Label>
              <Select 
                value={formData.work_type} 
                onValueChange={(v) => setFormData({...formData, work_type: v})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="overtid">Overtid</SelectItem>
                  <SelectItem value="helg">Helg</SelectItem>
                  <SelectItem value="helligdag">Helligdag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Hva jobbet du med?"
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
                {createMutation.isPending ? 'Lagrer...' : 'Registrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}