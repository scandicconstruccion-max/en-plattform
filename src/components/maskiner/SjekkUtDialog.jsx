import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, User, Warehouse, Wrench } from 'lucide-react';

const LOKASJON_CONFIG = {
  lager: { label: 'På lager', icon: Warehouse, color: 'text-green-600' },
  hos_ansatt: { label: 'Hos ansatt', icon: User, color: 'text-blue-600' },
  prosjekt: { label: 'På prosjekt', icon: MapPin, color: 'text-orange-600' },
  service: { label: 'På service', icon: Wrench, color: 'text-yellow-600' },
};

export default function SjekkUtDialog({ maskin, employees, open, onOpenChange, onSave, isPending }) {
  const [lokasjon, setLokasjon] = useState(maskin?.lokasjon || 'lager');
  const [hosAnsattId, setHosAnsattId] = useState(maskin?.hos_ansatt_id || '');
  const [prosjektLokasjon, setProsjektLokasjon] = useState(maskin?.prosjekt_lokasjon || '');
  const [lokasjonNotat, setLokasjonNotat] = useState(maskin?.lokasjon_notat || '');

  React.useEffect(() => {
    if (maskin) {
      setLokasjon(maskin.lokasjon || 'lager');
      setHosAnsattId(maskin.hos_ansatt_id || '');
      setProsjektLokasjon(maskin.prosjekt_lokasjon || '');
      setLokasjonNotat(maskin.lokasjon_notat || '');
    }
  }, [maskin]);

  const handleSave = () => {
    const selectedEmp = employees.find((e) => e.id === hosAnsattId);
    const newStatus = lokasjon === 'lager' ? 'tilgjengelig'
      : lokasjon === 'service' ? 'service'
      : 'i_bruk';

    onSave({
      lokasjon,
      status: newStatus,
      hos_ansatt_id: lokasjon === 'hos_ansatt' ? hosAnsattId : '',
      hos_ansatt_navn: lokasjon === 'hos_ansatt' && selectedEmp
        ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : '',
      prosjekt_lokasjon: lokasjon === 'prosjekt' ? prosjektLokasjon : '',
      lokasjon_notat: lokasjonNotat,
      utlevert_dato: lokasjon !== 'lager' ? new Date().toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Oppdater plassering — {maskin?.navn}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Hvor er maskinen nå?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(LOKASJON_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = lokasjon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLokasjon(key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-emerald-600' : cfg.color}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {lokasjon === 'hos_ansatt' && (
            <div>
              <Label>Hvem har maskinen?</Label>
              <Select value={hosAnsattId || 'none'} onValueChange={(v) => setHosAnsattId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg ansatt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Velg ansatt —</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lokasjon === 'prosjekt' && (
            <div>
              <Label>Prosjekt / sted</Label>
              <Input
                value={prosjektLokasjon}
                onChange={(e) => setProsjektLokasjon(e.target.value)}
                placeholder="F.eks. Prosjekt Storgata 12"
                className="mt-1.5 rounded-xl"
              />
            </div>
          )}

          <div>
            <Label>Ekstra notat (valgfritt)</Label>
            <Input
              value={lokasjonNotat}
              onChange={(e) => setLokasjonNotat(e.target.value)}
              placeholder="F.eks. i boden til høyre..."
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Avbryt</Button>
            <Button
              onClick={handleSave}
              disabled={isPending || (lokasjon === 'hos_ansatt' && !hosAnsattId)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lagre plassering
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}