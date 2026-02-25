import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function CreateAssignmentDialog({
  open,
  onOpenChange,
  employees,
  externals,
  projects,
  onSubmit,
  isLoading,
  initialStartDate = null,
  prefilledData = null
}) {
  const { data: settings = [] } = useQuery({
    queryKey: ['resourcePlannerSettings'],
    queryFn: () => base44.entities.ResourcePlannerSettings.list(),
    initialData: []
  });

  const currentSettings = settings[0] || { standard_start_tid: '07:00', standard_slutt_tid: '15:30' };

  const getDefaultDateTime = (dateOverride = null) => {
    const date = dateOverride || new Date();
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      start: `${dateStr}T${currentSettings.standard_start_tid}`,
      end: `${dateStr}T${currentSettings.standard_slutt_tid}`
    };
  };

  const [formData, setFormData] = useState({
    prosjekt_id: '',
    resource_type: 'employee',
    resource_ids: [],
    assignment_type: 'arbeid',
    start_dato_tid: '',
    slutt_dato_tid: '',
    rolle_pa_prosjekt: '',
    kommentar: ''
  });

  const [selectedResources, setSelectedResources] = useState([]);
  const [competencyInput, setCompetencyInput] = useState('');
  const [requiredCompetencies, setRequiredCompetencies] = useState([]);

  useEffect(() => {
     if (open) {
       if (prefilledData) {
         // Pre-fill from cell click data
         const startTime = typeof prefilledData.startTime === 'string' 
           ? prefilledData.startTime 
           : prefilledData.startTime.toISOString();
         const endTime = typeof prefilledData.endTime === 'string' 
           ? prefilledData.endTime 
           : prefilledData.endTime.toISOString();

         // Convert ISO to datetime-local format
         const startLocal = startTime.substring(0, 16);
         const endLocal = endTime.substring(0, 16);

         setFormData(prev => ({
           ...prev,
           resource_type: prefilledData.resourceType,
           start_dato_tid: startLocal,
           slutt_dato_tid: endLocal
         }));

         // Pre-select the resource
         setSelectedResources([prefilledData.resourceId]);
       } else {
         // Default behavior
         const defaults = getDefaultDateTime(initialStartDate);
         setFormData(prev => ({
           ...prev,
           start_dato_tid: defaults.start,
           slutt_dato_tid: defaults.end
         }));
       }
     }
   }, [open, prefilledData, initialStartDate, currentSettings.standard_start_tid, currentSettings.standard_slutt_tid]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedResources.length === 0) {
      alert('Velg minst én ressurs');
      return;
    }
    if (formData.assignment_type === 'arbeid' && !formData.prosjekt_id) {
      alert('Velg prosjekt for arbeidsallokering');
      return;
    }
    onSubmit({ ...formData, resource_ids: selectedResources });
  };

  const resetForm = () => {
    setFormData({
      prosjekt_id: '',
      resource_type: 'employee',
      resource_ids: [],
      assignment_type: 'arbeid',
      start_dato_tid: '',
      slutt_dato_tid: '',
      rolle_pa_prosjekt: '',
      kommentar: ''
    });
    setSelectedResources([]);
  };

  const handleClose = (open) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const availableResources = formData.resource_type === 'employee' ? employees : externals;

  const toggleResource = (resourceId) => {
    setSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny ressursplanlegging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type *</Label>
            <Select
              value={formData.assignment_type}
              onValueChange={(v) => setFormData({ ...formData, assignment_type: v })}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arbeid">Arbeid</SelectItem>
                <SelectItem value="syk">Syk</SelectItem>
                <SelectItem value="egenemelding">Egenemelding</SelectItem>
                <SelectItem value="ferie">Ferie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.assignment_type === 'arbeid' && (
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.prosjekt_id}
                onChange={(v) => setFormData({ ...formData, prosjekt_id: v })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          )}

          <div>
            <Label>Ressurstype *</Label>
            <Select
              value={formData.resource_type}
              onValueChange={(v) => {
                setFormData({ ...formData, resource_type: v });
                setSelectedResources([]);
              }}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Ansatt</SelectItem>
                <SelectItem value="external">Ekstern (UE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Velg ressurser * (kan velge flere)</Label>
            <div className="mt-2 border rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
              {availableResources.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Ingen {formData.resource_type === 'employee' ? 'ansatte' : 'eksterne ressurser'} tilgjengelig
                </p>
              ) : (
                availableResources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedResources.includes(resource.id)}
                      onCheckedChange={() => toggleResource(resource.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1" onClick={() => toggleResource(resource.id)}>
                      <span className="font-medium">
                        {resource.first_name ? `${resource.first_name} ${resource.last_name}` : resource.navn}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {resource.position || resource.stilling || resource.rolle || ''}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
            {selectedResources.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {selectedResources.length} ressurs(er) valgt
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start dato og tid *</Label>
              <Input
                type="datetime-local"
                value={formData.start_dato_tid}
                onChange={(e) => setFormData({ ...formData, start_dato_tid: e.target.value })}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Slutt dato og tid *</Label>
              <Input
                type="datetime-local"
                value={formData.slutt_dato_tid}
                onChange={(e) => setFormData({ ...formData, slutt_dato_tid: e.target.value })}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          {formData.assignment_type === 'arbeid' && (
            <div>
              <Label>Rolle på prosjekt</Label>
              <Input
                value={formData.rolle_pa_prosjekt}
                onChange={(e) => setFormData({ ...formData, rolle_pa_prosjekt: e.target.value })}
                placeholder="f.eks. Prosjektleder, Tømrer, Montør"
                className="mt-1.5 rounded-xl"
              />
            </div>
          )}

          <div>
            <Label>Kommentar</Label>
            <Textarea
              value={formData.kommentar}
              onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
              placeholder="Eventuelle notater..."
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isLoading || selectedResources.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isLoading ? 'Oppretter...' : 'Opprett planlegging'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}