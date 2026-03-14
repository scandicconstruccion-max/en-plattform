import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import GroupSidebar from '@/components/chat/GroupSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import { MessageSquare, Hash, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Chat() {
  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['chatGroups'],
    queryFn: () => base44.entities.ChatGroup.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
    initialData: [],
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatGroup.create(data),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
      setActiveGroup(newGroup);
      toast.success('Chatgruppe opprettet');
    },
  });

  const canCreateGroup = user?.role === 'admin' || user?.role === 'prosjektleder';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PageHeader
        title="Intern Chat"
        subtitle="Prosjektbasert kommunikasjon"
        onAdd={canCreateGroup ? () => setShowCreateDialog(true) : undefined}
        addLabel="Ny gruppe"
      />

      <div className="flex-1 flex px-4 lg:px-8 py-4 gap-4 h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <Card className="w-72 border-0 shadow-sm flex-shrink-0 overflow-hidden flex flex-col">
          <GroupSidebar
            groups={groups}
            projects={projects}
            activeGroupId={activeGroup?.id}
            onSelectGroup={setActiveGroup}
            onCreateGroup={() => setShowCreateDialog(true)}
            canCreateGroup={canCreateGroup}
            user={user}
          />
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 border-0 shadow-sm overflow-hidden flex flex-col">
          {activeGroup ? (
            <ChatWindow group={activeGroup} user={user} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Velg en gruppe</h3>
              <p className="text-slate-500 max-w-sm">
                Velg en chatgruppe fra listen til venstre for å starte, eller opprett en ny gruppe.
              </p>
              {groups.filter(g => g.members?.includes(user?.email) || g.created_by === user?.email).length === 0 && (
                <p className="text-sm text-slate-400 mt-4">
                  {canCreateGroup
                    ? 'Du er ikke med i noen grupper ennå. Opprett en ny gruppe for å komme i gang.'
                    : 'Du er ikke lagt til i noen grupper ennå. Be en administrator om å legge deg til.'}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projects={projects}
        allUsers={allUsers}
        employees={employees}
        onSubmit={(data) => createGroupMutation.mutate({ ...data, created_by_name: user?.full_name })}
        isLoading={createGroupMutation.isPending}
      />
    </div>
  );
}