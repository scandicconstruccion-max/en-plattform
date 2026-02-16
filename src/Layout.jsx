import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, AlertTriangle, FileText, Clock, Camera, CheckSquare,
  FileSpreadsheet, ShoppingCart, MessageSquare, Users, CalendarDays,
  Building2, Settings, LogOut, Menu, X, ChevronDown, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const moduleIcons = {
  dashboard: LayoutDashboard,
  avvik: AlertTriangle,
  endringsmeldinger: FileText,
  timelister: Clock,
  bildedok: Camera,
  sjekklister: CheckSquare,
  tilbud: FileSpreadsheet,
  bestillinger: ShoppingCart,
  chat: MessageSquare,
  ressursplan: Users,
  prosjekter: Building2,
  crm: Users,
  kalender: CalendarDays,
};

const moduleLabels = {
  dashboard: 'Dashboard',
  avvik: 'Avvik',
  endringsmeldinger: 'Endringsmeldinger',
  timelister: 'Timelister',
  bildedok: 'Bildedokumentasjon',
  sjekklister: 'Sjekklister',
  tilbud: 'Tilbud',
  bestillinger: 'Bestillinger',
  chat: 'Intern Chat',
  ressursplan: 'Ressursplanlegger',
  prosjekter: 'Prosjekter',
  crm: 'CRM',
  kalender: 'Kalender',
};

const modulePages = {
  dashboard: 'Dashboard',
  avvik: 'Avvik',
  endringsmeldinger: 'Endringsmeldinger',
  timelister: 'Timelister',
  bildedok: 'Bildedok',
  sjekklister: 'Sjekklister',
  tilbud: 'Tilbud',
  bestillinger: 'Bestillinger',
  chat: 'Chat',
  ressursplan: 'Ressursplan',
  prosjekter: 'Prosjekter',
  crm: 'CRM',
  kalender: 'Kalender',
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const company = companies?.[0];
  const activeModules = company?.active_modules || [
    'dashboard', 'avvik', 'endringsmeldinger', 'timelister', 'bildedok',
    'sjekklister', 'tilbud', 'bestillinger', 'chat', 'ressursplan',
    'prosjekter', 'crm', 'kalender'
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
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold text-slate-900">ByggeKS</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </header>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-transform duration-300",
          isMobile ? "w-72" : "w-64",
          isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0",
          isMobile && "pt-16"
        )}
      >
        {/* Logo */}
        {!isMobile && (
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">ByggeKS</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-8rem)]">
          {activeModules.map((moduleKey) => {
            const Icon = moduleIcons[moduleKey] || LayoutDashboard;
            const label = moduleLabels[moduleKey] || moduleKey;
            const page = modulePages[moduleKey] || 'Dashboard';
            const isActive = currentPageName === page;

            return (
              <Link
                key={moduleKey}
                to={createPageUrl(page)}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-emerald-600")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.full_name || 'Bruker'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('Innstillinger'))}>
                <Settings className="mr-2 h-4 w-4" />
                Innstillinger
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logg ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          isMobile ? "pt-16" : "ml-64"
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}