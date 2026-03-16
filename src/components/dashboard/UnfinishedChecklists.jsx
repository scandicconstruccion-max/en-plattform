import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function UnfinishedChecklists() {
  const navigate = useNavigate();

  const { data: checklists = [] } = useQuery({
    queryKey: ['unfinishedChecklists'],
    queryFn: async () => {
      const [all, projects] = await Promise.all([
        base44.entities.Checklist.list('-updated_date', 100),
        base44.entities.Project.list()
      ]);
      const existingProjectIds = new Set(projects.map(p => p.id));
      return all.filter(c => {
        // Kun signerte sjekklister skal fjernes fra dashbordet
        if (c.signatures && c.signatures.length > 0) return false;
        // Ekskluder sjekklister tilknyttet slettede prosjekter
        if (!existingProjectIds.has(c.project_id)) return false;
        return true;
      }).slice(0, 5);
    }
  });

  const getProgressPercentage = (checklist) => {
    const totalItems = checklist.sections && checklist.sections.length > 0
      ? checklist.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
      : (checklist.items?.length || 0);
    if (!totalItems) return 0;
    const answered = checklist.responses?.filter(r => r.status).length || 0;
    return Math.round((answered / totalItems) * 100);
  };

  if (checklists.length === 0) return null;

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-emerald-600" />
          Uferdige sjekklister
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(createPageUrl('Sjekklister'))}
          className="text-emerald-600 hover:text-emerald-700"
        >
          Se alle
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklists.map((checklist) => {
          const progress = getProgressPercentage(checklist);
          return (
            <div
              key={checklist.id}
              className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => navigate(createPageUrl('SjekklisteDetaljer') + `?id=${checklist.id}`)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{checklist.name}</h4>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1">
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{progress}%</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-3 text-emerald-600 hover:text-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(createPageUrl('SjekklisteDetaljer') + `?id=${checklist.id}`);
                }}
              >
                Fortsett
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}