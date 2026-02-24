import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Settings, Users, ChevronLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RessursplanleggerInnstillinger() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['resourcePlannerPermissions'],
    queryFn: () => base44.entities.ResourcePlannerPermission.list(),
    initialData: []
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['resourcePlannerSettings'],
    queryFn: () => base44.entities.ResourcePlannerSettings.list(),
    initialData: []
  });

  const currentSettings = settings[0] || { standard_start_tid: '07:00', standard_slutt_tid: '15:30' };

  const [timeSettings, setTimeSettings] = useState({
    standard_start_tid: currentSettings.standard_start_tid,
    standard_slutt_tid: currentSettings.standard_slutt_tid
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settings[0]) {
        return base44.entities.ResourcePlannerSettings.update(settings[0].id, data);
      } else {
        return base44.entities.ResourcePlannerSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourcePlannerSettings'] });
      toast.success('Innstillinger lagret');
    }
  });

  const createPermissionMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourcePlannerPermission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourcePlannerPermissions'] });
      toast.success('Tilgang opprettet');
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourcePlannerPermission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourcePlannerPermissions'] });
      toast.success('Tilgang oppdatert');
    }
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourcePlannerPermission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourcePlannerPermissions'] });
      toast.success('Tilgang fjernet');
    }
  });

  const handlePermissionToggle = (userId, userName, field, value) => {
    const existing = permissions.find(p => p.bruker_id === userId);
    
    if (existing) {
      // Update existing permission
      const updatedData = { ...existing, [field]: value };
      
      // If all permissions are false, delete the record
      if (!updatedData.kan_redigere && !updatedData.kan_slette && !updatedData.kan_godkjenne) {
        deletePermissionMutation.mutate(existing.id);
      } else {
        updatePermissionMutation.mutate({ id: existing.id, data: updatedData });
      }
    } else {
      // Create new permission
      createPermissionMutation.mutate({
        bruker_id: userId,
        bruker_navn: userName,
        [field]: value
      });
    }
  };

  const getUserPermission = (userId) => {
    return permissions.find(p => p.bruker_id === userId) || {
      kan_redigere: false,
      kan_slette: false,
      kan_godkjenne: false
    };
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <p className="text-slate-600">Kun administratorer har tilgang til disse innstillingene.</p>
          <Button
            onClick={() => navigate(createPageUrl('Ressursplan'))}
            className="mt-4"
            variant="outline"
          >
            Tilbake til ressursplanlegger
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Ressursplanlegger - Tilgangsstyring"
        subtitle="Administrer hvem som kan opprette, redigere og slette ressursplanlegging"
      />

      <div className="px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Ressursplan'))}
          className="mb-6 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Tilbake til ressursplanlegger
        </Button>

        <Card className="border-0 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Standard arbeidstid</h3>
              <p className="text-sm text-slate-600">
                Nye ressursallokeringer får automatisk disse tidene
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label>Starttid</Label>
              <Input
                type="time"
                value={timeSettings.standard_start_tid}
                onChange={(e) => setTimeSettings({ ...timeSettings, standard_start_tid: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Sluttid</Label>
              <Input
                type="time"
                value={timeSettings.standard_slutt_tid}
                onChange={(e) => setTimeSettings({ ...timeSettings, standard_slutt_tid: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <Button
            onClick={() => updateSettingsMutation.mutate(timeSettings)}
            disabled={updateSettingsMutation.isPending}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            {updateSettingsMutation.isPending ? 'Lagrer...' : 'Lagre innstillinger'}
          </Button>
        </Card>

        <Card className="border-0 shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Brukertilganger</h3>
              <p className="text-sm text-slate-600 mb-6">
                Administratorer har automatisk alle tilganger. Konfigurer tilganger for andre brukere under.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-200">
                <div className="font-medium text-sm text-slate-700">Bruker</div>
                <div className="font-medium text-sm text-slate-700 text-center">Kan redigere</div>
                <div className="font-medium text-sm text-slate-700 text-center">Kan slette</div>
                <div className="font-medium text-sm text-slate-700 text-center">Kan godkjenne</div>
              </div>

              {allUsers.map((u) => {
                const perm = getUserPermission(u.email);
                const isAdmin = u.role === 'admin';
                
                return (
                  <div key={u.id} className="grid grid-cols-4 gap-4 items-center py-3 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">{u.full_name || u.email}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-center">
                      <Switch
                        checked={isAdmin || perm.kan_redigere}
                        disabled={isAdmin}
                        onCheckedChange={(checked) => 
                          handlePermissionToggle(u.email, u.full_name, 'kan_redigere', checked)
                        }
                      />
                    </div>

                    <div className="flex justify-center">
                      <Switch
                        checked={isAdmin || perm.kan_slette}
                        disabled={isAdmin}
                        onCheckedChange={(checked) => 
                          handlePermissionToggle(u.email, u.full_name, 'kan_slette', checked)
                        }
                      />
                    </div>

                    <div className="flex justify-center">
                      <Switch
                        checked={isAdmin || perm.kan_godkjenne}
                        disabled={isAdmin}
                        onCheckedChange={(checked) => 
                          handlePermissionToggle(u.email, u.full_name, 'kan_godkjenne', checked)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Tilgangsnivåer</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <strong>Kan redigere:</strong> Kan opprette nye ressursplanlegginger, flytte og endre eksisterende.
            </div>
            <div>
              <strong>Kan slette:</strong> Kan slette ressursplanlegginger permanent.
            </div>
            <div>
              <strong>Kan godkjenne:</strong> Kan bekrefte og godkjenne planlegginger (fremtidig funksjon).
            </div>
            <div className="pt-3 border-t border-slate-200">
              <strong>Merk:</strong> Alle brukere kan se ressursplanleggeren, men kun de med tilganger kan gjøre endringer.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}