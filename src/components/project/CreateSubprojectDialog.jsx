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

    const numRes = await base44.functions.invoke('generateDocumentNumber', { type: 'project' });

    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      parent_id: parentProject.id,
      project_number: numRes.data.documentNumber,
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
    });
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
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Denne {typeLabel.toLowerCase()}en arver automatisk informasjon om kunde, adresse, arkitekter og rådgivere fra overordnet prosjekt. Du kan endre disse senere.
            </p>
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