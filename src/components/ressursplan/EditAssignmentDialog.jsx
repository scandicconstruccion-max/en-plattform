import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const calculateWorkDays = (startDate, endDate, includeSaturday, includeSunday) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;
  
  let workDays = 0;
  const current = new Date(start);
  
  while (current < end) {
    const dayOfWeek = current.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    
    if (isWeekday || (isSaturday && includeSaturday) || (isSunday && includeSunday)) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
};

const addWorkDays = (startDate, days, includeSaturday, includeSunday) => {
  const date = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    
    if (isWeekday || (isSaturday && includeSaturday) || (isSunday && includeSunday)) {
      addedDays++;
    }
  }
  
  return date;
};

export default function EditAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  onSubmit,
  isLoading
}) {
  const { data: competencies = [] } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => base44.entities.Competency.filter({ is_active: true }),
    initialData: []
  });
  const [formData, setFormData] = useState({
    start_dato_tid: '',
    slutt_dato_tid: '',
    rolle_pa_prosjekt: '',
    kommentar: '',
    status: 'planlagt',
    include_saturday: false,
    include_sunday: false
  });
  const [competencyInput, setCompetencyInput] = useState('');
  const [requiredCompetencies, setRequiredCompetencies] = useState([]);
  const [workDays, setWorkDays] = useState(0);
  const [editingWorkDays, setEditingWorkDays] = useState(false);

  useEffect(() => {
    if (assignment) {
      const startDato = assignment.start_dato_tid ? assignment.start_dato_tid.slice(0, 16) : '';
      const sluttDato = assignment.slutt_dato_tid ? assignment.slutt_dato_tid.slice(0, 16) : '';
      setFormData({
        start_dato_tid: startDato,
        slutt_dato_tid: sluttDato,
        rolle_pa_prosjekt: assignment.rolle_pa_prosjekt || '',
        kommentar: assignment.kommentar || '',
        status: assignment.status || 'planlagt',
        include_saturday: assignment.include_saturday || false,
        include_sunday: assignment.include_sunday || false
      });
      setRequiredCompetencies(assignment.required_competencies || []);
      setCompetencyInput('');
      setEditingWorkDays(false);
      const days = calculateWorkDays(startDato, sluttDato, assignment.include_saturday, assignment.include_sunday);
      setWorkDays(days);
    }
  }, [assignment, open]);

  const handleWorkDaysChange = (newWorkDays) => {
    setWorkDays(newWorkDays);
    if (formData.start_dato_tid && newWorkDays > 0) {
      const newEndDate = addWorkDays(formData.start_dato_tid, newWorkDays, formData.include_saturday, formData.include_sunday);
      const year = newEndDate.getFullYear();
      const month = String(newEndDate.getMonth() + 1).padStart(2, '0');
      const date = String(newEndDate.getDate()).padStart(2, '0');
      const hours = String(newEndDate.getHours()).padStart(2, '0');
      const minutes = String(newEndDate.getMinutes()).padStart(2, '0');
      setFormData({ ...formData, slutt_dato_tid: `${year}-${month}-${date}T${hours}:${minutes}` });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      required_competencies: requiredCompetencies
    });
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle>Rediger ressursplanlegging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-4 max-h-[calc(90vh-10rem)]">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Ressurs:</strong> {assignment.resource_navn}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Prosjekt:</strong> {assignment.prosjekt_navn}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start dato og tid *</Label>
              <Input
                type="datetime-local"
                value={formData.start_dato_tid}
                onChange={(e) => {
                  setFormData({ ...formData, start_dato_tid: e.target.value });
                  if (formData.slutt_dato_tid) {
                    const days = calculateWorkDays(e.target.value, formData.slutt_dato_tid, formData.include_saturday, formData.include_sunday);
                    setWorkDays(days);
                  }
                }}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Slutt dato og tid *</Label>
              <Input
                type="datetime-local"
                value={formData.slutt_dato_tid}
                onChange={(e) => {
                  setFormData({ ...formData, slutt_dato_tid: e.target.value });
                  if (formData.start_dato_tid) {
                    const days = calculateWorkDays(formData.start_dato_tid, e.target.value, formData.include_saturday, formData.include_sunday);
                    setWorkDays(days);
                  }
                }}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Arbeidsdager</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{workDays}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingWorkDays(!editingWorkDays)}
                className="rounded-xl"
              >
                {editingWorkDays ? 'Ferdig' : 'Endre'}
              </Button>
            </div>
            {editingWorkDays && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Label htmlFor="work-days-input" className="text-sm">Antall arbeidsdager</Label>
                <Input
                  id="work-days-input"
                  type="number"
                  min="0"
                  value={workDays}
                  onChange={(e) => handleWorkDaysChange(parseInt(e.target.value) || 0)}
                  className="rounded-xl mt-2"
                />
                <p className="text-xs text-slate-500 mt-2">Sluttdato oppdateres automatisk</p>
              </div>
            )}
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
                  id="edit_include_saturday"
                  checked={formData.include_saturday}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, include_saturday: checked });
                    if (formData.start_dato_tid && formData.slutt_dato_tid) {
                      const days = calculateWorkDays(formData.start_dato_tid, formData.slutt_dato_tid, checked, formData.include_sunday);
                      setWorkDays(days);
                    }
                  }}
                />
                <label htmlFor="edit_include_saturday" className="text-sm cursor-pointer">
                  Inkluder lørdag
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="edit_include_sunday"
                  checked={formData.include_sunday}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, include_sunday: checked });
                    if (formData.start_dato_tid && formData.slutt_dato_tid) {
                      const days = calculateWorkDays(formData.start_dato_tid, formData.slutt_dato_tid, formData.include_saturday, checked);
                      setWorkDays(days);
                    }
                  }}
                />
                <label htmlFor="edit_include_sunday" className="text-sm cursor-pointer">
                  Inkluder søndag
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planlagt">Planlagt</SelectItem>
                <SelectItem value="bekreftet">Bekreftet</SelectItem>
                <SelectItem value="fullfort">Fullført</SelectItem>
                <SelectItem value="kansellert">Kansellert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rolle på prosjekt</Label>
            <Input
              value={formData.rolle_pa_prosjekt}
              onChange={(e) => setFormData({ ...formData, rolle_pa_prosjekt: e.target.value })}
              placeholder="f.eks. Prosjektleder, Tømrer, Montør"
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Required Competencies */}
          {assignment?.assignment_type === 'arbeid' && (
            <div>
              <Label>Nødvendige kompetanser</Label>
              <p className="text-xs text-slate-500 mt-1 mb-2">
                Velg kompetanser som kreves for denne aktiviteten
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
                <SelectContent>
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
                <div className="flex flex-wrap gap-2 mt-3">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isLoading ? 'Lagrer...' : 'Lagre endringer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}