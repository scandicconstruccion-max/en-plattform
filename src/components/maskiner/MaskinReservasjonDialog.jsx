import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { AlertTriangle, Loader2, CalendarRange, Clock } from 'lucide-react';
import { parseISO } from 'date-fns';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function MaskinReservasjonDialog({
  open,
  onOpenChange,
  maskin,
  projects = [],
  employees = [],
  existingReservasjoner = [],
  currentUser,
  editingReservasjon = null,
  onSubmit,
  isLoading,
}) {
  const [formData, setFormData] = useState({
    prosjekt_id: '',
    prosjekt_navn: '',
    reservert_av_id: '',
    reservert_av_navn: '',
    start_dato_tid: '',
    slutt_dato_tid: '',
    kommentar: '',
  });
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (editingReservasjon) {
      setFormData({
        prosjekt_id: editingReservasjon.prosjekt_id || '',
        prosjekt_navn: editingReservasjon.prosjekt_navn || '',
        reservert_av_id: editingReservasjon.reservert_av_id || '',
        reservert_av_navn: editingReservasjon.reservert_av_navn || '',
        start_dato_tid: editingReservasjon.start_dato_tid?.slice(0, 16) || '',
        slutt_dato_tid: editingReservasjon.slutt_dato_tid?.slice(0, 16) || '',
        kommentar: editingReservasjon.kommentar || '',
      });
    } else {
      setFormData({
        prosjekt_id: '',
        prosjekt_navn: '',
        reservert_av_id: currentUser?.id || '',
        reservert_av_navn: currentUser?.full_name || '',
        start_dato_tid: '',
        slutt_dato_tid: '',
        kommentar: '',
      });
    }
    setConflicts([]);
  }, [open, editingReservasjon, currentUser]);

  // Check conflicts whenever dates change
  useEffect(() => {
    if (!formData.start_dato_tid || !formData.slutt_dato_tid) {
      setConflicts([]);
      return;
    }
    const start = new Date(formData.start_dato_tid);
    const end = new Date(formData.slutt_dato_tid);
    if (start >= end) { setConflicts([]); return; }

    const found = existingReservasjoner.filter((r) => {
      if (r.status === 'kansellert') return false;
      if (editingReservasjon && r.id === editingReservasjon.id) return false;
      const rStart = parseISO(r.start_dato_tid);
      const rEnd = parseISO(r.slutt_dato_tid);
      return start < rEnd && end > rStart;
    });
    setConflicts(found);
  }, [formData.start_dato_tid, formData.slutt_dato_tid, existingReservasjoner, editingReservasjon]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.start_dato_tid || !formData.slutt_dato_tid) return;

    const toISO = (val) => {
      if (!val) return null;
      if (val.length === 16) return new Date(val + ':00').toISOString();
      return val;
    };

    const project = projects.find((p) => p.id === formData.prosjekt_id);
    const employee = employees.find((e) => e.id === formData.reservert_av_id);

    onSubmit({
      maskin_id: maskin.id,
      maskin_navn: maskin.navn,
      prosjekt_id: formData.prosjekt_id,
      prosjekt_navn: project?.name || formData.prosjekt_navn || '',
      reservert_av_id: formData.reservert_av_id,
      reservert_av_navn: employee
        ? `${employee.first_name} ${employee.last_name}`
        : formData.reservert_av_navn || currentUser?.full_name || '',
      reservert_av_epost: employee?.email || currentUser?.email || '',
      start_dato_tid: toISO(formData.start_dato_tid),
      slutt_dato_tid: toISO(formData.slutt_dato_tid),
      kommentar: formData.kommentar,
      kilde: 'manuell',
      status: 'aktiv',
    });
  };

  if (!maskin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-emerald-600" />
            {editingReservasjon ? 'Rediger reservasjon' : 'Reserver maskin'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-0.5">{maskin.navn}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <p className="font-semibold mb-1">Kollisjon med eksisterende reservasjon{conflicts.length > 1 ? 'er' : ''}:</p>
                {conflicts.map((c, i) => (
                  <p key={i}>
                    • {c.reservert_av_navn || 'Ukjent'} — {c.prosjekt_navn || 'Ukjent prosjekt'}
                    {' '}({format(parseISO(c.start_dato_tid), 'd. MMM', { locale: nb })} – {format(parseISO(c.slutt_dato_tid), 'd. MMM yyyy', { locale: nb })})
                    {c.kilde === 'ressursplan' && ' [Ressursplan]'}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fra *</Label>
              <Input
                type="datetime-local"
                value={formData.start_dato_tid}
                onChange={(e) => setFormData({ ...formData, start_dato_tid: e.target.value })}
                required
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>Til *</Label>
              <Input
                type="datetime-local"
                value={formData.slutt_dato_tid}
                onChange={(e) => setFormData({ ...formData, slutt_dato_tid: e.target.value })}
                required
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label>Prosjekt</Label>
            <Select
              value={formData.prosjekt_id || 'none'}
              onValueChange={(v) => {
                const p = projects.find((p) => p.id === v);
                setFormData({ ...formData, prosjekt_id: v === 'none' ? '' : v, prosjekt_navn: p?.name || '' });
              }}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Velg prosjekt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Intet prosjekt —</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reservert av</Label>
            <Select
              value={formData.reservert_av_id || 'none'}
              onValueChange={(v) => {
                const emp = employees.find((e) => e.id === v);
                setFormData({
                  ...formData,
                  reservert_av_id: v === 'none' ? '' : v,
                  reservert_av_navn: emp ? `${emp.first_name} ${emp.last_name}` : '',
                });
              }}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Velg person..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Velg person —</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kommentar</Label>
            <Textarea
              value={formData.kommentar}
              onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
              placeholder="Valgfri kommentar..."
              rows={2}
              className="mt-1 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.start_dato_tid || !formData.slutt_dato_tid}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingReservasjon ? 'Lagre' : 'Reserver'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}