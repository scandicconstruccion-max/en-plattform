import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import EditUserPanel from '@/components/admin/EditUserPanel';
import BulkEditDialog from '@/components/admin/BulkEditDialog';
import UserAuditLogDialog from '@/components/admin/UserAuditLogDialog';
import CreateUserDialog from '@/components/admin/CreateUserDialog';
import RoleTilgangMatrise from '@/components/admin/RoleTilgangMatrise';
import { ROLE_LABELS } from '@/components/shared/permissions';
import { 
  Users, Search, Edit, Trash2, Mail, History, CheckCircle2, XCircle,
  Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BrukerAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [auditLogUser, setAuditLogUser] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      const matchesProject = projectFilter === 'all' || 
        user.assigned_projects?.includes(projectFilter) ||
        user.managed_projects?.includes(projectFilter);
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active !== false) ||
        (statusFilter === 'inactive' && user.is_active === false);

      return matchesSearch && matchesRole && matchesProject && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, projectFilter, statusFilter]);

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Bruker slettet');
      setDeleteUserId(null);
    },
    onError: () => {
      toast.error('Kunne ikke slette bruker');
    }
  });

  // Send invite email mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (user) => {
      await base44.users.inviteUser(user.email, user.role || 'ansatt');
    },
    onSuccess: () => {
      toast.success('Invitasjon sendt');
    },
    onError: () => {
      toast.error('Kunne ikke sende invitasjon');
    }
  });

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle all users
  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleRowExpand = (userId) => {
    setExpandedRows(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Ukjent';
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Du har ikke tilgang til denne siden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Brukeradministrasjon"
        subtitle={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'bruker' : 'brukere'}`}
        icon={Users}
        onAdd={() => setCreateUserOpen(true)}
        addLabel="Ny bruker"
      />

      <div className="px-6 lg:px-8 py-8 space-y-6">
        {/* Filters and Actions */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk etter navn eller e-post..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Alle roller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle roller</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="prosjektleder">Prosjektleder</SelectItem>
                <SelectItem value="ansatt">Ansatt</SelectItem>
                <SelectItem value="regnskapsforer">Regnskapsfører</SelectItem>
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Alle prosjekter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle prosjekter</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {selectedUsers.length} {selectedUsers.length === 1 ? 'bruker' : 'brukere'} valgt
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkEditOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Masse-rediger
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUsers([])}
              >
                Avbryt valg
              </Button>
            </div>
          )}
        </Card>

        {/* Users Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleAllUsers}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-slate-900">Navn</th>
                  <th className="p-4 text-left text-sm font-semibold text-slate-900">E-post</th>
                  <th className="p-4 text-left text-sm font-semibold text-slate-900">Rolle</th>
                  <th className="p-4 text-left text-sm font-semibold text-slate-900">Prosjekter</th>
                  <th className="p-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="p-4 text-right text-sm font-semibold text-slate-900">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => {
                  const isExpanded = expandedRows[user.id];
                  const userProjects = [
                    ...(user.assigned_projects || []),
                    ...(user.managed_projects || [])
                  ];
                  const uniqueProjects = [...new Set(userProjects)];

                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{user.full_name || 'Ikke angitt'}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{user.email}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-normal">
                            {ROLE_LABELS[user.role] || user.role || 'Bruker'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {uniqueProjects.length > 0 ? (
                              <>
                                <span className="text-sm text-slate-600">
                                  {uniqueProjects.length} {uniqueProjects.length === 1 ? 'prosjekt' : 'prosjekter'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpand(user.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">Ingen</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_active !== false ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">Aktiv</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Inaktiv</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAuditLogUser(user)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInviteMutation.mutate(user)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && uniqueProjects.length > 0 && (
                        <tr>
                          <td colSpan="7" className="p-4 bg-slate-50">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">Tildelte prosjekter:</p>
                              <div className="flex flex-wrap gap-2">
                                {uniqueProjects.map(projectId => (
                                  <Badge key={projectId} variant="secondary">
                                    {getProjectName(projectId)}
                                    {user.managed_projects?.includes(projectId) && ' (Leder)'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Ingen brukere funnet
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries(['users']);
          setCreateUserOpen(false);
        }}
        projects={projects}
      />

      {/* Edit User Panel */}
      {editingUser && (
        <EditUserPanel
          user={editingUser}
          projects={projects}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            queryClient.invalidateQueries(['users']);
            setEditingUser(null);
          }}
        />
      )}

      {/* Bulk Edit Dialog */}
      {bulkEditOpen && (
        <BulkEditDialog
          selectedUserIds={selectedUsers}
          users={users}
          projects={projects}
          onClose={() => setBulkEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries(['users']);
            setBulkEditOpen(false);
            setSelectedUsers([]);
          }}
        />
      )}

      {/* Audit Log Dialog */}
      {auditLogUser && (
        <UserAuditLogDialog
          user={auditLogUser}
          onClose={() => setAuditLogUser(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett bruker</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne brukeren? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(deleteUserId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}