import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function ExternalResourceDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
  isLoading
}) {
  const [formData, setFormData] = useState({
    navn: '',
    firma: '',
    rolle: '',
    telefon: '',
    epost: '',
    kontaktperson: '',
    notat: '',
    aktiv: true
  });

  useEffect(() => {
    if (resource) {
      setFormData(resource);
    } else {
      setFormData({
        navn: '',
        firma: '',
        rolle: '',
        telefon: '',
        epost: '',
        kontaktperson: '',
        notat: '',
        aktiv: true
      });
    }
  }, [resource, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {resource ? 'Rediger ekstern ressurs' : 'Ny ekstern ressurs'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Navn *</Label>
            <Input
              value={formData.navn}
              onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
              placeholder="Navn på ressurs"
              required
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Firma *</Label>
            <Input
              value={formData.firma}
              onChange={(e) => setFormData({ ...formData, firma: e.target.value })}
              placeholder="Firmanavn"
              required
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Rolle/Kompetanse *</Label>
            <Select
              value={formData.rolle}
              onValueChange={(v) => setFormData({ ...formData, rolle: v })}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Velg rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elektriker">Elektriker</SelectItem>
                <SelectItem value="rørlegger">Rørlegger</SelectItem>
                <SelectItem value="murer">Murer</SelectItem>
                <SelectItem value="tømrer">Tømrer</SelectItem>
                <SelectItem value="maler">Maler</SelectItem>
                <SelectItem value="kranfører">Kranfører</SelectItem>
                <SelectItem value="gravemaskinoperatør">Gravemaskinoperatør</SelectItem>
                <SelectItem value="betongarbeider">Betongarbeider</SelectItem>
                <SelectItem value="stålarbeider">Stålarbeider</SelectItem>
                <SelectItem value="annet">Annet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefon</Label>
              <Input
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                placeholder="+47..."
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>E-post</Label>
              <Input
                type="email"
                value={formData.epost}
                onChange={(e) => setFormData({ ...formData, epost: e.target.value })}
                placeholder="eksempel@firma.no"
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label>Kontaktperson</Label>
            <Input
              value={formData.kontaktperson}
              onChange={(e) => setFormData({ ...formData, kontaktperson: e.target.value })}
              placeholder="Hovedkontakt hos firma"
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Notater</Label>
            <Textarea
              value={formData.notat}
              onChange={(e) => setFormData({ ...formData, notat: e.target.value })}
              placeholder="Eventuelle notater..."
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Aktiv ressurs</Label>
            <Switch
              checked={formData.aktiv}
              onCheckedChange={(checked) => setFormData({ ...formData, aktiv: checked })}
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
              {isLoading ? 'Lagrer...' : resource ? 'Oppdater' : 'Opprett'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}