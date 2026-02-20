import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { formatAmount } from '@/components/shared/formatNumber';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Lock, FileSpreadsheet, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Lonnsgrunnlag() {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ['payrollRuns'],
    queryFn: () => base44.entities.PayrollRun.list('-created_date')
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true })
  });

  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!periodStart || !periodEnd) {
        throw new Error('Velg periode');
      }

      // Hent alle godkjente timer i perioden
      const timesheets = await base44.entities.Timesheet.filter({
        status: 'godkjent',
        payroll_processed: false
      });

      const periodTimesheets = timesheets.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= new Date(periodStart) && tDate <= new Date(periodEnd);
      });

      if (periodTimesheets.length === 0) {
        throw new Error('Ingen godkjente timer i perioden');
      }

      // Grupper per ansatt
      const employeeSummaries = [];
      const employeeMap = new Map();

      periodTimesheets.forEach(t => {
        if (!employeeMap.has(t.employee_id)) {
          const employee = employees.find(e => e.id === t.employee_id);
          employeeMap.set(t.employee_id, {
            employee_id: t.employee_id,
            employee_name: t.employee_name,
            regular_hours: 0,
            overtime_50_hours: 0,
            overtime_100_hours: 0,
            hourly_rate: employee?.hourly_rate || 0,
            overtime_50_rate: employee?.overtime_50_rate || (employee?.hourly_rate ? employee.hourly_rate * 1.5 : 0),
            overtime_100_rate: employee?.overtime_100_rate || (employee?.hourly_rate ? employee.hourly_rate * 2.0 : 0),
            normal_hours_per_day: employee?.normal_hours_per_day || 8,
            gross_amount: 0,
            project_breakdown: []
          });
        }

        const emp = employeeMap.get(t.employee_id);
        const normalHours = emp.normal_hours_per_day;
        
        // Beregn overtid basert på ansattes normale arbeidstid
        if (t.hours > normalHours) {
          const overtimeHours = t.hours - normalHours;
          if (overtimeHours <= 2) {
            emp.overtime_50_hours += overtimeHours;
          } else {
            emp.overtime_50_hours += 2;
            emp.overtime_100_hours += overtimeHours - 2;
          }
          emp.regular_hours += normalHours;
        } else {
          emp.regular_hours += t.hours;
        }

        // Prosjektfordeling
        const existingProject = emp.project_breakdown.find(p => p.project_id === t.project_id);
        if (existingProject) {
          existingProject.hours += t.hours;
        } else {
          emp.project_breakdown.push({
            project_id: t.project_id,
            project_name: t.project_name,
            hours: t.hours
          });
        }
      });

      // Beregn lønn med faktiske satser
      for (const emp of employeeMap.values()) {
        emp.gross_amount = 
          (emp.regular_hours * emp.hourly_rate) +
          (emp.overtime_50_hours * emp.overtime_50_rate) +
          (emp.overtime_100_hours * emp.overtime_100_rate);

        employeeSummaries.push(emp);
      }

      const totalHours = employeeSummaries.reduce((sum, e) => 
        sum + e.regular_hours + e.overtime_50_hours + e.overtime_100_hours, 0
      );
      const totalAmount = employeeSummaries.reduce((sum, e) => sum + e.gross_amount, 0);

      // Opprett lønnskjøring
      const payrollRun = await base44.entities.PayrollRun.create({
        period_start: periodStart,
        period_end: periodEnd,
        status: 'utkast',
        employee_summaries: employeeSummaries,
        total_hours: totalHours,
        total_amount: totalAmount,
        processed_by: user.email,
        processed_date: new Date().toISOString()
      });

      // Merk timer som behandlet
      const updates = periodTimesheets.map(t =>
        base44.entities.Timesheet.update(t.id, {
          payroll_processed: true,
          payroll_run_id: payrollRun.id
        })
      );
      await Promise.all(updates);

      return payrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payrollRuns']);
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Lønnskjøring opprettet');
      setShowCreateDialog(false);
      setPeriodStart('');
      setPeriodEnd('');
    },
    onError: (error) => {
      toast.error(error.message || 'Kunne ikke opprette lønnskjøring');
    }
  });

  const lockPayrollMutation = useMutation({
    mutationFn: async (runId) => {
      await base44.entities.PayrollRun.update(runId, {
        status: 'låst',
        locked_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payrollRuns']);
      toast.success('Lønnskjøring låst');
    },
    onError: () => {
      toast.error('Kunne ikke låse lønnskjøring');
    }
  });

  const exportToCSV = (run) => {
    let csv = 'Ansattnummer,Ansattnavn,Ordinære timer,Overtid 50%,Overtid 100%,Timelønn,Bruttobeløp\n';
    
    run.employee_summaries.forEach(emp => {
      csv += `${emp.employee_id},${emp.employee_name},${emp.regular_hours},${emp.overtime_50_hours},${emp.overtime_100_hours},${emp.hourly_rate},${emp.gross_amount}\n`;
    });

    csv += `\nTotal,,${run.total_hours},,,${run.total_amount}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lonnskjoring-${run.period_start}-${run.period_end}.csv`;
    a.click();
    toast.success('CSV eksportert');
  };

  const totalStats = useMemo(() => {
    return payrollRuns.reduce((acc, run) => ({
      total_amount: acc.total_amount + (run.total_amount || 0),
      total_hours: acc.total_hours + (run.total_hours || 0),
      total_runs: acc.total_runs + 1
    }), { total_amount: 0, total_hours: 0, total_runs: 0 });
  }, [payrollRuns]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Ingen tilgang</p>
          <p className="text-slate-600">Kun administratorer kan se lønnsgrunnlag</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Lønnsgrunnlag"
        subtitle="Administrer lønnskjøringer"
        actions={
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ny lønnskjøring
          </Button>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Totalt utbetalt</p>
                <p className="text-2xl font-bold text-slate-900">{formatAmount(totalStats.total_amount)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Totalt timer</p>
                <p className="text-2xl font-bold text-slate-900">{totalStats.total_hours.toFixed(1)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Lønnskjøringer</p>
                <p className="text-2xl font-bold text-slate-900">{totalStats.total_runs}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payroll Runs List */}
        <Card>
          <div className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Lønnskjøringer</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Ansatte</TableHead>
                  <TableHead className="text-right">Timer</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(run.period_start), 'd. MMM', { locale: nb })} - {format(parseISO(run.period_end), 'd. MMM yyyy', { locale: nb })}
                    </TableCell>
                    <TableCell>{run.employee_summaries?.length || 0}</TableCell>
                    <TableCell className="text-right">{run.total_hours?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(run.total_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          run.status === 'låst' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                          run.status === 'behandlet' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        }
                      >
                        {run.status === 'låst' && <Lock className="h-3 w-3 mr-1" />}
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {run.processed_date && format(parseISO(run.processed_date), 'd. MMM yyyy', { locale: nb })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRun(run)}
                          className="rounded-lg"
                        >
                          Detaljer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToCSV(run)}
                          className="rounded-lg"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {run.status !== 'låst' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => lockPayrollMutation.mutate(run.id)}
                            className="rounded-lg text-red-600"
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {payrollRuns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      Ingen lønnskjøringer ennå
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Create Payroll Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny lønnskjøring</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fra dato</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Til dato</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                Systemet vil hente alle godkjente timer i perioden og beregne lønn automatisk.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              onClick={() => createPayrollMutation.mutate()}
              disabled={createPayrollMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {createPayrollMutation.isPending ? 'Oppretter...' : 'Opprett'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Details Dialog */}
      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lønnskjøring: {selectedRun && format(parseISO(selectedRun.period_start), 'd. MMM', { locale: nb })} - {selectedRun && format(parseISO(selectedRun.period_end), 'd. MMM yyyy', { locale: nb })}
            </DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ansatt</TableHead>
                    <TableHead className="text-right">Ordinære</TableHead>
                    <TableHead className="text-right">Overtid 50%</TableHead>
                    <TableHead className="text-right">Overtid 100%</TableHead>
                    <TableHead className="text-right">Timelønn</TableHead>
                    <TableHead className="text-right">Bruttolønn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRun.employee_summaries?.map((emp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{emp.employee_name}</TableCell>
                      <TableCell className="text-right">{emp.regular_hours.toFixed(1)}t</TableCell>
                      <TableCell className="text-right">{emp.overtime_50_hours.toFixed(1)}t</TableCell>
                      <TableCell className="text-right">{emp.overtime_100_hours.toFixed(1)}t</TableCell>
                      <TableCell className="text-right">{emp.hourly_rate} kr</TableCell>
                      <TableCell className="text-right font-semibold">{formatAmount(emp.gross_amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{selectedRun.total_hours?.toFixed(1) || 0}t</TableCell>
                    <TableCell colSpan={3}></TableCell>
                    <TableCell className="text-right">{formatAmount(selectedRun.total_amount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}