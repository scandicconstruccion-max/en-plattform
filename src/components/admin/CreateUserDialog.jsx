import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLE_LABELS, MODULES } from '@/components/shared/permissions';
import { Loader2, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';

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

export default function CreateUserDialog({ open, onClose, onCreated, projects }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'ansatt',
    assigned_projects: [],
    managed_projects: [],
    custom_module_access: [],
    is_active: true
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // Invite user to the app
      await base44.users.inviteUser(data.email, data.role);

      // Log the creation
      await base44.entities.UserAuditLog.create({
        user_email: data.email,
        user_name: data.full_name,
        action_type: 'user_invited',
        changed_by: currentUser?.email,
        changed_by_name: currentUser?.full_name,
        new_value: JSON.stringify({
          role: data.role,
          assigned_projects: data.assigned_projects,
          managed_projects: data.managed_projects
        }),
        description: `Ny bruker opprettet med rolle ${ROLE_LABELS[data.role]}`
      });

      // Send welcome email with details
      const projectNames = data.assigned_projects.
      map((pid) => projects.find((p) => p.id === pid)?.name).
      filter(Boolean).
      join(', ');

      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: 'Velkommen til KS System',
        body: `
Hei ${data.full_name},

Du har fått tilgang til KS System!

Din rolle: ${ROLE_LABELS[data.role]}
${projectNames ? `Dine prosjekter: ${projectNames}` : ''}

Klikk her for å logge inn og sette passord:
${window.location.origin}

Mvh,
KS System Team
        `
      });
    },
    onSuccess: () => {
      toast.success('Bruker opprettet og invitasjon sendt');
      setFormData({
        full_name: '',
        email: '',
        role: 'ansatt',
        assigned_projects: [],
        managed_projects: [],
        custom_module_access: [],
        is_active: true
      });
      onCreated();
    },
    onError: (error) => {
      toast.error('Kunne ikke opprette bruker: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      toast.error('Fyll inn navn og e-post');
      return;
    }

    createUserMutation.mutate(formData);
  };

  const toggleProject = (projectId, type) => {
    if (type === 'assigned') {
      setFormData((prev) => ({
        ...prev,
        assigned_projects: prev.assigned_projects.includes(projectId) ?
        prev.assigned_projects.filter((id) => id !== projectId) :
        [...prev.assigned_projects, projectId]
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        managed_projects: prev.managed_projects.includes(projectId) ?
        prev.managed_projects.filter((id) => id !== projectId) :
        [...prev.managed_projects, projectId]
      }));
    }
  };

  const toggleModule = (moduleKey) => {
    setFormData((prev) => ({
      ...prev,
      custom_module_access: prev.custom_module_access.includes(moduleKey) ?
      prev.custom_module_access.filter((k) => k !== moduleKey) :
      [...prev.custom_module_access, moduleKey]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Opprett ny bruker</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Navn *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ola Nordmann"
                  required />

              </div>

              <div className="space-y-2">
                <Label>E-post *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="ola@firma.no"
                  required />

                <p className="text-xs text-slate-500">
                  Invitasjon med innloggingslenke sendes automatisk
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Rolle *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prosjektleder">Prosjektleder</SelectItem>
                    <SelectItem value="ansatt">Ansatt</SelectItem>
                    <SelectItem value="regnskapsforer">Regnskapsfører</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Rollen bestemmer standard tilgang til moduler og funksjoner
                </p>
              </div>
            </div>

            {/* Project Assignment */}
            {formData.role !== 'regnskapsforer' &&
            <div className="space-y-3">
                <Label>Prosjekttilknytning</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                  {projects.length === 0 ?
                <p className="text-sm text-slate-500">Ingen prosjekter tilgjengelig</p> :

                projects.map((project) =>
                <div key={project.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-slate-500">{project.project_number}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                        id={`new-assigned-${project.id}`}
                        checked={formData.assigned_projects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id, 'assigned')} />

                            <Label htmlFor={`new-assigned-${project.id}`} className="text-xs cursor-pointer">
                              Tildelt
                            </Label>
                          </div>
                          {formData.role === 'prosjektleder' &&
                    <div className="flex items-center gap-2">
                              <Checkbox
                        id={`new-managed-${project.id}`}
                        checked={formData.managed_projects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id, 'managed')} />

                              <Label htmlFor={`new-managed-${project.id}`} className="text-xs cursor-pointer">
                                Leder
                              </Label>
                            </div>
                    }
                        </div>
                      </div>
                )
                }
                </div>
              </div>
            }

            {/* Custom Module Access */}
            <div className="space-y-3">
              <Label>Tilpasset modultilgang (valgfritt)</Label>
              <p className="text-xs text-slate-500">
                Standard tilgang baseres på rolle. Overstyr her om nødvendig.
              </p>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {Object.values(MODULES).map((moduleKey) =>
                <div key={moduleKey} className="flex items-center space-x-2">
                    <Checkbox
                    id={`new-module-${moduleKey}`}
                    checked={formData.custom_module_access.includes(moduleKey)}
                    onCheckedChange={() => toggleModule(moduleKey)} />

                    <Label htmlFor={`new-module-${moduleKey}`} className="cursor-pointer text-sm">
                      {moduleLabels[moduleKey] || moduleKey}
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button
            type="submit"
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending ?
            <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oppretter...
              </> :

            <>
                <UserPlus className="h-4 w-4 mr-2" />
                Lagre og send invitasjon
              </>
            }
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}