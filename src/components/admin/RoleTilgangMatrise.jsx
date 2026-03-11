import React, { useState } from 'react';
import { Check, X, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROLES = ['admin', 'prosjektleder', 'ansatt', 'regnskapsforer'];

const ROLE_LABELS = {
  admin: 'Administrator',
  prosjektleder: 'Prosjektleder',
  ansatt: 'Ansatt',
  regnskapsforer: 'Regnskapsfører',
};

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  prosjektleder: 'bg-blue-100 text-blue-800 border-blue-200',
  ansatt: 'bg-green-100 text-green-800 border-green-200',
  regnskapsforer: 'bg-orange-100 text-orange-800 border-orange-200',
};

const MODULE_SECTIONS = [
  {
    title: 'Grunnpakke',
    modules: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'prosjekter', label: 'Prosjekter' },
      { key: 'prosjektfiler', label: 'Prosjektfiler' },
      { key: 'sjekklister', label: 'Sjekklister' },
      { key: 'avvik', label: 'Avvik' },
      { key: 'hms', label: 'HMS & Risiko' },
      { key: 'hmshandbok', label: 'HMS-håndbok' },
      { key: 'maskiner', label: 'Maskiner' },
    ]
  },
  {
    title: 'Økonomi & Kontrakt',
    modules: [
      { key: 'tilbud', label: 'Tilbud' },
      { key: 'anbudsmodul', label: 'Anbudsmodul' },
      { key: 'ordre', label: 'Ordre' },
      { key: 'endringsmeldinger', label: 'Endringsmeldinger' },
      { key: 'faktura', label: 'Faktura' },
    ]
  },
  {
    title: 'Personell & Ressurser',
    modules: [
      { key: 'ansatte', label: 'Ansatte' },
      { key: 'timelister', label: 'Timelister' },
      { key: 'ressursplan', label: 'Ressursplanlegger' },
      { key: 'kalender', label: 'Kalender' },
      { key: 'chat', label: 'Intern Chat' },
      { key: 'kompetanser', label: 'Kompetanser' },
    ]
  },
  {
    title: 'Dokumentasjon & Overlevering',
    modules: [
      { key: 'befaring', label: 'Befaring' },
      { key: 'bildedok', label: 'Bildedokumentasjon' },
      { key: 'fdv', label: 'FDV' },
      { key: 'mottakskontroll', label: 'Mottakskontroll' },
    ]
  },
  {
    title: 'HMS & Sikkerhet',
    modules: [
      { key: 'sja', label: 'SJA' },
      { key: 'ruh', label: 'RUH' },
      { key: 'risikoanalyse', label: 'Risikoanalyse' },
    ]
  },
  {
    title: 'Salg & Admin',
    modules: [
      { key: 'crm', label: 'CRM' },
      { key: 'minbedrift', label: 'Min bedrift' },
      { key: 'brukeradmin', label: 'Brukeradmin' },
      { key: 'varsler', label: 'Varsler' },
    ]
  },
];

// Rolletilganger – speilet fra permissions.js
const roleModuleAccess = {
  admin: 'all',
  prosjektleder: [
    'dashboard','prosjekter','avvik','befaring','prosjektfiler','endringsmeldinger',
    'timelister','bildedok','sjekklister','tilbud','ordre','faktura','fdv','bestillinger',
    'chat','ressursplan','maskiner','kalender','ansatte','hms','sja','ruh','risikoanalyse',
    'hmshandbok','mottakskontroll','anbudsportal','anbudsmodul','varsler','crm'
  ],
  ansatt: [
    'dashboard','prosjekter','avvik','befaring','prosjektfiler','endringsmeldinger',
    'timelister','bildedok','sjekklister','tilbud','ordre','ressursplan','hms',
    'chat','kalender','sja','ruh','risikoanalyse','hmshandbok','mottakskontroll','varsler'
  ],
  regnskapsforer: [
    'dashboard','ansatte','timelister','faktura','maskiner','varsler'
  ],
};

function hasAccess(role, moduleKey) {
  const access = roleModuleAccess[role];
  if (access === 'all') return true;
  return access?.includes(moduleKey) ?? false;
}

export default function RoleTilgangMatrise() {
  const [hoveredRole, setHoveredRole] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Dette er en oversikt over hvilke moduler hver rolle har tilgang til. 
          For å endre tilgangene, kontakt systemutvikler eller bruk «Tilpasset modultilgang» 
          på den enkelte bruker.
        </p>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {ROLES.map(role => {
          const access = roleModuleAccess[role];
          const count = access === 'all'
            ? MODULE_SECTIONS.flatMap(s => s.modules).length
            : (access?.length ?? 0);
          return (
            <div
              key={role}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-default transition-all',
                ROLE_COLORS[role],
                hoveredRole === role && 'ring-2 ring-offset-1 ring-current'
              )}
              onMouseEnter={() => setHoveredRole(role)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              <span className="font-medium text-sm">{ROLE_LABELS[role]}</span>
              <Badge variant="outline" className="text-xs border-current">
                {count} moduler
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-left font-semibold text-slate-700 w-48">Modul</th>
              {ROLES.map(role => (
                <th
                  key={role}
                  className={cn(
                    'p-4 text-center font-semibold w-36 transition-colors',
                    hoveredRole === role ? 'bg-slate-100' : ''
                  )}
                  onMouseEnter={() => setHoveredRole(role)}
                  onMouseLeave={() => setHoveredRole(null)}
                >
                  <span className={cn(
                    'inline-block px-2 py-1 rounded-md text-xs border',
                    ROLE_COLORS[role]
                  )}>
                    {ROLE_LABELS[role]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_SECTIONS.map((section, sIdx) => (
              <React.Fragment key={section.title}>
                {/* Section header */}
                <tr className="bg-slate-50/70">
                  <td
                    colSpan={ROLES.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-y"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.modules.map((mod, mIdx) => (
                  <tr
                    key={mod.key}
                    className={cn(
                      'border-b last:border-0 hover:bg-slate-50 transition-colors',
                      mIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    )}
                  >
                    <td className="p-4 font-medium text-slate-800">{mod.label}</td>
                    {ROLES.map(role => {
                      const allowed = hasAccess(role, mod.key);
                      return (
                        <td
                          key={role}
                          className={cn(
                            'p-4 text-center transition-colors',
                            hoveredRole === role ? 'bg-slate-50' : ''
                          )}
                          onMouseEnter={() => setHoveredRole(role)}
                          onMouseLeave={() => setHoveredRole(null)}
                        >
                          {allowed ? (
                            <Check className="h-5 w-5 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}