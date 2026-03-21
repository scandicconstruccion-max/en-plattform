import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, FolderOpen, Check } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ProjectDropdown() {
  const [selectedProject, setSelectedProject] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  // Sync with URL: if we're on a project detail page, auto-select that project
  useEffect(() => {
    if (projects.length === 0) return;
    const params = new URLSearchParams(location.search);
    const urlProjectId = params.get('id');
    if (urlProjectId && location.pathname.includes('ProsjektDetaljer')) {
      const found = projects.find(p => p.id === urlProjectId);
      if (found) {
        setSelectedProject(found);
        localStorage.setItem('selectedProject', JSON.stringify(found));
        return;
      }
    }
    const stored = localStorage.getItem('selectedProject');
    if (stored) {
      const parsed = JSON.parse(stored);
      const stillExists = projects.find(p => p.id === parsed.id);
      if (stillExists) {
        setSelectedProject(stillExists);
      } else {
        localStorage.removeItem('selectedProject');
        setSelectedProject(null);
      }
    }
  }, [projects, location]);

  useEffect(() => {
    const handleProjectSelected = () => {
      const stored = localStorage.getItem('selectedProject');
      if (stored) {
        setSelectedProject(JSON.parse(stored));
      }
    };
    window.addEventListener('projectSelected', handleProjectSelected);
    return () => window.removeEventListener('projectSelected', handleProjectSelected);
  }, []);

  const handleSelectProject = (project) => {
    localStorage.setItem('selectedProject', JSON.stringify(project));
    setSelectedProject(project);
    window.dispatchEvent(new Event('projectSelected'));
  };

  const activeProjects = projects.filter((p) => p.status === 'aktiv');
  const otherProjects = projects.filter((p) => p.status !== 'aktiv');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 max-w-[220px]">
          <FolderOpen className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="truncate text-sm">
            {selectedProject ? selectedProject.name : 'Velg prosjekt'}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        </Button>






      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {activeProjects.length > 0 &&
        <>
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">
              Aktive prosjekter
            </DropdownMenuLabel>
            {activeProjects.map((project) =>
          <DropdownMenuItem key={project.id} onClick={() => handleSelectProject(project)}>
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    {selectedProject?.id === project.id ?
                <Check className="h-4 w-4 text-emerald-600" /> :

                <Building2 className="h-4 w-4 text-emerald-600" />
                }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {project.project_number && `#${project.project_number} • `}
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </DropdownMenuItem>
          )}
          </>
        }
        {otherProjects.length > 0 &&
        <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">
              Andre prosjekter
            </DropdownMenuLabel>
            {otherProjects.map((project) =>
          <DropdownMenuItem key={project.id} onClick={() => handleSelectProject(project)}>
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {selectedProject?.id === project.id ?
                <Check className="h-4 w-4 text-slate-600" /> :

                <Building2 className="h-4 w-4 text-slate-600" />
                }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {project.project_number && `#${project.project_number} • `}
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </DropdownMenuItem>
          )}
          </>
        }
        {projects.length === 0 &&
        <div className="p-4 text-center text-slate-500 text-sm">
            Ingen prosjekter
          </div>
        }
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Prosjekter')}
            className="flex items-center justify-center gap-2 text-emerald-600 font-medium cursor-pointer">

            Se alle prosjekter
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>);

}