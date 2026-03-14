import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageSquare, Link2, X, ChevronDown } from 'lucide-react';
import ChatWindow from './ChatWindow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

/**
 * DocumentChatDrawer
 * Props:
 *   entityName  - e.g. 'Deviation', 'Order', 'Checklist', 'ChangeNotification', 'Quote'
 *   documentId  - the record id
 *   projectId   - used to filter relevant chat groups
 *   chatGroupId - current linked group id (from the document)
 *   onLinked    - callback(newGroupId) when user links/unlinks a group
 */
export default function DocumentChatDrawer({ entityName, documentId, projectId, chatGroupId, onLinked }) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // All groups for this project
  const { data: groups = [] } = useQuery({
    queryKey: ['chatGroups'],
    queryFn: () => base44.entities.ChatGroup.list(),
    select: (data) => data.filter(g => g.project_id === projectId),
    enabled: !!projectId,
  });

  // Currently linked group
  const linkedGroup = groups.find(g => g.id === chatGroupId);

  const linkMutation = useMutation({
    mutationFn: (groupId) =>
      base44.entities[entityName].update(documentId, { chat_group_id: groupId || null }),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: [entityName.toLowerCase(), documentId] });
      if (onLinked) onLinked(groupId || null);
      setSelecting(false);
      if (groupId) {
        const g = groups.find(x => x.id === groupId);
        toast.success(`Koblet til ${g?.name || 'chatgruppe'}`);
      } else {
        toast.success('Kobling fjernet');
      }
    },
  });

  return (
    <>
      <Button
        variant={chatGroupId ? 'default' : 'outline'}
        className={`rounded-xl gap-2 ${chatGroupId ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        {chatGroupId ? `Chat: ${linkedGroup?.name || '…'}` : 'Koble til chat'}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                Intern chat
              </span>
            </SheetTitle>

            {/* Link / unlink controls */}
            <div className="mt-3">
              {!selecting && !chatGroupId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() => setSelecting(true)}
                >
                  <Link2 className="h-4 w-4" />
                  Koble til chatgruppe
                </Button>
              )}

              {!selecting && chatGroupId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Koblet til:</span>
                  <span className="text-sm font-medium text-emerald-700">{linkedGroup?.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-500 h-7 px-2"
                    onClick={() => linkMutation.mutate(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 h-7 px-2 text-xs"
                    onClick={() => setSelecting(true)}
                  >
                    Bytt
                  </Button>
                </div>
              )}

              {selecting && (
                <div className="flex items-center gap-2">
                  <Select onValueChange={(val) => linkMutation.mutate(val)}>
                    <SelectTrigger className="rounded-xl h-8 text-sm w-56">
                      <SelectValue placeholder="Velg gruppe…" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 && (
                        <SelectItem value="__none" disabled>Ingen grupper på prosjektet</SelectItem>
                      )}
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setSelecting(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Chat area */}
          <div className="flex-1 min-h-0">
            {linkedGroup ? (
              <ChatWindow
                group={linkedGroup}
                user={user}
                allUsers={allUsers}
                employees={employees}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium text-slate-600">Ingen chatgruppe koblet</p>
                <p className="text-sm mt-1">Koble dette dokumentet til en eksisterende chatgruppe for å chatte om det her.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}