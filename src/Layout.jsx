import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, ShoppingCart, MessageSquare, Users, CalendarDays,
  Building2, Settings, LogOut, Menu, X, ChevronDown, ChevronLeft, ChevronRight, UserCog, ShieldAlert, ClipboardCheck, AlertCircle, FileCheck, BookOpen, PackageCheck } from
'lucide-react';
import ProjectDropdown from '@/components/dashboard/ProjectDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { hasModuleAccess, MODULES } from '@/components/shared/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import BottomNav from '@/components/navigation/BottomNav';

const moduleIcons = {
  dashboard: LayoutDashboard,
  avvik: AlertTriangle,
  befaring: CheckSquare,
  prosjektfiler: FileText,
  endringsmeldinger: FileText,
  timelister: Clock,
  bildedok: Camera,
  sjekklister: CheckSquare,
  tilbud: FileSpreadsheet,
  ordre: FileText,
  faktura: FileText,
  fdv: FileText,
  bestillinger: ShoppingCart,
  chat: MessageSquare,
  ressursplan: Users,
  prosjekter: Building2,
  crm: Users,
  kalender: CalendarDays,
  ansatte: Users,
  minbedrift: Building2,
  brukeradmin: UserCog,
  hms: ShieldAlert,
  sja: ClipboardCheck,
  ruh: AlertCircle,
  risikoanalyse: FileCheck,
  hmshandbok: BookOpen,
  mottakskontroll: PackageCheck
};

const moduleLabels = {
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
  hms: 'HMS & Risiko',
  sja: 'SJA',
  ruh: 'RUH',
  risikoanalyse: 'Risikoanalyse',
  hmshandbok: 'HMS-håndbok',
  mottakskontroll: 'Mottakskontroll'
};

const modulePages = {
  dashboard: 'Dashboard',
  avvik: 'Avvik',
  befaring: 'Befaring',
  prosjektfiler: 'Prosjektfiler',
  endringsmeldinger: 'Endringsmeldinger',
  timelister: 'Timelister',
  bildedok: 'Bildedok',
  sjekklister: 'Sjekklister',
  tilbud: 'Tilbud',
  ordre: 'Ordre',
  faktura: 'Faktura',
  fdv: 'FDV',
  bestillinger: 'Bestillinger',
  chat: 'Chat',
  ressursplan: 'Ressursplan',
  prosjekter: 'Prosjekter',
  crm: 'CRM',
  kalender: 'Kalender',
  ansatte: 'Ansatte',
  minbedrift: 'MinBedrift',
  brukeradmin: 'BrukerAdmin',
  hms: 'HMS',
  sja: 'SJA',
  ruh: 'RUH',
  risikoanalyse: 'Risikoanalyse',
  hmshandbok: 'HMSHandbok',
  mottakskontroll: 'Mottakskontroll'
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: []
  });

  const company = companies?.[0];

  // Module sections
  const moduleSections = [
    {
      title: 'GRUNNPAKKE',
      modules: ['dashboard', 'prosjekter', 'prosjektfiler', 'avvik', 'hms']
    },
    {
      separator: true
    },
    {
      title: 'ØKONOMI & KONTRAKT',
      modules: ['tilbud', 'ordre', 'endringsmeldinger', 'faktura']
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
      modules: ['crm', 'minbedrift', 'brukeradmin']
    }
  ];


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (currentPageName === 'Priser' || currentPageName === 'Landing') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Header */}
      {isMobile &&
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
          <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 select-none">


            {sidebarOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </Button>
          <span className="text-green-600 font-semibold dark:text-white">En Plattform</span>
          <ProjectDropdown />
        </header>
      }

      {/* Desktop Top Bar with Project Dropdown */}
      {!isMobile &&
      <div className={cn(
        "fixed top-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-end px-6 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64"
      )}>
          <ProjectDropdown />
        </div>
      }

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300",
          isMobile ? "w-72" : sidebarCollapsed ? "w-16" : "w-64",
          isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0",
          isMobile && "pt-16"
        )}>

        {/* Logo */}
        {!isMobile &&
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
            <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center w-full")}>
              


              {!sidebarCollapsed &&
            <div className="flex flex-col">
                  <span className="text-green-700 text-2xl font-bold dark:text-white">En Plattform</span>
                  <span className="text-green-700 text-sm font-semibold dark:text-slate-400 italic">Av håndverkeren,            for håndverkeren</span>
                </div>
            }
            </div>
          </div>
        }

        {/* Collapse Button - Desktop only */}
        {!isMobile &&
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-50">

            {sidebarCollapsed ?
          <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" /> :

          <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          }
          </button>
        }

        {/* Navigation */}
        <nav className={cn("p-4 space-y-1 overflow-y-auto h-[calc(100%-8rem)]", sidebarCollapsed && "px-2")}>
          {moduleSections.map((section, sectionIndex) => {
            if (section.separator) {
              return !sidebarCollapsed && (
                <div key={`separator-${sectionIndex}`} className="my-4 border-t border-slate-200 dark:border-slate-700" />
              );
            }

            return (
              <div key={sectionIndex} className="mb-6">
                {!sidebarCollapsed && section.title && (
                  <div className="px-4 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.modules.map((moduleKey) => {
                    if (!user || !hasModuleAccess(user, moduleKey)) return null;

                    const Icon = moduleIcons[moduleKey] || LayoutDashboard;
                    const label = moduleLabels[moduleKey] || moduleKey;
                    const page = modulePages[moduleKey] || 'Dashboard';
                    const isActive = currentPageName === page;

                    return (
                      <Link
                        key={moduleKey}
                        to={createPageUrl(page)}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        title={sidebarCollapsed ? label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none",
                          sidebarCollapsed && "justify-center px-2",
                          isActive ?
                          "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                          "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        )}>

                        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-emerald-600 dark:text-emerald-400")} />
                        {!sidebarCollapsed && label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900", sidebarCollapsed && "p-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none",
                sidebarCollapsed && "justify-center px-0"
              )}>
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    {user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed &&
                <>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {user?.full_name || 'Bruker'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </>
                }
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('Innstillinger'))} className="select-none">
                <Settings className="mr-2 h-4 w-4" />
                Innstillinger
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 select-none">
                <LogOut className="mr-2 h-4 w-4" />
                Logg ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen &&
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-30"
        onClick={() => setSidebarOpen(false)} />

      }

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          isMobile ? "pt-16 pb-20" : sidebarCollapsed ? "ml-16 pt-16" : "ml-64 pt-16",
          "pb-[env(safe-area-inset-bottom)]"
        )}>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="min-h-screen">

            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation for Mobile */}
      {isMobile && <BottomNav currentPageName={currentPageName} />}
    </div>);

}