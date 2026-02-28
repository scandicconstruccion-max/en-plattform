import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import ProjectSelector from '@/components/shared/ProjectSelector';

const befaringTypeLabels = {
  hms: 'HMS',
  kvalitet: 'Kvalitet',
  sluttkontroll: 'Sluttkontroll',
  overtakelse: 'Overtakelse',
  garantibefaring: 'Garantibefaring',
  tilbudsbefaring: 'Tilbudsbefaring',
  annet: 'Annet'
};

export default function BefaringForm({ open, onOpenChange, formData, setFormData, onSubmit, isEdit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger befaring' : 'Ny befaring'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Navn på befaring *</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="f.eks. HMS-befaring uke 12"
              required
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Befaringstype</Label>
            <Select 
              value={formData.befaring_type || 'kvalitet'} 
              onValueChange={(v) => setFormData({...formData, befaring_type: v})}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(befaringTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Prosjekt *</Label>
            <div className="mt-1.5">
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
              />
            </div>
          </div>

          <div>
            <Label>Dato for befaring</Label>
            <Input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Notater</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              {isEdit ? 'Oppdater' : 'Opprett'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}