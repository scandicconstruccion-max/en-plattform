import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function PunktForm({ open, onOpenChange, formData, setFormData, onSubmit, isEdit, project }) {
  const [uploading, setUploading] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
  });

  // Get subcontractors from project
  const subcontractors = project?.subcontractors || [];

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newImages = [...(formData.images || [])];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newImages.push(file_url);
    }

    setFormData({...formData, images: newImages});
    setUploading(false);
  };

  const removeImage = (index) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({...formData, images: newImages});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger punkt' : 'Legg til punkt'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Beskrivelse *</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Beskriv hva som skal utbedres/kontrolleres..."
              required
              rows={3}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Plassering/rom</Label>
            <Input
              value={formData.location || ''}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="f.eks. 2. etasje, rom 204"
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label>Bilder</Label>
            <div className="mt-1.5 space-y-3">
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-500">Last opp bilder</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {formData.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Bilde ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Frist for utbedring</Label>
            <Input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Assign to */}
          <div>
            <Label>Tildel til</Label>
            <Select 
              value={formData.assigned_to_type || 'subcontractor'} 
              onValueChange={(v) => setFormData({...formData, assigned_to_type: v, assigned_employee_id: '', assigned_subcontractor: null})}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subcontractor">Underentreprenør</SelectItem>
                <SelectItem value="employee">Ansatt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.assigned_to_type === 'employee' ? (
            <div>
              <Label>Velg ansatt</Label>
              <Select 
                value={formData.assigned_employee_id || ''} 
                onValueChange={(v) => setFormData({...formData, assigned_employee_id: v})}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {emp.position && `(${emp.position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              {subcontractors.length > 0 ? (
                <div>
                  <Label>Velg fra prosjektets underentreprenører</Label>
                  <Select 
                    value={formData.assigned_subcontractor?.name || ''} 
                    onValueChange={(v) => {
                      const sub = subcontractors.find(s => s.name === v);
                      setFormData({...formData, assigned_subcontractor: sub});
                    }}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Velg underentreprenør" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcontractors.map((sub, idx) => (
                        <SelectItem key={idx} value={sub.name}>
                          {sub.name} {sub.trade && `(${sub.trade})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ingen underentreprenører på prosjektet. Legg inn manuelt:</p>
                  <div>
                    <Label>Firma</Label>
                    <Input
                      value={formData.assigned_subcontractor?.name || ''}
                      onChange={(e) => setFormData({...formData, assigned_subcontractor: {...(formData.assigned_subcontractor || {}), name: e.target.value}})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>E-post</Label>
                      <Input
                        type="email"
                        value={formData.assigned_subcontractor?.email || ''}
                        onChange={(e) => setFormData({...formData, assigned_subcontractor: {...(formData.assigned_subcontractor || {}), email: e.target.value}})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input
                        value={formData.assigned_subcontractor?.phone || ''}
                        onChange={(e) => setFormData({...formData, assigned_subcontractor: {...(formData.assigned_subcontractor || {}), phone: e.target.value}})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              {isEdit ? 'Oppdater' : 'Legg til'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}