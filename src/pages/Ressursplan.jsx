import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import OptimizedResourceCalendar from '@/components/ressursplan/OptimizedResourceCalendar';
import CreateAssignmentDialog from '@/components/ressursplan/CreateAssignmentDialog';
import ConflictDialog from '@/components/ressursplan/ConflictDialog';
import ExternalResourceDialog from '@/components/ressursplan/ExternalResourceDialog';
import InlineEditDialog from '@/components/ressursplan/InlineEditDialog';
import { Users, UserPlus, Calendar, Grid3x3, List, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { isWithinInterval, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Ressursplan() {
  const [viewMode, setViewMode] = useState('week');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showInlineEdit, setShowInlineEdit] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [optimisticAssignments, setOptimisticAssignments] = useState([]);
  const [editingExternal, setEditingExternal] = useState(null);
  const [filters, setFilters] = useState({
    resourceType: 'all',
    projectId: 'all'
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['resourcePlannerPermissions'],
    queryFn: () => base44.entities.ResourcePlannerPermission.list(),
    initialData: []
  });

  const userPermission = permissions.find(p => p.bruker_id === user?.email);
  const canEdit = user?.role === 'admin' || userPermission?.kan_redigere || false;
  const canDelete = user?.role === 'admin' || userPermission?.kan_slette || false;

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const allEmployees = await base44.entities.Employee.list();
      return allEmployees.filter(e => e.is_active);
    },
    initialData: []
  });

  // Fetch external resources
  const { data: externals = [] } = useQuery({
    queryKey: ['externalResources'],
    queryFn: async () => {
      const allExternals = await base44.entities.ExternalResource.list();
      return allExternals.filter(e => e.aktiv);
    },
    initialData: []
  });

  // Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['resourceAssignments'],
    queryFn: () => base44.entities.ResourceAssignment.list('-created_date'),
    initialData: []
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      const results = [];
      for (const resourceId of data.resource_ids) {
        const resource = data.resource_type === 'employee'
          ? employees.find(e => e.id === resourceId)
          : externals.find(e => e.id === resourceId);

        const project = projects.find(p => p.id === data.prosjekt_id);
        
        const assignmentData = {
          prosjekt_id: data.prosjekt_id,
          prosjekt_navn: project?.name || '',
          resource_type: data.resource_type,
          resource_id: resourceId,
          resource_navn: resource?.first_name 
            ? `${resource.first_name} ${resource.last_name}` 
            : resource?.navn || '',
          start_dato_tid: data.start_dato_tid,
          slutt_dato_tid: data.slutt_dato_tid,
          rolle_pa_prosjekt: data.rolle_pa_prosjekt,
          kommentar: data.kommentar,
          status: 'planlagt',
          opprettet_av: user?.email,
          opprettet_av_navn: user?.full_name,
          change_log: [{
            timestamp: new Date().toISOString(),
            user_email: user?.email,
            user_name: user?.full_name,
            action: 'Opprettet',
            changes: 'Ressursplanlegging opprettet'
          }]
        };

        results.push(await base44.entities.ResourceAssignment.create(assignmentData));
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAssignments'] });
      setShowCreateDialog(false);
      toast.success('Ressursplanlegging opprettet');
    },
    onError: () => {
      toast.error('Kunne ikke opprette planlegging');
    }
  });

  // Update assignment mutation with optimistic update
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourceAssignment.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['resourceAssignments'] });
      
      // Snapshot previous value
      const previousAssignments = queryClient.getQueryData(['resourceAssignments']);
      
      // Optimistically update
      queryClient.setQueryData(['resourceAssignments'], (old) =>
        old.map(a => a.id === id ? { ...a, ...data } : a)
      );
      
      return { previousAssignments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['resourceAssignments'], context.previousAssignments);
      toast.error('Kunne ikke oppdatere planlegging');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAssignments'] });
    },
    onSuccess: () => {
      toast.success('Planlegging oppdatert');
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAssignments'] });
      toast.success('Planlegging slettet');
    },
    onError: () => {
      toast.error('Kunne ikke slette planlegging');
    }
  });

  // External resource mutations
  const createExternalMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalResource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalResources'] });
      setShowExternalDialog(false);
      setEditingExternal(null);
      toast.success('Ekstern ressurs opprettet');
    }
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalResource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalResources'] });
      setShowExternalDialog(false);
      setEditingExternal(null);
      toast.success('Ekstern ressurs oppdatert');
    }
  });

  // Check for conflicts
  const checkConflicts = (resourceId, startDatoTid, sluttDatoTid, excludeId = null) => {
    const start = parseISO(startDatoTid);
    const end = parseISO(sluttDatoTid);
    
    return assignments.filter(a => {
      if (a.id === excludeId) return false;
      if (a.resource_id !== resourceId) return false;
      
      const aStart = parseISO(a.start_dato_tid);
      const aEnd = parseISO(a.slutt_dato_tid);
      
      return (
        isWithinInterval(start, { start: aStart, end: aEnd }) ||
        isWithinInterval(end, { start: aStart, end: aEnd }) ||
        isWithinInterval(aStart, { start, end }) ||
        isWithinInterval(aEnd, { start, end })
      );
    });
  };

  // Handle assignment drop (drag and drop) with optimistic update
  const handleAssignmentDrop = (assignment, newResourceId, newStartDatoTid, newSluttDatoTid) => {
    const foundConflicts = checkConflicts(
      newResourceId,
      newStartDatoTid,
      newSluttDatoTid,
      assignment.id
    );

    const resource = newResourceId !== assignment.resource_id
      ? (allResources.find(r => r.id === newResourceId))
      : null;

    const updatedData = {
      resource_id: newResourceId,
      resource_navn: resource ? resource.navn : assignment.resource_navn,
      start_dato_tid: newStartDatoTid,
      slutt_dato_tid: newSluttDatoTid,
      change_log: [
        ...(assignment.change_log || []),
        {
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name,
          action: 'Flyttet',
          changes: `Planlegging flyttet via drag-and-drop`
        }
      ]
    };

    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setPendingAssignment({ 
        ...assignment, 
        ...updatedData,
        newResourceId, 
        newStartDatoTid,
        newSluttDatoTid
      });
      setShowConflictDialog(true);
    } else {
      // Immediate UI update
      updateAssignmentMutation.mutate({ id: assignment.id, data: updatedData });
    }
  };

  const handleConflictConfirm = () => {
    if (pendingAssignment) {
      if (pendingAssignment.id) {
        // Updating existing assignment
        const updatedData = {
          ...pendingAssignment,
          resource_id: pendingAssignment.newResourceId,
          start_dato_tid: pendingAssignment.newStartDatoTid || pendingAssignment.start_dato_tid,
          slutt_dato_tid: pendingAssignment.newSluttDatoTid || pendingAssignment.slutt_dato_tid,
          change_log: [
            ...(pendingAssignment.change_log || []),
            {
              timestamp: new Date().toISOString(),
              user_email: user?.email,
              user_name: user?.full_name,
              action: 'Flyttet med konflikt',
              changes: `Ressurs endret med overlappende planlegging`
            }
          ]
        };
        updateAssignmentMutation.mutate({ id: pendingAssignment.id, data: updatedData });
      } else {
        // Creating new assignment
        createAssignmentMutation.mutate(pendingAssignment);
      }
    }
    setShowConflictDialog(false);
    setPendingAssignment(null);
    setConflicts([]);
  };

  const handleCreateAssignment = (formData) => {
    // Check for conflicts for each resource
    let allConflicts = [];
    for (const resourceId of formData.resource_ids) {
      const resourceConflicts = checkConflicts(resourceId, formData.start_dato_tid, formData.slutt_dato_tid);
      if (resourceConflicts.length > 0) {
        allConflicts = [...allConflicts, ...resourceConflicts];
      }
    }

    if (allConflicts.length > 0) {
      setConflicts(allConflicts);
      setPendingAssignment(formData);
      setShowConflictDialog(true);
    } else {
      createAssignmentMutation.mutate(formData);
    }
  };

  const handleExternalSubmit = (formData) => {
    if (editingExternal) {
      updateExternalMutation.mutate({ id: editingExternal.id, data: formData });
    } else {
      createExternalMutation.mutate(formData);
    }
  };

  const handleInlineEdit = (formData) => {
    const updatedData = {
      ...formData,
      start_dato_tid: formData.start_dato_tid.includes('T') ? `${formData.start_dato_tid}:00` : formData.start_dato_tid,
      slutt_dato_tid: formData.slutt_dato_tid.includes('T') ? `${formData.slutt_dato_tid}:00` : formData.slutt_dato_tid,
      change_log: [
        ...(selectedAssignment.change_log || []),
        {
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name,
          action: 'Redigert',
          changes: 'Planlegging oppdatert via inline-redigering'
        }
      ]
    };
    updateAssignmentMutation.mutate({ 
      id: selectedAssignment.id, 
      data: updatedData 
    });
    setShowInlineEdit(false);
    setSelectedAssignment(null);
  };

  const handleAssignmentResize = (assignment, newStartDatoTid, newSluttDatoTid) => {
    const updatedData = {
      start_dato_tid: newStartDatoTid,
      slutt_dato_tid: newSluttDatoTid,
      change_log: [
        ...(assignment.change_log || []),
        {
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name,
          action: 'Resizet',
          changes: 'Tidslengde endret via drag'
        }
      ]
    };
    updateAssignmentMutation.mutate({ id: assignment.id, data: updatedData });
  };

  const handleQuickCreate = (resourceId, startTime, endTime) => {
    const resource = allResources.find(r => r.id === resourceId);
    if (!resource) return;

    // Show create dialog with pre-filled data
    setShowCreateDialog(true);
    // You can extend CreateAssignmentDialog to accept initial values
  };

  // Combine all resources
  const allResources = [
    ...employees.map(e => ({
      id: e.id,
      navn: `${e.first_name} ${e.last_name}`,
      type: 'employee',
      stilling: e.position,
      telefon: e.phone,
      epost: e.email
    })),
    ...externals.map(e => ({
      id: e.id,
      navn: e.navn,
      type: 'external',
      rolle: e.rolle,
      firma: e.firma,
      telefon: e.telefon,
      epost: e.epost
    }))
  ];

  // Apply filters
  const filteredResources = allResources.filter(r => {
    if (filters.resourceType !== 'all' && r.type !== filters.resourceType) return false;
    return true;
  });

  const filteredAssignments = assignments.filter(a => {
    if (filters.projectId !== 'all' && a.prosjekt_id !== filters.projectId) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      <PageHeader
        title="Ressursplanlegger"
        subtitle="Planlegg ressurser på tvers av prosjekter"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Innstillinger'))}
              className="gap-2 rounded-xl"
            >
              <Settings className="h-4 w-4" />
              Innstillinger
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingExternal(null);
                setShowExternalDialog(true);
              }}
              className="gap-2 rounded-xl"
            >
              <UserPlus className="h-4 w-4" />
              Ny ekstern
            </Button>
            {canEdit && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                <Calendar className="h-4 w-4" />
                Ny planlegging
              </Button>
            )}
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Filters and View Mode */}
        <Card className="border-0 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[140px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dag</SelectItem>
                  <SelectItem value="week">Uke</SelectItem>
                  <SelectItem value="twoweeks">2 uker</SelectItem>
                  <SelectItem value="month">Måned</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.resourceType} 
                onValueChange={(v) => setFilters({ ...filters, resourceType: v })}
              >
                <SelectTrigger className="w-[160px] rounded-xl">
                  <SelectValue placeholder="Ressurstype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle ressurser</SelectItem>
                  <SelectItem value="employee">Ansatte</SelectItem>
                  <SelectItem value="external">Eksterne</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.projectId} 
                onValueChange={(v) => setFilters({ ...filters, projectId: v })}
              >
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prosjekter</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-slate-600">
              {filteredResources.length} ressurs(er) • {filteredAssignments.length} planlegging(er)
            </div>
          </div>
        </Card>

        {/* Calendar */}
        {filteredResources.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ingen ressurser"
            description="Legg til ansatte eller eksterne ressurser for å komme i gang"
            actionLabel="Ny ekstern ressurs"
            onAction={() => setShowExternalDialog(true)}
          />
        ) : (
          <OptimizedResourceCalendar
            assignments={filteredAssignments}
            resources={filteredResources}
            projects={projects}
            viewMode={viewMode}
            onAssignmentDrop={handleAssignmentDrop}
            onAssignmentClick={(a) => {
              setSelectedAssignment(a);
              setShowInlineEdit(true);
            }}
            onAssignmentResize={handleAssignmentResize}
            onCreateAssignment={handleQuickCreate}
            canEdit={canEdit}
            optimisticAssignments={optimisticAssignments}
            conflicts={conflicts}
          />
        )}

        {/* Project Legend */}
        {projects.length > 0 && (
          <Card className="border-0 shadow-sm p-4">
            <h3 className="font-medium text-slate-900 mb-3">Prosjekter</h3>
            <div className="flex flex-wrap gap-3">
              {projects.map((project, idx) => {
                const colors = [
                  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
                  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'
                ];
                return (
                  <div key={project.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${colors[idx % colors.length]}`} />
                    <span className="text-sm text-slate-600">{project.name}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateAssignmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        employees={employees}
        externals={externals}
        projects={projects}
        onSubmit={handleCreateAssignment}
        isLoading={createAssignmentMutation.isPending}
      />

      <ConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflicts={conflicts}
        onConfirm={handleConflictConfirm}
        resourceName={pendingAssignment?.resource_navn}
      />

      <ExternalResourceDialog
        open={showExternalDialog}
        onOpenChange={(open) => {
          setShowExternalDialog(open);
          if (!open) setEditingExternal(null);
        }}
        resource={editingExternal}
        onSubmit={handleExternalSubmit}
        isLoading={createExternalMutation.isPending || updateExternalMutation.isPending}
      />

      <InlineEditDialog
        open={showInlineEdit}
        onOpenChange={(open) => {
          setShowInlineEdit(open);
          if (!open) setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        projects={projects}
        onSubmit={handleInlineEdit}
        isLoading={updateAssignmentMutation.isPending}
      />
    </div>
  );
}