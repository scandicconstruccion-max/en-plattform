import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ProjectDropdown from '@/components/dashboard/ProjectDropdown';
import ModuleGrid from '@/components/dashboard/ModuleGrid';
import KPISection from '@/components/dashboard/KPISection';
import { filterProjectsByAccess, canViewKPI, getAvailableModules } from '@/components/shared/permissions';
import {
  Building2, AlertTriangle, Clock, TrendingUp, ArrowRight, Calendar, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 10),
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date', 10),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => base44.entities.Timesheet.list('-date', 50),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_time', 5),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 50),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies?.[0];
  const activeModules = user ? getAvailableModules(user) : [];
  
  // Filter projects based on user access
  const accessibleProjects = user ? filterProjectsByAccess(user, projects) : projects;

  const activeProjects = accessibleProjects.filter(p => p.status === 'aktiv').length;
  const openDeviations = deviations.filter(d => d.status !== 'lukket').length;
  const totalHoursThisWeek = timesheets
    .filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      return date >= weekAgo;
    })
    .reduce((sum, t) => sum + (t.hours || 0), 0);

  const unpaidInvoices = invoices.filter(i => 
    i.status !== 'betalt' && i.status !== 'kladd' && i.status !== 'kreditert'
  ).length;
  
  const overdueInvoices = invoices.filter(i => {
    if (i.status === 'betalt' || i.status === 'kladd') return false;
    return new Date(i.due_date) < new Date();
  }).length;

  const monthlyRevenue = invoices
    .filter(i => {
      const invoiceDate = new Date(i.invoice_date);
      const now = new Date();
      return invoiceDate.getMonth() === now.getMonth() && 
             invoiceDate.getFullYear() === now.getFullYear() &&
             i.status !== 'kladd';
    })
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Velkommen tilbake, {user?.full_name?.split(' ')[0] || 'Bruker'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {format(new Date(), "EEEE d. MMMM yyyy", { locale: nb })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Section - Only for users with permission */}
        {canViewKPI(user, 'company') && <KPISection />}

        {/* Modules Grid */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Moduler</h2>
          <ModuleGrid activeModules={activeModules} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Siste prosjekter</h2>
                <Link 
                  to={createPageUrl('Prosjekter')}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  Se alle <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {accessibleProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={createPageUrl(`ProsjektDetaljer?id=${project.id}`)}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{project.name}</p>
                      <p className="text-sm text-slate-500">{project.client_name || 'Ingen kunde'}</p>
                    </div>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              ))}
              {accessibleProjects.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Ingen prosjekter tilgjengelig
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Kommende hendelser</h2>
                <Link 
                  to={createPageUrl('Kalender')}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  Se kalender <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {events.filter(e => new Date(e.start_time) >= new Date()).slice(0, 4).map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {format(new Date(event.start_time), 'MMM', { locale: nb }).toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {format(new Date(event.start_time), 'd')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(event.start_time), 'HH:mm')} 
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
              {events.filter(e => new Date(e.start_time) >= new Date()).length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Ingen kommende hendelser
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}