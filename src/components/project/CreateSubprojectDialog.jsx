import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Dialog for å opprette underprosjekt/enhet
 * Arver automatisk info fra parent
 */
export default function CreateSubprojectDialog({ 
  open, 
  onClose, 
  parentProject,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'subproject',
    addResident: false,
    resident_name: '',
    resident_phone: '',
    resident_email: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', parentProject?.id] });
      setFormData({ name: '', type: 'subproject' });
      onClose();
      if (onSuccess) onSuccess();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) return;

    // Get parent project number and find next subproject number
    const parentNumber = parentProject.project_number;
    const projects = await base44.entities.Project.filter({ parent_id: parentProject.id });
    const maxSubSeq = projects.reduce((max, p) => {
      const match = p.project_number?.match(/-(\d{2})$/);
      const seq = match ? parseInt(match[1]) : 0;
      return Math.max(max, seq);
    }, 0);
    const nextSubSeq = String(maxSubSeq + 1).padStart(2, '0');
    const subprojectNumber = `${parentNumber}-${nextSubSeq}`;

    const projectData = {
      name: formData.name,
      type: formData.type,
      parent_id: parentProject.id,
      project_number: subprojectNumber,
      // Arv fra parent
      client_name: parentProject.client_name || '',
      client_contact: parentProject.client_contact || '',
      client_email: parentProject.client_email || '',
      client_phone: parentProject.client_phone || '',
      address: parentProject.address || '',
      project_manager: parentProject.project_manager || '',
      project_manager_name: parentProject.project_manager_name || '',
      project_manager_phone: parentProject.project_manager_phone || '',
      architects: parentProject.architects || [],
      consultants: parentProject.consultants || [],
      subcontractors: parentProject.subcontractors || [],
      inherit_from_parent: true,
      status: parentProject.status || 'planlagt'
    };

    // Legg til beboer/annen kontakt hvis ønsket
    if (formData.addResident && formData.resident_name) {
      projectData.resident_name = formData.resident_name;
      projectData.resident_phone = formData.resident_phone || '';
      projectData.resident_email = formData.resident_email || '';
    }

    createMutation.mutate(projectData);
  };

  const isSubproject = parentProject?.type === 'project';
  const typeLabel = isSubproject ? 'Enhet' : 'Delprosjekt';
  const typeValue = isSubproject ? 'unit' : 'subproject';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Opprett {typeLabel.toLowerCase()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {parentProject && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium">Overordnet prosjekt</p>
              <p className="text-sm text-emerald-900 font-semibold">{parentProject.name}</p>
            </div>
          )}

          <div>
            <Label>Navn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={`${typeLabel} navn`}
              required
              className="mt-1.5 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select 
              value={formData.type}
              onValueChange={(v) => setFormData({...formData, type: v})}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={typeValue}>{typeLabel}</SelectItem>
                <SelectItem value="common_area">Fellesareal</SelectItem>
                <SelectItem value="exterior">Utvendig</SelectItem>
                <SelectItem value="roof">Tak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Denne {typeLabel.toLowerCase()}en arver automatisk informasjon om kunde, adresse, arkitekter og rådgivere fra overordnet prosjekt. Du kan endre disse senere.
            </p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                id="addResident"
                checked={formData.addResident}
                onChange={(e) => setFormData({...formData, addResident: e.target.checked})}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="addResident" className="text-sm font-medium text-slate-700">
                Legg til beboer/annen kontakt
              </label>
            </div>

            {formData.addResident && (
              <div className="space-y-3 pl-7 border-l-2 border-slate-200">
                <div>
                  <Label className="text-xs">Navn</Label>
                  <Input
                    value={formData.resident_name}
                    onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                    placeholder="Navn på beboer/kontakt"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefon</Label>
                  <Input
                    value={formData.resident_phone}
                    onChange={(e) => setFormData({...formData, resident_phone: e.target.value})}
                    placeholder="Telefonnummer"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">E-post</Label>
                  <Input
                    value={formData.resident_email}
                    onChange={(e) => setFormData({...formData, resident_email: e.target.value})}
                    placeholder="E-postadresse"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl"
            >
              Avbryt
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending || !formData.name}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {createMutation.isPending ? 'Oppretter...' : `Opprett ${typeLabel.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}