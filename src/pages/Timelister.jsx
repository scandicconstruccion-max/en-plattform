import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import WeekView from '@/components/timelister/WeekView';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { format, startOfWeek, addWeeks, getWeek, getYear } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Timelister() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ email: user.email });
      return employees[0];
    },
    enabled: !!user
  });

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const year = getYear(currentWeekStart);

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets', employee?.id, weekNumber, year],
    queryFn: () => base44.entities.Timesheet.filter({
      employee_id: employee.id,
      week_number: weekNumber,
      year: year
    }),
    enabled: !!employee
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !!user
  });

  const submitWeekMutation = useMutation({
    mutationFn: async () => {
      const draftTimesheets = timesheets.filter(t => t.status === 'kladd');
      
      if (draftTimesheets.length === 0) {
        throw new Error('Ingen kladd-timer å sende inn');
      }

      const updates = draftTimesheets.map(t =>
        base44.entities.Timesheet.update(t.id, {
          status: 'sendt_inn',
          submitted_date: new Date().toISOString()
        })
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Uke sendt inn for godkjenning');
      setShowSubmitDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Kunne ikke sende inn uke');
    }
  });

  const weekStats = useMemo(() => {
    const stats = {
      total: 0,
      kladd: 0,
      sendt_inn: 0,
      godkjent: 0,
      avvist: 0
    };

    timesheets.forEach(t => {
      stats.total += t.hours;
      stats[t.status] = (stats[t.status] || 0) + 1;
    });

    return stats;
  }, [timesheets]);

  const canSubmitWeek = useMemo(() => {
    const draftTimesheets = timesheets.filter(t => t.status === 'kladd');
    return draftTimesheets.length > 0 && draftTimesheets.every(t => 
      t.work_description && t.work_description.length >= 10
    );
  }, [timesheets]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-slate-600">Du må være registrert som ansatt for å bruke timelister</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Mine timer"
        subtitle={`Uke ${weekNumber}, ${year}`}
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Week Navigation */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousWeek} className="rounded-xl">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Uke {weekNumber}</p>
                <p className="font-semibold text-slate-900">
                  {format(currentWeekStart, 'd. MMM', { locale: nb })} - {format(addWeeks(currentWeekStart, 1), 'd. MMM yyyy', { locale: nb })}
                </p>
              </div>
              <Button variant="outline" onClick={goToCurrentWeek} size="sm" className="rounded-xl">
                I dag
              </Button>
            </div>

            <Button variant="outline" onClick={goToNextWeek} className="rounded-xl">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Week Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{weekStats.total}</p>
                <p className="text-xs text-slate-600">Timer totalt</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{weekStats.kladd}</Badge>
              <p className="text-xs text-slate-600">Kladd</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{weekStats.sendt_inn}</Badge>
              <p className="text-xs text-slate-600">Sendt inn</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {weekStats.godkjent}
              </Badge>
              <p className="text-xs text-slate-600">Godkjent</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                <XCircle className="h-3 w-3 mr-1" />
                {weekStats.avvist}
              </Badge>
              <p className="text-xs text-slate-600">Avvist</p>
            </div>
          </Card>
        </div>

        {/* Week View */}
        <WeekView
          weekStart={currentWeekStart}
          weekNumber={weekNumber}
          year={year}
          employee={employee}
          timesheets={timesheets}
          projects={projects}
          isLoading={isLoading}
        />

        {/* Submit Week */}
        {weekStats.kladd > 0 && (
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-emerald-900">Klar til å sende inn?</p>
                <p className="text-sm text-emerald-700">
                  {weekStats.kladd} {weekStats.kladd === 1 ? 'timeføring' : 'timeføringer'} venter på innsending
                </p>
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={!canSubmitWeek}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
              >
                <Send className="h-4 w-4" />
                Send inn uke
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send inn uke {weekNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil sende alle kladd-timer til godkjenning. Du kan ikke redigere timene etter innsending.
              <br /><br />
              <strong>Totalt: {weekStats.total} timer</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submitWeekMutation.mutate()}
              disabled={submitWeekMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitWeekMutation.isPending ? 'Sender inn...' : 'Send inn'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}