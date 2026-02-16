import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { Users, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Ressursplan() {
  const [showDialog, setShowDialog] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [formData, setFormData] = useState({
    user_email: '',
    user_name: '',
    project_id: '',
    start_date: '',
    end_date: '',
    allocation_percent: 100,
    role: ''
  });

  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      user_email: '',
      user_name: '',
      project_id: '',
      start_date: '',
      end_date: '',
      allocation_percent: 100,
      role: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedUser = allUsers.find(u => u.email === formData.user_email);
    createMutation.mutate({
      ...formData,
      user_name: selectedUser?.full_name || formData.user_email,
      allocation_percent: parseInt(formData.allocation_percent)
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent';
  };

  const getProjectColor = (projectId) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    const index = projects.findIndex(p => p.id === projectId);
    return colors[index % colors.length];
  };

  // Group resources by user
  const userResources = {};
  resources.forEach(r => {
    if (!userResources[r.user_email]) {
      userResources[r.user_email] = {
        name: r.user_name,
        email: r.user_email,
        allocations: []
      };
    }
    userResources[r.user_email].allocations.push(r);
  });

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const isAllocatedOnDay = (allocations, day) => {
    return allocations.filter(a => {
      if (!a.start_date || !a.end_date) return false;
      const start = parseISO(a.start_date);
      const end = parseISO(a.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Ressursplanlegger"
        subtitle="Planlegg og følg opp ressursallokering"
        onAdd={() => setShowDialog(true)}
        addLabel="Ny allokering"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Week Navigation */}
        <Card className="border-0 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-semibold text-slate-900">
                Uke {format(currentWeekStart, 'w', { locale: nb })} - {format(currentWeekStart, 'yyyy')}
              </h2>
              <p className="text-sm text-slate-500">
                {format(currentWeekStart, 'd. MMM', { locale: nb })} - {format(addDays(currentWeekStart, 6), 'd. MMM', { locale: nb })}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Resource Grid */}
        {isLoading ? (
          <Card className="border-0 shadow-sm p-6 animate-pulse">
            <div className="h-64 bg-slate-100 rounded-xl" />
          </Card>
        ) : Object.keys(userResources).length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ingen allokeringer"
            description="Planlegg hvem som skal jobbe på hvilke prosjekter"
            actionLabel="Ny allokering"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-4 font-medium text-slate-600 w-48 sticky left-0 bg-slate-50">
                      Ansatt
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "text-center p-4 font-medium min-w-[100px]",
                          isSameDay(day, new Date()) ? "text-emerald-600 bg-emerald-50" : "text-slate-600"
                        )}
                      >
                        <div className="text-xs uppercase">{format(day, 'EEE', { locale: nb })}</div>
                        <div className="text-lg">{format(day, 'd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(userResources).map((user) => (
                    <tr key={user.email} className="border-t border-slate-100">
                      <td className="p-4 sticky left-0 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-emerald-700">
                              {user.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                          </div>
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dayAllocations = isAllocatedOnDay(user.allocations, day);
                        return (
                          <td
                            key={day.toISOString()}
                            className={cn(
                              "p-2 border-l border-slate-100",
                              isSameDay(day, new Date()) && "bg-emerald-50/50"
                            )}
                          >
                            <div className="space-y-1">
                              {dayAllocations.map((a, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "px-2 py-1 rounded text-xs text-white truncate",
                                    getProjectColor(a.project_id)
                                  )}
                                  title={`${getProjectName(a.project_id)} (${a.allocation_percent}%)`}
                                >
                                  {getProjectName(a.project_id)}
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
        )}

        {/* Legend */}
        {projects.length > 0 && (
          <Card className="border-0 shadow-sm p-4 mt-6">
            <h3 className="font-medium text-slate-900 mb-3">Prosjekter</h3>
            <div className="flex flex-wrap gap-3">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", getProjectColor(project.id))} />
                  <span className="text-sm text-slate-600">{project.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ny allokering</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Ansatt *</Label>
              <Select 
                value={formData.user_email} 
                onValueChange={(v) => setFormData({...formData, user_email: v})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fra dato *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Til dato *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Allokering (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.allocation_percent}
                  onChange={(e) => setFormData({...formData, allocation_percent: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Rolle</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  placeholder="f.eks. Prosjektleder"
                  className="mt-1.5 rounded-xl"
                />
              </div>
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