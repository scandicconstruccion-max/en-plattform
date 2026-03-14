import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Search, FolderOpen, Users, ChevronDown, ChevronRight, Hash } from 'lucide-react';

export default function GroupSidebar({ groups, projects, activeGroupId, onSelectGroup, onCreateGroup, canCreateGroup, user }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  // Filter groups the current user is a member of
  const myGroups = groups.filter(g =>
    g.members?.includes(user?.email) || g.created_by === user?.email
  );

  // Filter by search
  const filtered = myGroups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by project
  const byProject = filtered.reduce((acc, group) => {
    const key = group.project_id || 'ingen';
    const name = group.project_name || 'Uten prosjekt';
    if (!acc[key]) acc[key] = { name, groups: [] };
    acc[key].groups.push(group);
    return acc;
  }, {});

  const toggleCollapse = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Chatgrupper</h3>
          {canCreateGroup && (
            <Button
              size="sm"
              onClick={onCreateGroup}
              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Søk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm rounded-lg"
          />
        </div>
      </div>

      {/* Groups list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.keys(byProject).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm px-4">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Du er ikke med i noen grupper</p>
              {canCreateGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateGroup}
                  className="mt-3 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Opprett gruppe
                </Button>
              )}
            </div>
          ) : (
            Object.entries(byProject).map(([projectId, { name: projectName, groups: projectGroups }]) => (
              <div key={projectId} className="mb-4">
                {/* Project header */}
                <button
                  onClick={() => toggleCollapse(projectId)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                  {collapsed[projectId]
                    ? <ChevronRight className="h-3.5 w-3.5" />
                    : <ChevronDown className="h-3.5 w-3.5" />
                  }
                  <FolderOpen className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="truncate">{projectName}</span>
                  <Badge className="ml-auto bg-slate-100 text-slate-500 text-xs px-1.5 py-0 font-normal">
                    {projectGroups.length}
                  </Badge>
                </button>

                {!collapsed[projectId] && (
                  <div className="space-y-0.5 mt-1 pl-1">
                    {projectGroups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => onSelectGroup(group)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors",
                          activeGroupId === group.id
                            ? "bg-emerald-100 text-emerald-800"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Hash className="h-4 w-4 flex-shrink-0 opacity-60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          {group.members?.length > 0 && (
                            <p className="text-xs text-slate-400">{group.members.length} medlemmer</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* User info */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}