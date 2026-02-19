import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ROLE_LABELS, MODULES } from '@/components/shared/permissions';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export default function BulkEditDialog({ selectedUserIds, users, projects, onClose, onSaved }) {
  const [editRole, setEditRole] = useState(false);
  const [editProjects, setEditProjects] = useState(false);
  const [editModules, setEditModules] = useState(false);
  const [editStatus, setEditStatus] = useState(false);

  const [role, setRole] = useState('ansatt');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [isActive, setIsActive] = useState(true);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
      
      for (const user of selectedUsers) {
        const updates = {};
        
        if (editRole) updates.role = role;
        if (editProjects) updates.assigned_projects = selectedProjects;
        if (editModules) updates.custom_module_access = selectedModules;
        if (editStatus) updates.is_active = isActive;

        await base44.entities.User.update(user.id, updates);

        // Log the change
        await base44.entities.UserAuditLog.create({
          user_email: user.email,
          user_name: user.full_name,
          action_type: 'role_changed',
          changed_by: currentUser?.email,
          changed_by_name: currentUser?.full_name,
          description: `Masse-redigering: ${Object.keys(updates).join(', ')}`
        });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedUserIds.length} brukere oppdatert`);
      onSaved();
    },
    onError: () => {
      toast.error('Kunne ikke oppdatere brukere');
    }
  });

  const toggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleModule = (moduleKey) => {
    setSelectedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(k => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Masse-rediger brukere</DialogTitle>
          <p className="text-sm text-slate-600">
            Redigerer {selectedUserIds.length} {selectedUserIds.length === 1 ? 'bruker' : 'brukere'}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Role */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-role"
                  checked={editRole}
                  onCheckedChange={setEditRole}
                />
                <Label htmlFor="edit-role" className="cursor-pointer font-semibold">
                  Endre rolle
                </Label>
              </div>
              {editRole && (
                <Select value={role} onValueChange={setRole}>
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
              )}
            </div>

            {/* Projects */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-projects"
                  checked={editProjects}
                  onCheckedChange={setEditProjects}
                />
                <Label htmlFor="edit-projects" className="cursor-pointer font-semibold">
                  Tildel prosjekter
                </Label>
              </div>
              {editProjects && (
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {projects.map(project => (
                    <div key={project.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-project-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <Label htmlFor={`bulk-project-${project.id}`} className="cursor-pointer text-sm">
                        {project.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modules */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-modules"
                  checked={editModules}
                  onCheckedChange={setEditModules}
                />
                <Label htmlFor="edit-modules" className="cursor-pointer font-semibold">
                  Tilpass modultilgang
                </Label>
              </div>
              {editModules && (
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {Object.values(MODULES).map(moduleKey => (
                    <div key={moduleKey} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-module-${moduleKey}`}
                        checked={selectedModules.includes(moduleKey)}
                        onCheckedChange={() => toggleModule(moduleKey)}
                      />
                      <Label htmlFor={`bulk-module-${moduleKey}`} className="cursor-pointer text-sm">
                        {moduleLabels[moduleKey] || moduleKey}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-status"
                  checked={editStatus}
                  onCheckedChange={setEditStatus}
                />
                <Label htmlFor="edit-status" className="cursor-pointer font-semibold">
                  Endre status
                </Label>
              </div>
              {editStatus && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is-active" className="cursor-pointer">
                    Brukere er aktive
                  </Label>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button 
            onClick={() => bulkUpdateMutation.mutate()}
            disabled={bulkUpdateMutation.isPending || (!editRole && !editProjects && !editModules && !editStatus)}
          >
            {bulkUpdateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oppdaterer...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lagre endringer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}