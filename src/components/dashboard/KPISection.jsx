import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Building2, DollarSign, AlertTriangle, Clock, FileText, TrendingUp, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatAmount } from '@/components/shared/formatNumber';

export default function KPISection() {
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem('kpiSectionExpanded');
    return stored === null ? true : stored === 'true';
  });
  const [invoiceView, setInvoiceView] = useState('month');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 1000),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 1000),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => base44.entities.Timesheet.list('-date', 10000),
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => base44.entities.Deviation.list('-created_date', 1000),
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['changes'],
    queryFn: () => base44.entities.ChangeNotification.list('-created_date', 1000),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 1000),
  });

  // 1. Aktive prosjekter
  const activeProjects = projects.filter(p => p.status !== 'fullfort').length;

  // 2. Fakturert denne måneden
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const invoicedThisMonth = invoices
    .filter(i => {
      if (!i.invoice_date) return false;
      const invoiceDate = new Date(i.invoice_date);
      return invoiceDate.getMonth() === currentMonth && 
             invoiceDate.getFullYear() === currentYear &&
             i.status !== 'kladd';
    })
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // 2b. Fakturert hittil i år
  const invoicedYearToDate = invoices
    .filter(i => {
      if (!i.invoice_date) return false;
      const invoiceDate = new Date(i.invoice_date);
      return invoiceDate.getFullYear() === currentYear &&
             i.status !== 'kladd';
    })
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // 3. Utestående faktura
  const outstandingInvoices = invoices
    .filter(i => i.status === 'sendt' || i.status === 'forfalt')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // 3b. Forfalte faktura
  const overdueInvoices = invoices
    .filter(i => {
      if (i.status === 'betalt' || i.status === 'kladd') return false;
      return i.due_date && new Date(i.due_date) < new Date();
    })
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // 4. Timer brukt vs kalkulert
  const projectsWithTimeOverrun = projects.filter(p => {
    const projectTimesheets = timesheets.filter(t => t.project_id === p.id);
    const actualHours = projectTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
    const budgetedHours = p.budgeted_hours || 0;
    return budgetedHours > 0 && actualHours > budgetedHours;
  }).length;

  // 5. Åpne avvik
  const openDeviations = deviations.filter(d => d.status !== 'lukket').length;

  // 6. Endringsmeldinger - verdi
  const approvedChangesValue = changes
    .filter(c => c.status === 'godkjent')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  // 7. Tilbud godkjenningsgrad
  const sentQuotes = quotes.filter(q => q.status === 'sendt' || q.status === 'godkjent' || q.status === 'avvist');
  const approvedQuotes = quotes.filter(q => q.status === 'godkjent');
  const approvalRate = sentQuotes.length > 0 ? (approvedQuotes.length / sentQuotes.length) * 100 : 0;

  const kpiData = [
    {
      title: 'Aktive prosjekter',
      value: activeProjects,
      icon: Building2,
      color: 'blue',
      link: createPageUrl('Prosjekter'),
      status: 'neutral'
    },
    {
      title: invoiceView === 'month' ? 'Fakturert denne måneden' : 'Fakturert hittil i år',
      value: invoiceView === 'month' ? formatAmount(invoicedThisMonth) : formatAmount(invoicedYearToDate),
      icon: DollarSign,
      color: 'green',
      link: createPageUrl('Faktura'),
      status: 'good',
      isInvoiceCard: true
    },
    {
      title: 'Ikke forfalte faktura',
      value: formatAmount(outstandingInvoices),
      icon: FileText,
      color: 'amber',
      link: createPageUrl('Faktura'),
      status: outstandingInvoices > 100000 ? 'warning' : 'neutral'
    },
    {
      title: 'Forfalte faktura',
      value: formatAmount(overdueInvoices),
      icon: AlertTriangle,
      color: 'red',
      link: createPageUrl('Faktura'),
      status: overdueInvoices > 0 ? 'bad' : 'good'
    },
    {
      title: 'Prosjekter over timebudsjett',
      value: projectsWithTimeOverrun,
      icon: Clock,
      color: 'red',
      link: createPageUrl('Timelister'),
      status: projectsWithTimeOverrun > 0 ? 'bad' : 'good'
    },
    {
      title: 'Åpne avvik',
      value: openDeviations,
      icon: AlertTriangle,
      color: 'orange',
      link: createPageUrl('Avvik'),
      status: openDeviations > 5 ? 'warning' : 'neutral'
    },
    {
      title: 'Godkjente endringsmeldinger',
      value: formatAmount(approvedChangesValue),
      icon: TrendingUp,
      color: 'purple',
      link: createPageUrl('Endringsmeldinger'),
      status: 'neutral'
    },
    {
      title: 'Tilbud godkjenningsgrad',
      value: `${approvalRate.toFixed(0)}%`,
      icon: CheckCircle,
      color: 'teal',
      link: createPageUrl('Tilbud'),
      status: approvalRate > 60 ? 'good' : approvalRate > 40 ? 'warning' : 'bad'
    }
  ];

  const statusColors = {
    good: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    bad: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    neutral: 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
  };

  const iconColors = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    teal: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nøkkeltall</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = !isExpanded;
            setIsExpanded(next);
            localStorage.setItem('kpiSectionExpanded', String(next));
          }}
          className="gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Skjul nøkkeltall
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Vis nøkkeltall
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => (
            <Link key={index} to={kpi.link} onClick={(e) => {
              if (kpi.isInvoiceCard && e.target.closest('.toggle-invoice-view')) {
                e.preventDefault();
              }
            }}>
              <Card className={`border shadow-sm p-5 hover:shadow-md transition-all cursor-pointer ${statusColors[kpi.status]}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{kpi.title}</p>
                      {kpi.isInvoiceCard && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setInvoiceView(prev => prev === 'month' ? 'year' : 'month');
                          }}
                          className="toggle-invoice-view p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-1"
                          title={invoiceView === 'month' ? 'Vis hittil i år' : 'Vis denne måneden'}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[kpi.color]}`}>
                    {kpi.title.toLowerCase().includes('faktur') || kpi.title.includes('endringsmeldinger') ? (
                      <span className="text-lg font-bold">Kr.</span>
                    ) : (
                      <kpi.icon className="h-6 w-6" />
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}