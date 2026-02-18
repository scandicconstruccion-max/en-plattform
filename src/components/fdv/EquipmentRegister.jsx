import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Calendar, Shield } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EquipmentRegister({ fdvPackageId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    supplier: '',
    serial_number: '',
    installation_date: '',
    warranty_period_months: '',
    service_interval_months: '',
    location: ''
  });
  const queryClient = useQueryClient();

  const { data: equipment = [] } = useQuery({
    queryKey: ['fdvEquipment', fdvPackageId],
    queryFn: () => base44.entities.FDVEquipment.filter({ fdv_package_id: fdvPackageId }),
    enabled: !!fdvPackageId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const warrantyEndDate = data.installation_date && data.warranty_period_months
        ? addMonths(new Date(data.installation_date), parseInt(data.warranty_period_months))
        : null;

      const equipmentData = {
        ...data,
        fdv_package_id: fdvPackageId,
        warranty_period_months: data.warranty_period_months ? parseInt(data.warranty_period_months) : null,
        service_interval_months: data.service_interval_months ? parseInt(data.service_interval_months) : null,
        warranty_end_date: warrantyEndDate ? warrantyEndDate.toISOString().split('T')[0] : null
      };

      if (editingEquipment) {
        return base44.entities.FDVEquipment.update(editingEquipment.id, equipmentData);
      }
      return base44.entities.FDVEquipment.create(equipmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvEquipment', fdvPackageId] });
      handleClose();
      toast.success(editingEquipment ? 'Utstyr oppdatert' : 'Utstyr lagt til');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FDVEquipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvEquipment', fdvPackageId] });
      toast.success('Utstyr slettet');
    },
  });

  const handleClose = () => {
    setShowDialog(false);
    setEditingEquipment(null);
    setFormData({
      name: '',
      description: '',
      supplier: '',
      serial_number: '',
      installation_date: '',
      warranty_period_months: '',
      service_interval_months: '',
      location: ''
    });
  };

  const handleEdit = (eq) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name || '',
      description: eq.description || '',
      supplier: eq.supplier || '',
      serial_number: eq.serial_number || '',
      installation_date: eq.installation_date || '',
      warranty_period_months: eq.warranty_period_months?.toString() || '',
      service_interval_months: eq.service_interval_months?.toString() || '',
      location: eq.location || ''
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Legg til utstyr
        </Button>
      </div>

      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Leverandør</TableHead>
                <TableHead>Serienummer</TableHead>
                <TableHead>Monteringsdato</TableHead>
                <TableHead>Garanti</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Plassering</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Ingen utstyr registrert
                  </TableCell>
                </TableRow>
              ) : (
                equipment.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{eq.name}</p>
                        {eq.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{eq.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{eq.supplier || '-'}</TableCell>
                    <TableCell>{eq.serial_number || '-'}</TableCell>
                    <TableCell>
                      {eq.installation_date ? format(new Date(eq.installation_date), 'd. MMM yyyy', { locale: nb }) : '-'}
                    </TableCell>
                    <TableCell>
                      {eq.warranty_end_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Shield className="h-3 w-3 text-emerald-600" />
                          {format(new Date(eq.warranty_end_date), 'd. MMM yyyy', { locale: nb })}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {eq.service_interval_months ? `${eq.service_interval_months} mnd` : '-'}
                    </TableCell>
                    <TableCell>{eq.location || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(eq)}
                          className="rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(eq.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? 'Rediger utstyr' : 'Legg til utstyr'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Komponentnavn *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Leverandør</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serienummer</Label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Plassering</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Monteringsdato</Label>
                <Input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Garantiperiode (mnd)</Label>
                <Input
                  type="number"
                  value={formData.warranty_period_months}
                  onChange={(e) => setFormData({ ...formData, warranty_period_months: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Serviceintervall (mnd)</Label>
                <Input
                  type="number"
                  value={formData.service_interval_months}
                  onChange={(e) => setFormData({ ...formData, service_interval_months: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Avbryt
            </Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.name || saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {editingEquipment ? 'Oppdater' : 'Legg til'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}