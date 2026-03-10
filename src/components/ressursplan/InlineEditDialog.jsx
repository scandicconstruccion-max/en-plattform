import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { parseISO, isWithinInterval } from 'date-fns';

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
    status: 'planlagt',
    machine_id: '',
    machine_navn: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [machineConflict, setMachineConflict] = useState(false);

  const { data: maskiner = [] } = useQuery({
    queryKey: ['maskiner'],
    queryFn: () => base44.entities.Maskin.list(),
    initialData: [],
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['resourceAssignments'],
    queryFn: () => base44.entities.ResourceAssignment.list(),
    initialData: [],
  });

  useEffect(() => {
    if (!formData.machine_id || !formData.start_dato_tid || !formData.slutt_dato_tid) {
      setMachineConflict(false);
      return;
    }
    const start = new Date(formData.start_dato_tid);
    const end = new Date(formData.slutt_dato_tid);
    const conflict = allAssignments.some((a) => {
      if (a.id === assignment?.id) return false;
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
    <>
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

            <div className="flex justify-between gap-3 pt-2">
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Slett
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lagre
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett aktivitet?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne aktiviteten? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onDelete();
              setShowDeleteConfirm(false);
              onOpenChange(false);
            }} className="bg-red-600 hover:bg-red-700">
              Slett
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}