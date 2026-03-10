import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Plus, X, Calendar, AlertTriangle } from 'lucide-react';

export default function CreateAssignmentDialog({
  open,
  onOpenChange,
  employees,
  externals,
  projects,
  maskinerProp = null,
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

  const { data: competencies = [] } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => base44.entities.Competency.filter({ is_active: true }),
    initialData: []
  });

  const { data: maskinerFetched = [] } = useQuery({
    queryKey: ['maskiner'],
    queryFn: () => base44.entities.Maskin.list(),
    initialData: [],
    enabled: maskinerProp === null, // Only fetch if not provided
  });

  const maskiner = maskinerProp ?? maskinerFetched;

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['resourceAssignments'],
    queryFn: () => base44.entities.ResourceAssignment.list(),
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
    kommentar: '',
    machine_id: '',
    machine_navn: '',
    include_saturday: currentSettings.default_include_saturday || false,
    include_sunday: currentSettings.default_include_sunday || false
  });

  const [selectedResources, setSelectedResources] = useState([]);
  const [competencyInput, setCompetencyInput] = useState('');
  const [requiredCompetencies, setRequiredCompetencies] = useState([]);
  const [machineConflict, setMachineConflict] = useState(false);

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
           resource_type: prefilledData.resourceType || 'employee',
           start_dato_tid: startLocal,
           slutt_dato_tid: endLocal,
           // Pre-fill machine if coming from machine row click
           ...(prefilledData.machineId ? {
             machine_id: prefilledData.machineId,
             machine_navn: prefilledData.machineNavn || '',
           } : {})
         }));

         // Pre-select the resource (may be null if coming from machine row with no default driver)
         if (prefilledData.resourceId) {
           setSelectedResources([prefilledData.resourceId]);
         }
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
    onSubmit({ 
      ...formData, 
      resource_ids: selectedResources,
      required_competencies: requiredCompetencies
    });
  };

  // Suggest default driver when resource is selected
  useEffect(() => {
    if (selectedResources.length === 1 && maskiner.length > 0) {
      const suggestedMachine = maskiner.find(
        (m) => m.aktiv && m.standard_forer_id === selectedResources[0]
      );
      if (suggestedMachine && !formData.machine_id) {
        setFormData((prev) => ({
          ...prev,
          machine_id: suggestedMachine.id,
          machine_navn: suggestedMachine.navn,
        }));
      }
    }
  }, [selectedResources]);

  // Check machine conflict when machine or time changes
  useEffect(() => {
    if (!formData.machine_id || !formData.start_dato_tid || !formData.slutt_dato_tid) {
      setMachineConflict(false);
      return;
    }
    const start = new Date(formData.start_dato_tid);
    const end = new Date(formData.slutt_dato_tid);
    const conflict = allAssignments.some((a) => {
      if (a.machine_id !== formData.machine_id) return false;
      const aStart = parseISO(a.start_dato_tid);
      const aEnd = parseISO(a.slutt_dato_tid);
      return (
        isWithinInterval(start, { start: aStart, end: aEnd }) ||
        isWithinInterval(end, { start: aStart, end: aEnd }) ||
        isWithinInterval(aStart, { start, end })
      );
    });
    setMachineConflict(conflict);
  }, [formData.machine_id, formData.start_dato_tid, formData.slutt_dato_tid, allAssignments]);

  const resetForm = () => {
    setFormData({
      prosjekt_id: '',
      resource_type: 'employee',
      resource_ids: [],
      assignment_type: 'arbeid',
      start_dato_tid: '',
      slutt_dato_tid: '',
      rolle_pa_prosjekt: '',
      kommentar: '',
      machine_id: '',
      machine_navn: '',
      include_saturday: currentSettings.default_include_saturday || false,
      include_sunday: currentSettings.default_include_sunday || false
    });
    setSelectedResources([]);
    setRequiredCompetencies([]);
    setCompetencyInput('');
    setMachineConflict(false);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle>Ny ressursplanlegging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-4 max-h-[calc(90vh-10rem)]">
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

          {formData.assignment_type === 'arbeid' && (
            <div>
              <Label>Nødvendige kompetanser (valgfritt)</Label>
              <p className="text-xs text-slate-500 mt-1 mb-2">
                Velg kompetanser - ressurslisten oppdateres basert på match
              </p>
              
              <Select
                value=""
                onValueChange={(value) => {
                  if (!requiredCompetencies.includes(value)) {
                    setRequiredCompetencies([...requiredCompetencies, value]);
                  }
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Velg kompetanse..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {competencies
                    .filter(c => !requiredCompetencies.includes(c.name))
                    .map((comp) => (
                      <SelectItem key={comp.id} value={comp.name}>
                        {comp.name}
                      </SelectItem>
                    ))
                  }
                  {competencies.filter(c => !requiredCompetencies.includes(c.name)).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-slate-500">
                      Alle kompetanser er valgt
                    </div>
                  )}
                </SelectContent>
              </Select>

              {requiredCompetencies.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {requiredCompetencies.map((comp, idx) => (
                      <Badge
                        key={idx}
                        className="bg-blue-100 text-blue-700 px-3 py-1 flex items-center gap-2"
                      >
                        {comp}
                        <button
                          type="button"
                          onClick={() => {
                            setRequiredCompetencies(requiredCompetencies.filter((_, i) => i !== idx));
                          }}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {formData.resource_type === 'employee' && (
                    <p className="text-xs text-slate-500 mt-2">
                      💡 Ressurser med alle kompetanser markeres med grønn badge
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Velg ressurser * (kan velge flere)</Label>
            <div className="mt-2 border rounded-xl p-4 space-y-2">
              {availableResources.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Ingen {formData.resource_type === 'employee' ? 'ansatte' : 'eksterne ressurser'} tilgjengelig
                </p>
              ) : (
                availableResources.map((resource) => {
                  const resourceCompetencies = resource.competencies || [];
                  const hasAllRequired = requiredCompetencies.length === 0 || 
                    requiredCompetencies.every(req => resourceCompetencies.includes(req));
                  const missingCompetencies = requiredCompetencies.filter(req => !resourceCompetencies.includes(req));
                  
                  return (
                    <div key={resource.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedResources.includes(resource.id)}
                        onCheckedChange={() => toggleResource(resource.id)}
                      />
                      <label className="text-sm cursor-pointer flex-1" onClick={() => toggleResource(resource.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {resource.first_name ? `${resource.first_name} ${resource.last_name}` : resource.navn}
                          </span>
                          {requiredCompetencies.length > 0 && (
                            hasAllRequired ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                ✓ Alle kompetanser
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 text-xs" title={`Mangler: ${missingCompetencies.join(', ')}`}>
                                ⚠ Mangler {missingCompetencies.length}
                              </Badge>
                            )
                          )}
                        </div>
                        <span className="text-slate-500 text-xs">
                          {resource.position || resource.stilling || resource.rolle || ''}
                        </span>
                      </label>
                    </div>
                  );
                })
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

          {/* Weekend Inclusion Options */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-slate-600" />
              <Label className="text-sm font-medium">Helgedager</Label>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Som standard hoppes helger over. Huk av for å inkludere spesifikke helgedager i aktiviteten.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include_saturday"
                  checked={formData.include_saturday}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_saturday: checked })}
                />
                <label htmlFor="include_saturday" className="text-sm cursor-pointer">
                  Inkluder lørdag
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include_sunday"
                  checked={formData.include_sunday}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_sunday: checked })}
                />
                <label htmlFor="include_sunday" className="text-sm cursor-pointer">
                  Inkluder søndag
                </label>
              </div>
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

          {formData.assignment_type === 'arbeid' && (
            <div>
              <Label>Maskin (valgfritt)</Label>
              <Select
                value={formData.machine_id || 'none'}
                onValueChange={(v) => {
                  const selected = maskiner.find((m) => m.id === v);
                  setFormData({
                    ...formData,
                    machine_id: v === 'none' ? '' : v,
                    machine_navn: selected ? selected.navn : '',
                  });
                }}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Ingen maskin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen maskin</SelectItem>
                  {maskiner
                    .filter((m) => m.aktiv)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          {m.navn}
                          {m.status === 'tilgjengelig' && (
                            <span className="text-[10px] text-green-600">● Tilgjengelig</span>
                          )}
                          {m.status !== 'tilgjengelig' && (
                            <span className="text-[10px] text-amber-600">● {m.status}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {machineConflict && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  Maskinen er allerede planlagt i dette tidsrommet.
                </div>
              )}
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