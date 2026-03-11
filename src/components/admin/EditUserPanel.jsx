import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLE_LABELS, MODULES } from '@/components/shared/permissions';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const moduleLabels = {
  dashboard: 'Dashboard',
  prosjekter: 'Prosjekter',
  avvik: 'Avvik',
  befaring: 'Befaring',
  prosjektfiler: 'Prosjektfiler',
  endringsmeldinger: 'Endringsmeldinger',
  timelister: 'Timelister',
  bildedok: 'Bildedokumentasjon',
  sjekklister: 'Sjekklister',
  tilbud: 'Tilbud',
  ordre: 'Ordre',
  faktura: 'Faktura',
  fdv: 'FDV',
  bestillinger: 'Bestillinger',
  chat: 'Intern Chat',
  ressursplan: 'Ressursplanlegger',
  crm: 'CRM',
  kalender: 'Kalender',
  ansatte: 'Ansatte',
  minbedrift: 'Min bedrift'
};

export default function EditUserPanel({ user, projects, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    display_name: user.display_name || user.full_name || '',
    role: user.role || 'ansatt',
    assigned_projects: user.assigned_projects || [],
    managed_projects: user.managed_projects || [],
    custom_module_access: user.custom_module_access || [],
    is_active: user.is_active !== false
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.User.update(user.id, data);
      
      // Log the change
      await base44.entities.UserAuditLog.create({
        user_email: user.email,
        user_name: user.full_name,
        action_type: 'role_changed',
        changed_by: currentUser?.email,
        changed_by_name: currentUser?.full_name,
        old_value: JSON.stringify({ role: user.role, assigned_projects: user.assigned_projects }),
        new_value: JSON.stringify({ role: data.role, assigned_projects: data.assigned_projects }),
        description: `Rolle endret til ${ROLE_LABELS[data.role]}`
      });

      // Send email notification
      const projectNames = data.assigned_projects
        .map(pid => projects.find(p => p.id === pid)?.name)
        .filter(Boolean)
        .join(', ');

      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Dine rettigheter er oppdatert',
        body: `
Hei ${user.full_name || 'bruker'},

Dine rettigheter i systemet er oppdatert:

Rolle: ${ROLE_LABELS[data.role]}
${projectNames ? `Tildelte prosjekter: ${projectNames}` : ''}
Status: ${data.is_active ? 'Aktiv' : 'Inaktiv'}

Du kan logge inn her: ${window.location.origin}

Mvh,
KS System
        `
      });
    },
    onSuccess: () => {
      toast.success('Bruker oppdatert');
      onSaved();
    },
    onError: () => {
      toast.error('Kunne ikke oppdatere bruker');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const toggleProject = (projectId, type) => {
    if (type === 'assigned') {
      setFormData(prev => ({
        ...prev,
        assigned_projects: prev.assigned_projects.includes(projectId)
          ? prev.assigned_projects.filter(id => id !== projectId)
          : [...prev.assigned_projects, projectId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        managed_projects: prev.managed_projects.includes(projectId)
          ? prev.managed_projects.filter(id => id !== projectId)
          : [...prev.managed_projects, projectId]
      }));
    }
  };

  const toggleModule = (moduleKey) => {
    setFormData(prev => ({
      ...prev,
      custom_module_access: prev.custom_module_access.includes(moduleKey)
        ? prev.custom_module_access.filter(k => k !== moduleKey)
        : [...prev.custom_module_access, moduleKey]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Rediger bruker</h2>
            <p className="text-sm text-slate-600 mt-1">{user.full_name} ({user.email})</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <ScrollArea className="flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="prosjektleder">Prosjektleder</SelectItem>
                  <SelectItem value="ansatt">Ansatt</SelectItem>
                  <SelectItem value="regnskapsforer">Regnskapsfører</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Rollen bestemmer hvilke moduler og funksjoner brukeren har tilgang til
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Bruker er aktiv
              </Label>
            </div>

            {/* Project Assignment */}
            {formData.role !== 'regnskapsforer' && (
              <div className="space-y-3">
                <Label>Prosjekttilknytning</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-sm text-slate-500">Ingen prosjekter tilgjengelig</p>
                  ) : (
                    projects.map(project => (
                      <div key={project.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-slate-500">{project.project_number}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`assigned-${project.id}`}
                              checked={formData.assigned_projects.includes(project.id)}
                              onCheckedChange={() => toggleProject(project.id, 'assigned')}
                            />
                            <Label htmlFor={`assigned-${project.id}`} className="text-xs cursor-pointer">
                              Tildelt
                            </Label>
                          </div>
                          {formData.role === 'prosjektleder' && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`managed-${project.id}`}
                                checked={formData.managed_projects.includes(project.id)}
                                onCheckedChange={() => toggleProject(project.id, 'managed')}
                              />
                              <Label htmlFor={`managed-${project.id}`} className="text-xs cursor-pointer">
                                Leder
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Custom Module Access */}
            <div className="space-y-3">
              <Label>Tilpasset modultilgang (valgfritt)</Label>
              <p className="text-xs text-slate-500">
                Standard tilgang baseres på rolle. Du kan overstyre dette her.
              </p>
              <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                {Object.values(MODULES).map(moduleKey => (
                  <div key={moduleKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={`module-${moduleKey}`}
                      checked={formData.custom_module_access.includes(moduleKey)}
                      onCheckedChange={() => toggleModule(moduleKey)}
                    />
                    <Label htmlFor={`module-${moduleKey}`} className="cursor-pointer text-sm">
                      {moduleLabels[moduleKey] || moduleKey}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lagre endringer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}