import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/AuthContext'
import { hasModuleAccess } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, ShoppingCart, MessageSquare, Users, CalendarDays,
  Building2, Settings, LogOut, Menu, X, ChevronDown, ChevronLeft,
  ChevronRight, UserCog, ShieldAlert, ClipboardCheck, AlertCircle,
  FileCheck, BookOpen, PackageCheck, Gavel, Bell, Construction,
  Wrench, TrendingUp, Receipt, PenSquare
} from 'lucide-react'

const moduleIcons = {
  maskiner: Construction,
  dashboard: LayoutDashboard,
  avvik: AlertTriangle,
  befaring: CheckSquare,
  prosjektfiler: FileText,
  endringsmeldinger: PenSquare,
  timelister: Clock,
  bildedok: Camera,
  sjekklister: CheckSquare,
  tilbud: FileSpreadsheet,
  ordre: FileText,
  faktura: Receipt,
  fdv: BookOpen,
  bestillinger: ShoppingCart,
  chat: MessageSquare,
  ressursplan: Users,
  prosjekter: Building2,
  crm: TrendingUp,
  kalender: CalendarDays,
  ansatte: Users,
  minbedrift: Building2,
  brukeradmin: UserCog,
  kompetanser: ShieldAlert,
  hms: ShieldAlert,
  sja: ClipboardCheck,
  ruh: AlertCircle,
  risikoanalyse: FileCheck,
  hmshandbok: BookOpen,
  mottakskontroll: PackageCheck,
  anbudsmodul: Gavel,
  varsler: Bell,
  lonnsgrunnlag: Receipt,
}

const moduleLabels = {
  maskiner: 'Maskiner',
  varsler: 'Varsler',
  anbudsmodul: 'Anbudsmodul',
  dashboard: 'Dashboard',
  avvik: 'Avvik',
  befaring: 'Befaring',
  prosjektfiler: 'Prosjektfiler',
  endringsmeldinger: 'Endringsmeldinger',
  timelister: 'Timelister',
  bildedok: 'Bildedokumentasjon',
  sjekklister: 'Sjekklister',
  tilbud: 'Tilbud',
  ordre: 'Ordre',
  faktura: 'Faktura',
  fdv: 'FDV',
  bestillinger: 'Bestillinger',
  chat: 'Intern Chat',
  ressursplan: 'Ressursplanlegger',
  prosjekter: 'Prosjekter',
  crm: 'CRM',
  kalender: 'Kalender',
  ansatte: 'Ansatte',
  minbedrift: 'Min bedrift',
  brukeradmin: 'Brukere',
  kompetanser: 'Kompetanser',
  hms: 'HMS & Risiko',
  sja: 'SJA',
  ruh: 'RUH',
  risikoanalyse: 'Risikoanalyse',
  hmshandbok: 'HMS-håndbok',
  mottakskontroll: 'Mottakskontroll',
  lonnsgrunnlag: 'Lønnsgrunnlag',
}

const moduleRoutes = {
  dashboard: '/dashboard',
  prosjekter: '/prosjekter',
  prosjektfiler: '/prosjektfiler',
  sjekklister: '/sjekklister',
  avvik: '/avvik',
  hms: '/hms',
  maskiner: '/maskiner',
  tilbud: '/tilbud',
  anbudsmodul: '/anbudsmodul',
  ordre: '/ordre',
  endringsmeldinger: '/endringsmeldinger',
  faktura: '/faktura',
  ansatte: '/ansatte',
  timelister: '/timelister',
  ressursplan: '/ressursplan',
  kalender: '/kalender',
  chat: '/chat',
  befaring: '/befaring',
  bildedok: '/bildedok',
  fdv: '/fdv',
  crm: '/crm',
  minbedrift: '/minbedrift',
  brukeradmin: '/brukeradmin',
  kompetanser: '/kompetanser',
  varsler: '/varsler',
  sja: '/sja',
  ruh: '/ruh',
  risikoanalyse: '/risikoanalyse',
  hmshandbok: '/hmshandbok',
  mottakskontroll: '/mottakskontroll',
  lonnsgrunnlag: '/lonnsgrunnlag',
  bestillinger: '/bestillinger',
}

const moduleSections = [
  {
    title: 'GRUNNPAKKE',
    modules: ['dashboard', 'prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms', 'maskiner']
  },
  { separator: true },
  {
    title: 'ØKONOMI & KONTRAKT',
    modules: ['tilbud', 'anbudsmodul', 'ordre', 'endringsmeldinger', 'faktura']
  },
  {
    title: 'PERSONELL & RESSURSER',
    modules: ['ansatte', 'timelister', 'ressursplan', 'kalender', 'chat']
  },
  {
    title: 'DOKUMENTASJON & OVERLEVERING',
    modules: ['befaring', 'bildedok', 'fdv']
  },
  {
    title: 'SALG & ADMIN',
    modules: ['crm', 'minbedrift', 'brukeradmin', 'kompetanser', 'varsler']
  },
]

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
          </button>
          <span className="font-bold text-emerald-700 text-lg">En Plattform</span>
          <div className="w-10" />
        </header>
      )}

      {/* Desktop Top Bar */}
      {!isMobile && (
        <div className={cn(
          "fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-end px-6 transition-all duration-300",
          sidebarCollapsed ? "left-16" : "left-64"
        )}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{profile?.full_name || profile?.email}</span>
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
              {initials}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300 flex flex-col",
        isMobile ? "w-72" : sidebarCollapsed ? "w-16" : "w-64",
        isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0",
        isMobile && "pt-16"
      )}>

        {/* Logo */}
        {!isMobile && (
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
            <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center w-full")}>
              <Link to="/dashboard" className="hover:opacity-80 transition-opacity flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <span className="font-bold text-slate-900 text-base">En Plattform</span>
                )}
              </Link>
            </div>
          </div>
        )}

        {/* Collapse Button */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors z-50"
          >
            {sidebarCollapsed
              ? <ChevronRight className="h-3 w-3 text-slate-600" />
              : <ChevronLeft className="h-3 w-3 text-slate-600" />
            }
          </button>
        )}

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-4",
          sidebarCollapsed ? "px-2" : "px-3"
        )}>
          {moduleSections.map((section, sectionIndex) => {
            if (section.separator) {
              return !sidebarCollapsed && (
                <div key={`sep-${sectionIndex}`} className="my-3 border-t border-slate-100" />
              )
            }

            const visibleModules = section.modules.filter(moduleKey =>
              !profile || hasModuleAccess(profile, moduleKey)
            )

            if (visibleModules.length === 0) return null

            return (
              <div key={sectionIndex} className="mb-4">
                {!sidebarCollapsed && section.title && (
                  <div className="px-3 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {visibleModules.map((moduleKey) => {
                    const Icon = moduleIcons[moduleKey] || LayoutDashboard
                    const label = moduleLabels[moduleKey] || moduleKey
                    const route = moduleRoutes[moduleKey] || '/dashboard'
                    const isActive = location.pathname === route || location.pathname.startsWith(route + '/')

                    return (
                      <Link
                        key={moduleKey}
                        to={route}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        title={sidebarCollapsed ? label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          sidebarCollapsed && "justify-center px-2",
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-emerald-600")} />
                        {!sidebarCollapsed && label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Section */}
        <div className={cn(
          "border-t border-slate-100 p-3 flex-shrink-0",
          sidebarCollapsed && "p-2"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name || 'Bruker'}
                </p>
                <p className="text-xs text-slate-500 truncate">{profile?.email || ''}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex gap-1">
                <button
                  onClick={() => navigate('/innstillinger')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Innstillinger"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                  title="Logg ut"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
            {sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                title="Logg ut"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300",
        isMobile ? "pt-16" : sidebarCollapsed ? "ml-16 pt-16" : "ml-64 pt-16"
      )}>
        <>
          
            <div
            className="min-h-screen"
          >
            {children}
          </div>
        </>
      </main>
    </div>
  )
}
