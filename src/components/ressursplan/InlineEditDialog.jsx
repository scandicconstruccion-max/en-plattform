import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';

export default function InlineEditDialog({ 
  open, 
  onOpenChange, 
  assignment, 
  projects,
  onSubmit, 
  onDelete,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    prosjekt_id: '',
    start_dato_tid: '',
    slutt_dato_tid: '',
    rolle_pa_prosjekt: '',
    kommentar: '',
    status: 'planlagt'
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        prosjekt_id: assignment.prosjekt_id || '',
        start_dato_tid: assignment.start_dato_tid?.slice(0, 16) || '',
        slutt_dato_tid: assignment.slutt_dato_tid?.slice(0, 16) || '',
        rolle_pa_prosjekt: assignment.rolle_pa_prosjekt || '',
        kommentar: assignment.kommentar || '',
        status: assignment.status || 'planlagt'
      });
    }
  }, [assignment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rediger planlegging</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Prosjekt</Label>
            <Select 
              value={formData.prosjekt_id} 
              onValueChange={(v) => setFormData({...formData, prosjekt_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg prosjekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={formData.start_dato_tid}
                onChange={(e) => setFormData({...formData, start_dato_tid: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Slutt</Label>
              <Input
                type="datetime-local"
                value={formData.slutt_dato_tid}
                onChange={(e) => setFormData({...formData, slutt_dato_tid: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label>Rolle</Label>
            <Input
              value={formData.rolle_pa_prosjekt}
              onChange={(e) => setFormData({...formData, rolle_pa_prosjekt: e.target.value})}
              placeholder="F.eks. Tømrer, Elektriker..."
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => setFormData({...formData, status: v})}
            >
              <SelectTrigger>
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
            <Label>Kommentar</Label>
            <Textarea
              value={formData.kommentar}
              onChange={(e) => setFormData({...formData, kommentar: e.target.value})}
              placeholder="Legg til notater..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lagre
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}