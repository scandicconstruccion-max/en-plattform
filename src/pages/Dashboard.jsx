import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { hasModuleAccess } from '@/lib/permissions'
const formatDate = () => { const days = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag']; const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember']; const d = new Date(); return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}` }

import { cn } from '@/lib/utils'
import {
  AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, Gavel, MessageSquare, Users, CalendarDays,
  Building2, LayoutDashboard, ShieldAlert, Construction,
  TrendingUp, Receipt, PenSquare, BookOpen, PackageCheck,
  ClipboardCheck, AlertCircle, FileCheck, ShoppingCart, UserCog, Bell
} from 'lucide-react'

const moduleDefinitions = {
  prosjekter:       { name: 'Prosjekter',           description: 'Administrer prosjekter',           icon: Building2,      color: 'emerald',  route: '/prosjekter' },
  prosjektfiler:    { name: 'Prosjektfiler',         description: 'Filer og dokumenter',              icon: FileText,       color: 'slate',    route: '/prosjektfiler' },
  sjekklister:      { name: 'Sjekklister',           description: 'Kvalitetskontroll',                icon: CheckSquare,    color: 'teal',     route: '/sjekklister' },
  avvik:            { name: 'Avvik',                 description: 'Avvikshåndtering',                 icon: AlertTriangle,  color: 'amber',    route: '/avvik' },
  hms:              { name: 'HMS & Risiko',          description: 'Helse, miljø og sikkerhet',        icon: ShieldAlert,    color: 'red',      route: '/hms' },
  maskiner:         { name: 'Maskiner',              description: 'Maskin- og utstyrsregister',       icon: Construction,   color: 'amber',    route: '/maskiner' },
  tilbud:           { name: 'Tilbud',                description: 'Tilbudsadministrasjon',            icon: FileSpreadsheet,color: 'cyan',     route: '/tilbud' },
  anbudsmodul:      { name: 'Anbudsportal',          description: 'Leverandøranbud og tilbud',        icon: Gavel,          color: 'orange',   route: '/anbudsmodul' },
  ordre:            { name: 'Ordre',                 description: 'Arbeidsordre',                     icon: FileText,       color: 'indigo',   route: '/ordre' },
  endringsmeldinger:{ name: 'Endringsmeldinger',     description: 'Tillegg og endringer',             icon: PenSquare,      color: 'blue',     route: '/endringsmeldinger' },
  faktura:          { name: 'Faktura',               description: 'Fakturering og betalinger',        icon: Receipt,        color: 'green',    route: '/faktura' },
  ansatte:          { name: 'Ansatte',               description: 'Personaladministrasjon',           icon: Users,          color: 'slate',    route: '/ansatte' },
  timelister:       { name: 'Timelister',            description: 'Timeføring',                       icon: Clock,          color: 'indigo',   route: '/timelister' },
  ressursplan:      { name: 'Ressursplanlegger',     description: 'Bemanning og planlegging',         icon: Users,          color: 'violet',   route: '/ressursplan' },
  kalender:         { name: 'Kalender',              description: 'Hendelser og møter',               icon: CalendarDays,   color: 'sky',      route: '/kalender' },
  chat:             { name: 'Intern Chat',           description: 'Teamkommunikasjon',                icon: MessageSquare,  color: 'pink',     route: '/chat' },
  befaring:         { name: 'Befaring',              description: 'Befaringer og oppfølging',         icon: CheckSquare,    color: 'cyan',     route: '/befaring' },
  bildedok:         { name: 'Bildedok.',             description: 'Foto og dokumentasjon',            icon: Camera,         color: 'purple',   route: '/bildedok' },
  fdv:              { name: 'FDV',                   description: 'Forvaltning, drift og vedlikehold',icon: BookOpen,       color: 'rose',     route: '/fdv' },
  crm:              { name: 'CRM',                   description: 'Kundeadministrasjon',              icon: TrendingUp,     color: 'rose',     route: '/crm' },
  minbedrift:       { name: 'Min bedrift',           description: 'Bedriftsinformasjon',              icon: Building2,      color: 'emerald',  route: '/minbedrift' },
  brukeradmin:      { name: 'Brukere',               description: 'Brukeradministrasjon',             icon: UserCog,        color: 'slate',    route: '/brukeradmin' },
  varsler:          { name: 'Varsler',               description: 'Notifikasjoner og varsler',        icon: Bell,           color: 'amber',    route: '/varsler' },
  sja:              { name: 'SJA',                   description: 'Sikker jobb-analyse',              icon: ClipboardCheck, color: 'orange',   route: '/sja' },
  ruh:              { name: 'RUH',                   description: 'Rapport om uønsket hendelse',      icon: AlertCircle,    color: 'red',      route: '/ruh' },
  risikoanalyse:    { name: 'Risikoanalyse',         description: 'Kartlegging av risiko',            icon: FileCheck,      color: 'orange',   route: '/risikoanalyse' },
  hmshandbok:       { name: 'HMS-håndbok',           description: 'Retningslinjer og prosedyrer',     icon: BookOpen,       color: 'teal',     route: '/hmshandbok' },
  mottakskontroll:  { name: 'Mottakskontroll',       description: 'Kontroll ved mottak',              icon: PackageCheck,   color: 'green',    route: '/mottakskontroll' },
  bestillinger:     { name: 'Bestillinger',          description: 'Innkjøp og bestillinger',          icon: ShoppingCart,   color: 'blue',     route: '/bestillinger' },
  kompetanser:      { name: 'Kompetanser',           description: 'Kurs og sertifikater',             icon: ShieldAlert,    color: 'purple',   route: '/kompetanser' },
}

const moduleSections = [
  { title: '🔹 GRUNNPAKKE',                   modules: ['prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms', 'maskiner'] },
  { title: '💰 ØKONOMI & KONTRAKT',           modules: ['tilbud', 'anbudsmodul', 'ordre', 'endringsmeldinger', 'faktura'] },
  { title: '👷 PERSONELL & RESSURSER',        modules: ['ansatte', 'timelister', 'ressursplan', 'kalender', 'chat'] },
  { title: '📸 DOKUMENTASJON & OVERLEVERING', modules: ['befaring', 'bildedok', 'fdv'] },
  { title: '⚙ SALG & ADMIN',                 modules: ['crm', 'minbedrift', 'brukeradmin', 'kompetanser', 'varsler'] },
]

const colorClasses = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  green:   { bg: 'bg-green-100',   text: 'text-green-600' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-600' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-600' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-600' },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-600' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-600' },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-600' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-600' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-600' },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-600' },
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-600' },
  red:     { bg: 'bg-red-100',     text: 'text-red-600' },
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [collapsedSections, setCollapsedSections] = useState({})

  const toggleSection = (index) => {
    setCollapsedSections(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Bruker'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Velkommen tilbake, {firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            {formatDate()}
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Moduler</h2>
          <div className="space-y-8">
            {moduleSections.map((section, sectionIndex) => {
              const isCollapsed = collapsedSections[sectionIndex]
              const sectionModules = section.modules
                .filter(key => moduleDefinitions[key] && (!profile || hasModuleAccess(profile, key)))
                .map(key => ({ key, ...moduleDefinitions[key] }))

              if (sectionModules.length === 0) return null

              return (
                <div key={sectionIndex}>
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="flex items-center gap-3 mb-4 w-full text-left group"
                  >
                    <h3 className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                      {section.title}
                    </h3>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400">
                      {isCollapsed ? 'Vis' : 'Skjul'}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {sectionModules.map((module) => {
                        const colors = colorClasses[module.color] || colorClasses.slate
                        return (
                          <Link key={module.key} to={module.route}>
                            <div className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                                colors.bg
                              )}>
                                <module.icon className={cn("h-6 w-6", colors.text)} />
                              </div>
                              <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors text-sm">
                                {module.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">{module.description}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
