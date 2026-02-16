import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, ShoppingCart, MessageSquare, Users,
  CalendarDays, Building2, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const modules = [
  { key: 'prosjekter', name: 'Prosjekter', description: 'Administrer prosjekter', icon: Building2, color: 'emerald', page: 'Prosjekter' },
  { key: 'avvik', name: 'Avvik', description: 'HMS og kvalitetsavvik', icon: AlertTriangle, color: 'amber', page: 'Avvik' },
  { key: 'endringsmeldinger', name: 'Endringsmeldinger', description: 'Tillegg og endringer', icon: FileText, color: 'blue', page: 'Endringsmeldinger' },
  { key: 'timelister', name: 'Timelister', description: 'Timeføring', icon: Clock, color: 'indigo', page: 'Timelister' },
  { key: 'bildedok', name: 'Bildedokumentasjon', description: 'Foto og dokumenter', icon: Camera, color: 'purple', page: 'Bildedok' },
  { key: 'sjekklister', name: 'Sjekklister', description: 'Kvalitetskontroll', icon: CheckSquare, color: 'teal', page: 'Sjekklister' },
  { key: 'tilbud', name: 'Tilbud', description: 'Tilbudsadministrasjon', icon: FileSpreadsheet, color: 'cyan', page: 'Tilbud' },
  { key: 'bestillinger', name: 'Bestillinger', description: 'Innkjøp og ordre', icon: ShoppingCart, color: 'orange', page: 'Bestillinger' },
  { key: 'chat', name: 'Intern Chat', description: 'Teamkommunikasjon', icon: MessageSquare, color: 'pink', page: 'Chat' },
  { key: 'ressursplan', name: 'Ressursplanlegger', description: 'Bemanning', icon: Users, color: 'violet', page: 'Ressursplan' },
  { key: 'crm', name: 'CRM', description: 'Kundeadministrasjon', icon: Users, color: 'rose', page: 'CRM' },
  { key: 'kalender', name: 'Kalender', description: 'Hendelser og møter', icon: CalendarDays, color: 'sky', page: 'Kalender' },
];

const colorClasses = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-200' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'group-hover:bg-amber-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'group-hover:bg-blue-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'group-hover:bg-indigo-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'group-hover:bg-purple-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'group-hover:bg-teal-200' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', hover: 'group-hover:bg-cyan-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'group-hover:bg-orange-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', hover: 'group-hover:bg-pink-200' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', hover: 'group-hover:bg-violet-200' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', hover: 'group-hover:bg-rose-200' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-600', hover: 'group-hover:bg-sky-200' },
};

export default function ModuleGrid({ activeModules }) {
  const filteredModules = activeModules 
    ? modules.filter(m => activeModules.includes(m.key))
    : modules;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {filteredModules.map((module) => {
        const colors = colorClasses[module.color];
        return (
          <Link key={module.key} to={createPageUrl(module.page)}>
            <Card className="group p-5 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                colors.bg,
                colors.hover
              )}>
                <module.icon className={cn("h-6 w-6", colors.text)} />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                {module.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{module.description}</p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}