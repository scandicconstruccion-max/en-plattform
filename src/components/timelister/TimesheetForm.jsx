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
    hours: '',
    work_category: 'ordinært_arbeid',
    work_description: '',
    is_billable: true,
    mileage_km: 0,
    attachment_urls: []
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (timesheet) {
      setFormData({
        project_id: timesheet.project_id,
        project_name: timesheet.project_name,
        hours: timesheet.hours,
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
        hours: copyFrom.hours,
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
        hours: '',
        work_category: 'ordinært_arbeid',
        work_description: '',
        is_billable: true,
        mileage_km: 0,
        attachment_urls: []
      });
    }
  }, [timesheet, copyFrom, open]);

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
      toast.error('Velg et prosjekt');
      return;
    }

    if (!formData.work_description || formData.work_description.length < 10) {
      toast.error('Arbeidsbeskrivelse må være minst 10 tegn');
      return;
    }

    const selectedProject = projects.find(p => p.id === formData.project_id);
    
    saveMutation.mutate({
      ...formData,
      project_name: selectedProject?.name || formData.project_name,
      hours: parseFloat(formData.hours)
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timer *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                required
              />
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