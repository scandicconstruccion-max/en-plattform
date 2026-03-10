import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Viser prosjekthierarki som trestruktur
 */
export default function ProjectHierarchyTree({ projects, onAddSubproject }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (projectId) => {
    setExpanded(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const renderProject = (project, level = 0, parentId = null) => {
    const hasChildren = project.children && project.children.length > 0;
    const isExpanded = expanded[project.id];

    return (
      <div key={project.id} className="mb-2">
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg hover:bg-slate-50 transition-colors",
          "border-l-2 ml-4",
          level === 0 ? "border-emerald-600 ml-0" : "border-slate-300"
        )}>
          {hasChildren && (
            <button
              onClick={() => toggleExpand(project.id)}
              className="p-0 hover:bg-slate-200 rounded"
              title={isExpanded ? "Skjul" : "Vis"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}

          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            level === 0 ? "bg-emerald-100" : level === 1 ? "bg-blue-100" : "bg-slate-100"
          )}>
            <Building2 className={cn(
              "h-4 w-4",
              level === 0 ? "text-emerald-600" : level === 1 ? "text-blue-600" : "text-slate-600"
            )} />
          </div>

          <Link
            to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}
            className="flex-1 min-w-0 hover:text-emerald-600 transition-colors"
          >
            <div className="font-medium text-slate-900 truncate">
              {project.name}
            </div>
            {project.project_number && (
              <div className="text-xs text-slate-500">#{project.project_number}</div>
            )}
          </Link>

          {onAddSubproject && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onAddSubproject(project)}
              className="h-8 w-8 text-slate-400 hover:text-emerald-600"
              title="Opprett underprosjekt"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {project.children.map(child => renderProject(child, level + 1, project.id))}
          </div>
        )}
      </div>
    );
  };

  if (!projects || projects.length === 0) {
    return (
      <Card className="p-8 text-center border-0 shadow-sm">
        <Building2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500">Ingen prosjekter</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 shadow-sm space-y-2">
      {projects.map(project => renderProject(project))}
    </Card>
  );
}