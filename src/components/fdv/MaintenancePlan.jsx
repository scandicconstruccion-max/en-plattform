import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import EmployeeSelector from '@/components/shared/EmployeeSelector';
import { Plus, Edit, Trash2, Calendar, User, AlertCircle } from 'lucide-react';
import { format, addMonths, isBefore, isWithinInterval, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MaintenancePlan({ fdvPackageId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    equipment_id: '',
    task_description: '',
    interval_months: '',
    next_service_date: '',
    assigned_to: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const { data: maintenance = [] } = useQuery({
    queryKey: ['fdvMaintenance', fdvPackageId],
    queryFn: () => base44.entities.FDVMaintenance.filter({ fdv_package_id: fdvPackageId }),
    enabled: !!fdvPackageId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['fdvEquipment', fdvPackageId],
    queryFn: () => base44.entities.FDVEquipment.filter({ fdv_package_id: fdvPackageId }),
    enabled: !!fdvPackageId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const selectedEquipment = equipment.find(e => e.id === data.equipment_id);
      const selectedEmployee = employees.find(e => e.email === data.assigned_to);
      
      const today = new Date();
      const nextService = data.next_service_date ? new Date(data.next_service_date) : null;
      let status = 'planlagt';
      
      if (nextService) {
        if (isBefore(nextService, today)) {
          status = 'forfallt';
        } else if (isWithinInterval(nextService, { start: today, end: addMonths(today, 1) })) {
          status = 'forfaller_snart';
        }
      }

      const maintenanceData = {
        ...data,
        fdv_package_id: fdvPackageId,
        equipment_name: selectedEquipment?.name || '',
        assigned_name: selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : '',
        interval_months: data.interval_months ? parseInt(data.interval_months) : null,
        status
      };

      if (editingTask) {
        return base44.entities.FDVMaintenance.update(editingTask.id, maintenanceData);
      }
      return base44.entities.FDVMaintenance.create(maintenanceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvMaintenance', fdvPackageId] });
      handleClose();
      toast.success(editingTask ? 'Vedlikeholdsoppgave oppdatert' : 'Vedlikeholdsoppgave lagt til');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FDVMaintenance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvMaintenance', fdvPackageId] });
      toast.success('Vedlikeholdsoppgave slettet');
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: (task) => {
      const today = new Date().toISOString().split('T')[0];
      const nextDate = task.interval_months 
        ? addMonths(new Date(), task.interval_months).toISOString().split('T')[0]
        : null;

      return base44.entities.FDVMaintenance.update(task.id, {
        status: 'utfort',
        last_service_date: today,
        next_service_date: nextDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvMaintenance', fdvPackageId] });
      toast.success('Vedlikehold fullført');
    },
  });

  const handleClose = () => {
    setShowDialog(false);
    setEditingTask(null);
    setFormData({
      equipment_id: '',
      task_description: '',
      interval_months: '',
      next_service_date: '',
      assigned_to: '',
      notes: ''
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      equipment_id: task.equipment_id || '',
      task_description: task.task_description || '',
      interval_months: task.interval_months?.toString() || '',
      next_service_date: task.next_service_date || '',
      assigned_to: task.assigned_to || '',
      notes: task.notes || ''
    });
    setShowDialog(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      planlagt: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      forfaller_snart: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      forfallt: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      utfort: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    const labels = {
      planlagt: 'Planlagt',
      forfaller_snart: 'Forfaller snart',
      forfallt: 'Forfallt',
      utfort: 'Utført'
    };

    return (
      <Badge className={variants[status] || variants.planlagt}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Ny vedlikeholdsoppgave
        </Button>
      </div>

      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oppgave</TableHead>
                <TableHead>Utstyr</TableHead>
                <TableHead>Intervall</TableHead>
                <TableHead>Neste service</TableHead>
                <TableHead>Ansvarlig</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Ingen vedlikeholdsoppgaver registrert
                  </TableCell>
                </TableRow>
              ) : (
                maintenance.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.task_description}</p>
                        {task.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.equipment_name || '-'}</TableCell>
                    <TableCell>{task.interval_months ? `${task.interval_months} mnd` : '-'}</TableCell>
                    <TableCell>
                      {task.next_service_date ? (
                        <div className="flex items-center gap-1">
                          {task.status === 'forfallt' && <AlertCircle className="h-3 w-3 text-red-600" />}
                          {format(new Date(task.next_service_date), 'd. MMM yyyy', { locale: nb })}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {task.assigned_name || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {task.status !== 'utfort' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markCompleteMutation.mutate(task)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                          >
                            Fullfør
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(task)}
                          className="rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(task.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Rediger vedlikeholdsoppgave' : 'Ny vedlikeholdsoppgave'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Utstyr</Label>
              <Select
                value={formData.equipment_id}
                onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg utstyr" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vedlikeholdsoppgave *</Label>
              <Textarea
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Beskriv vedlikeholdsoppgaven"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Intervall (måneder)</Label>
                <Input
                  type="number"
                  value={formData.interval_months}
                  onChange={(e) => setFormData({ ...formData, interval_months: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Neste servicedato</Label>
                <Input
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Ansvarlig person</Label>
              <EmployeeSelector
                value={formData.assigned_to}
                onChange={(value) => setFormData({ ...formData, assigned_to: value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Notater</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Valgfrie notater"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Avbryt
            </Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.task_description || saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {editingTask ? 'Oppdater' : 'Legg til'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}