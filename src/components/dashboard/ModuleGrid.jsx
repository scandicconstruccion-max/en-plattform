import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { hasModuleAccess } from '@/components/shared/permissions';
import {
  AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, ShoppingCart, MessageSquare, Users,
  CalendarDays, Building2, LayoutDashboard, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

const moduleDefinitions = {
  dashboard: { name: 'Dashboard', description: 'Oversikt', icon: LayoutDashboard, color: 'slate', page: 'Dashboard' },
  prosjekter: { name: 'Prosjekter', description: 'Administrer prosjekter', icon: Building2, color: 'emerald', page: 'Prosjekter' },
  prosjektfiler: { name: 'Prosjektfiler', description: 'Filer og dokumenter', icon: FileText, color: 'slate', page: 'Prosjektfiler' },
  sjekklister: { name: 'Sjekklister', description: 'Kvalitetskontroll', icon: CheckSquare, color: 'teal', page: 'Sjekklister' },
  avvik: { name: 'Avvik', description: 'Avvikshåndtering', icon: AlertTriangle, color: 'amber', page: 'Avvik' },
  hms: { name: 'HMS & Risiko', description: 'Helse, miljø og sikkerhet', icon: ShieldAlert, color: 'red', page: 'HMS' },
  tilbud: { name: 'Tilbud', description: 'Tilbudsadministrasjon', icon: FileSpreadsheet, color: 'cyan', page: 'Tilbud' },
  anbudsportal: { name: 'Anbudsportal', description: 'Forespørsler og anbud', icon: ShoppingCart, color: 'amber', page: 'Anbudsportal' },
  anbudsmodul: { name: 'Anbudsmodul', description: 'Leverandøranbud og tilbud', icon: ShoppingCart, color: 'orange', page: 'Anbudsmodul' },
  ordre: { name: 'Ordre', description: 'Arbeidsordre', icon: FileText, color: 'indigo', page: 'Ordre' },
  endringsmeldinger: { name: 'Endringsmeldinger', description: 'Tillegg og endringer', icon: FileText, color: 'blue', page: 'Endringsmeldinger' },
  faktura: { name: 'Faktura', description: 'Fakturering og betalinger', icon: FileText, color: 'green', page: 'Faktura' },
  ansatte: { name: 'Ansatte', description: 'Personaladministrasjon', icon: Users, color: 'slate', page: 'Ansatte' },
  timelister: { name: 'Timelister', description: 'Timeføring', icon: Clock, color: 'indigo', page: 'Timelister' },
  ressursplan: { name: 'Ressursplanlegger', description: 'Bemanning', icon: Users, color: 'violet', page: 'Ressursplan' },
  kalender: { name: 'Kalender', description: 'Hendelser og møter', icon: CalendarDays, color: 'sky', page: 'Kalender' },
  chat: { name: 'Intern Chat', description: 'Teamkommunikasjon', icon: MessageSquare, color: 'pink', page: 'Chat' },
  befaring: { name: 'Befaring', description: 'Befaringer og oppfølging', icon: CheckSquare, color: 'cyan', page: 'Befaring' },
  bildedok: { name: 'Bildedokumentasjon', description: 'Foto og dokumenter', icon: Camera, color: 'purple', page: 'Bildedok' },
  fdv: { name: 'FDV', description: 'Forvaltning, Drift og Vedlikehold', icon: FileText, color: 'rose', page: 'FDV' },
  crm: { name: 'CRM', description: 'Kundeadministrasjon', icon: Users, color: 'rose', page: 'CRM' },
  minbedrift: { name: 'Min bedrift', description: 'Bedriftsinformasjon', icon: Building2, color: 'emerald', page: 'MinBedrift' },
  brukeradmin: { name: 'Brukere', description: 'Brukeradministrasjon', icon: Users, color: 'slate', page: 'BrukerAdmin' },
};

const moduleSections = [
  {
    title: '🔹 GRUNNPAKKE',
    emoji: '🔹',
    modules: ['dashboard', 'prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms']
  },
  {
    title: '💰 ØKONOMI & KONTRAKT',
    emoji: '💰',
    modules: ['tilbud', 'anbudsportal', 'anbudsmodul', 'ordre', 'endringsmeldinger', 'faktura']
  },
  {
    title: '👷 PERSONELL & RESSURSER',
    emoji: '👷',
    modules: ['ansatte', 'timelister', 'ressursplan', 'kalender', 'chat']
  },
  {
    title: '📸 DOKUMENTASJON & OVERLEVERING',
    emoji: '📸',
    modules: ['befaring', 'bildedok', 'fdv']
  },
  {
    title: '⚙ SALG & ADMIN',
    emoji: '⚙',
    modules: ['crm', 'minbedrift', 'brukeradmin']
  }
];

const colorClasses = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', hover: 'group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', hover: 'group-hover:bg-green-200 dark:group-hover:bg-green-900/50' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', hover: 'group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', hover: 'group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', hover: 'group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', hover: 'group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', hover: 'group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', hover: 'group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', hover: 'group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', hover: 'group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', hover: 'group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', hover: 'group-hover:bg-rose-200 dark:group-hover:bg-rose-900/50' },
  sky: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', hover: 'group-hover:bg-sky-200 dark:group-hover:bg-sky-900/50' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', hover: 'group-hover:bg-slate-200 dark:group-hover:bg-slate-700' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', hover: 'group-hover:bg-red-200 dark:group-hover:bg-red-900/50' },
};

export default function ModuleGrid({ activeModules }) {
  const [collapsedSections, setCollapsedSections] = React.useState({});
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const toggleSection = (index) => {
    setCollapsedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-8">
      {moduleSections.map((section, sectionIndex) => {
        const isCollapsed = collapsedSections[sectionIndex];
        const sectionModules = section.modules
          .filter(key => {
            const hasAccess = !user || hasModuleAccess(user, key);
            return hasAccess;
          })
          .map(key => ({ key, ...moduleDefinitions[key] }));

        if (sectionModules.length === 0) return null;

        return (
          <div key={sectionIndex}>
            <button
              onClick={() => toggleSection(sectionIndex)}
              className="flex items-center gap-3 mb-4 w-full text-left group"
            >
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {section.title}
              </h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {isCollapsed ? 'Vis' : 'Skjul'}
              </span>
            </button>
            
            {!isCollapsed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {sectionModules.map((module) => {
                  const colors = colorClasses[module.color];
                  return (
                    <Link key={module.key} to={createPageUrl(module.page)}>
                      <Card className="group p-5 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full dark:bg-slate-900">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                          colors.bg,
                          colors.hover
                        )}>
                          <module.icon className={cn("h-6 w-6", colors.text)} />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {module.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}