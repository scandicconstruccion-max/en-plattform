import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Upload, Trash2 } from 'lucide-react';

const workCategories = [
  { value: 'ordinært_arbeid', label: 'Ordinært arbeid' },
  { value: 'overtid', label: 'Overtid' },
  { value: 'helg', label: 'Helg' },
  { value: 'helligdag', label: 'Helligdag' },
  { value: 'reise', label: 'Reise' },
  { value: 'møte', label: 'Møte' },
  { value: 'admin', label: 'Admin' },
];

export default function TimesheetForm({
  open,
  onClose,
  date,
  weekNumber,
  year,
  employee,
  projects,
  timesheet,
  copyFrom
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_id: '',
    project_name: '',
    start_time: '',
    end_time: '',
    break_minutes: 30,
    hours: 0,
    work_category: 'ordinært_arbeid',
    work_description: '',
    is_billable: true,
    mileage_km: 0,
    attachment_urls: []
  });

  const [uploading, setUploading] = useState(false);

  // Calculate hours automatically
  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    
    let totalMinutes = endTotalMinutes - startTotalMinutes;
    
    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    totalMinutes -= (breakMinutes || 0);
    
    return Math.max(0, totalMinutes / 60);
  };

  useEffect(() => {
    if (timesheet) {
      setFormData({
        project_id: timesheet.project_id,
        project_name: timesheet.project_name,
        start_time: timesheet.start_time || '',
        end_time: timesheet.end_time || '',
        break_minutes: timesheet.break_minutes || 30,
        hours: timesheet.hours || 0,
        work_category: timesheet.work_category,
        work_description: timesheet.work_description,
        is_billable: timesheet.is_billable,
        mileage_km: timesheet.mileage_km || 0,
        attachment_urls: timesheet.attachment_urls || []
      });
    } else if (copyFrom) {
      setFormData({
        project_id: copyFrom.project_id,
        project_name: copyFrom.project_name,
        start_time: copyFrom.start_time || '',
        end_time: copyFrom.end_time || '',
        break_minutes: copyFrom.break_minutes || 30,
        hours: copyFrom.hours || 0,
        work_category: copyFrom.work_category,
        work_description: '',
        is_billable: copyFrom.is_billable,
        mileage_km: 0,
        attachment_urls: []
      });
    } else {
      setFormData({
        project_id: '',
        project_name: '',
        start_time: '',
        end_time: '',
        break_minutes: 30,
        hours: 0,
        work_category: 'ordinært_arbeid',
        work_description: '',
        is_billable: true,
        mileage_km: 0,
        attachment_urls: []
      });
    }
  }, [timesheet, copyFrom, open]);

  // Auto-calculate hours when start_time, end_time, or break_minutes change
  useEffect(() => {
    const calculatedHours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);
    if (calculatedHours !== formData.hours) {
      setFormData(prev => ({ ...prev, hours: calculatedHours }));
    }
  }, [formData.start_time, formData.end_time, formData.break_minutes]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (timesheet) {
        await base44.entities.Timesheet.update(timesheet.id, data);
      } else {
        await base44.entities.Timesheet.create({
          ...data,
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          date: format(date, 'yyyy-MM-dd'),
          week_number: weekNumber,
          year: year,
          status: 'kladd'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      toast.success(timesheet ? 'Timeføring oppdatert' : 'Timeføring registrert');
      onClose();
    },
    onError: () => {
      toast.error('Kunne ikke lagre timeføring');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Timesheet.delete(timesheet.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Timeføring slettet');
      onClose();
    },
    onError: () => {
      toast.error('Kunne ikke slette timeføring');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.project_id) {
      toast.error('Du må velge et prosjekt');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast.error('Fyll inn start- og sluttidspunkt');
      return;
    }

    if (!formData.work_description || formData.work_description.length < 10) {
      toast.error('Arbeidsbeskrivelse må være minst 10 tegn');
      return;
    }

    if (formData.hours <= 0) {
      toast.error('Arbeidstimer må være større enn 0');
      return;
    }

    const selectedProject = projects.find(p => p.id === formData.project_id);

    saveMutation.mutate({
      ...formData,
      project_id: formData.project_id,
      project_name: selectedProject?.name || formData.project_name,
      hours: Number(formData.hours.toFixed(2)),
      break_minutes: formData.break_minutes || 0
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        attachment_urls: [...prev.attachment_urls, file_url]
      }));
      toast.success('Fil lastet opp');
    } catch (error) {
      toast.error('Kunne ikke laste opp fil');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachment_urls: prev.attachment_urls.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {timesheet ? 'Rediger timeføring' : 'Ny timeføring'} - {date && format(date, 'd. MMMM yyyy', { locale: nb })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prosjekt *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Arbeidskategori *</Label>
              <Select
                value={formData.work_category}
                onValueChange={(value) => setFormData({ ...formData, work_category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fra kl. *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Til kl. *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pause (min)</Label>
              <Input
                type="number"
                min="0"
                step="15"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Totalt arbeidet:</span>
              <span className="text-2xl font-bold text-emerald-600">
                {formData.hours.toFixed(2)} timer
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kjøring (km)</Label>
            <Input
              type="number"
              min="0"
              value={formData.mileage_km}
              onChange={(e) => setFormData({ ...formData, mileage_km: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Arbeidsbeskrivelse * (minimum 10 tegn)</Label>
            <Textarea
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              placeholder="Beskriv hva som er utført..."
              rows={4}
              required
              minLength={10}
            />
            <p className="text-xs text-slate-500">
              {formData.work_description.length} / 10 tegn minimum
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="billable"
              checked={formData.is_billable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked })}
            />
            <Label htmlFor="billable" className="cursor-pointer">
              Fakturerbar
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Vedlegg</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={uploading}
                className="rounded-xl gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Laster opp...' : 'Last opp fil'}
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
            {formData.attachment_urls.length > 0 && (
              <div className="space-y-1">
                {formData.attachment_urls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600 truncate flex-1">{url.split('/').pop()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {timesheet && timesheet.status === 'kladd' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="mr-auto text-red-600 hover:text-red-700 rounded-xl"
              >
                Slett
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}