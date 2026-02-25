import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

export default function EditAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  onSubmit,
  isLoading
}) {
  const [formData, setFormData] = useState({
    start_dato_tid: '',
    slutt_dato_tid: '',
    rolle_pa_prosjekt: '',
    kommentar: '',
    status: 'planlagt'
  });
  const [competencyInput, setCompetencyInput] = useState('');
  const [requiredCompetencies, setRequiredCompetencies] = useState([]);

  useEffect(() => {
    if (assignment) {
      setFormData({
        start_dato_tid: assignment.start_dato_tid ? assignment.start_dato_tid.slice(0, 16) : '',
        slutt_dato_tid: assignment.slutt_dato_tid ? assignment.slutt_dato_tid.slice(0, 16) : '',
        rolle_pa_prosjekt: assignment.rolle_pa_prosjekt || '',
        kommentar: assignment.kommentar || '',
        status: assignment.status || 'planlagt'
      });
      setRequiredCompetencies(assignment.required_competencies || []);
      setCompetencyInput('');
    }
  }, [assignment, open]);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rediger ressursplanlegging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                Kompetanser som kreves for denne aktiviteten
              </p>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={competencyInput}
                  onChange={(e) => setCompetencyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && competencyInput.trim()) {
                      e.preventDefault();
                      if (!requiredCompetencies.includes(competencyInput.trim())) {
                        setRequiredCompetencies([...requiredCompetencies, competencyInput.trim()]);
                      }
                      setCompetencyInput('');
                    }
                  }}
                  placeholder="f.eks. Tømrer, Elektriker"
                  className="rounded-xl"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (competencyInput.trim() && !requiredCompetencies.includes(competencyInput.trim())) {
                      setRequiredCompetencies([...requiredCompetencies, competencyInput.trim()]);
                      setCompetencyInput('');
                    }
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {requiredCompetencies.length > 0 && (
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