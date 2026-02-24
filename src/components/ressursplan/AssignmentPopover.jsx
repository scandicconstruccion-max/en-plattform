import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Briefcase, MessageSquare, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

const statusColors = {
  planlagt: 'bg-blue-100 text-blue-800',
  bekreftet: 'bg-emerald-100 text-emerald-800',
  fullfort: 'bg-slate-100 text-slate-800',
  kansellert: 'bg-red-100 text-red-800'
};

const statusText = {
  planlagt: 'Planlagt',
  bekreftet: 'Bekreftet',
  fullfort: 'Fullført',
  kansellert: 'Kansellert'
};

export default function AssignmentPopover({ assignment, projectName, children, onEdit, canEdit }) {
  if (!assignment) return children;

  const startDate = parseISO(assignment.start_dato_tid);
  const endDate = parseISO(assignment.slutt_dato_tid);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">{projectName}</h4>
              <p className="text-sm text-slate-600 mt-1">
                <User className="w-3 h-3 inline mr-1" />
                {assignment.resource_navn}
              </p>
            </div>
            <Badge className={statusColors[assignment.status]}>
              {statusText[assignment.status]}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(startDate, 'd. MMM yyyy', { locale: nb })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(startDate, 'HH:mm', { locale: nb })} - {format(endDate, 'HH:mm', { locale: nb })}
              </span>
            </div>
            {assignment.rolle_pa_prosjekt && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>{assignment.rolle_pa_prosjekt}</span>
              </div>
            )}
            {assignment.kommentar && (
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5" />
                <span className="flex-1">{assignment.kommentar}</span>
              </div>
            )}
          </div>

          {canEdit && (
            <Button 
              onClick={onEdit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              size="sm"
            >
              <Edit className="w-4 h-4" />
              Rediger
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}