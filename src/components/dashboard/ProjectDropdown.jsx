import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, FolderOpen } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ProjectDropdown() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const activeProjects = projects.filter(p => p.status === 'aktiv');
  const otherProjects = projects.filter(p => p.status !== 'aktiv');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2 h-11 px-4">
          <FolderOpen className="h-4 w-4 text-emerald-600" />
          <span>Velg prosjekt</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {activeProjects.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">
              Aktive prosjekter
            </DropdownMenuLabel>
            {activeProjects.map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {project.project_number && `#${project.project_number} • `}
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        {otherProjects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">
              Andre prosjekter
            </DropdownMenuLabel>
            {otherProjects.map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {project.project_number && `#${project.project_number} • `}
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        {projects.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-sm">
            Ingen prosjekter
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Prosjekter')}
            className="flex items-center justify-center gap-2 text-emerald-600 font-medium cursor-pointer"
          >
            Se alle prosjekter
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}