import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0 Kr.';
  return `${Math.round(amount).toLocaleString('nb-NO')} Kr.`;
};

const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return Math.round(num).toLocaleString('nb-NO');
};

const iconColors = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700'
};

const statusColors = {
  good: 'border-l-4 border-l-emerald-500 bg-emerald-50/30',
  warning: 'border-l-4 border-l-yellow-500 bg-yellow-50/30',
  danger: 'border-l-4 border-l-red-500 bg-red-50/30',
  neutral: 'border-l-4 border-l-blue-500 bg-blue-50/30'
};

export default function ProjectKPISection({ projectId, userRole }) {
  // Kun Admin og Prosjektleder kan se seksjonen
  if (userRole !== 'admin' && userRole !== 'prosjektleder') {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(`project-kpi-expanded-${projectId}`);
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem(`project-kpi-expanded-${projectId}`, JSON.stringify(isExpanded));
  }, [isExpanded, projectId]);

  // Hent data
  const { data: orders = [] } = useQuery({
    queryKey: ['projectOrders', projectId],
    queryFn: () => base44.entities.Order.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['projectChanges', projectId],
    queryFn: () => base44.entities.ChangeNotification.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['projectInvoices', projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['projectTimesheets', projectId],
    queryFn: () => base44.entities.Timesheet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['projectDeviations', projectId],
    queryFn: () => base44.entities.Deviation.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  // Beregninger
  // 1. Kontraktsverdi = Ordresum + godkjente endringsmeldinger
  const orderSum = orders
    .filter(o => o.status === 'godkjent')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  
  const approvedChanges = changes
    .filter(c => c.status === 'godkjent')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  
  const contractValue = orderSum + approvedChanges;

  // 2. Fakturert beløp
  const invoicedAmount = invoices
    .filter(i => i.status !== 'kladd')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // 3. Gjenstående fakturering
  const remainingInvoicing = contractValue - invoicedAmount;

  // 4. Kalkulerte timer (fra prosjekt budsjett - må legges til i Project entity)
  // For nå bruker vi en placeholder. Dette kan utvides senere.
  const calculatedHours = project?.calculated_hours || 0;

  // 5. Registrerte timer
  const registeredHours = timesheets.reduce((sum, t) => sum + (t.hours || 0), 0);

  // 6. Timeravvik (%)
  const hourDeviation = calculatedHours > 0 
    ? ((registeredHours / calculatedHours) * 100) 
    : 0;

  // 7. Kalkulert timekost (antatt timekost 850 kr - kan konfigureres)
  const hourlyRate = project?.hourly_rate || 850;
  const calculatedHourCost = registeredHours * hourlyRate;

  // 8. Kalkulert total kostnad
  const materialCost = project?.calculated_material_cost || 0;
  const subcontractorCost = project?.calculated_subcontractor_cost || 0;
  const calculatedTotalCost = calculatedHourCost + materialCost + subcontractorCost;

  // 9. Kalkulert bruttofortjeneste
  const grossProfit = contractValue - calculatedTotalCost;

  // 10. Åpne avvik
  const openDeviations = deviations.filter(d => d.status !== 'lukket').length;

  // Fargekoding
  const getHourStatus = () => {
    if (calculatedHours === 0) return 'neutral';
    if (hourDeviation > 100) return 'danger';
    if (hourDeviation > 80) return 'warning';
    return 'good';
  };

  const getProfitStatus = () => {
    if (grossProfit < 0) return 'danger';
    if (grossProfit < contractValue * 0.1) return 'warning';
    return 'good';
  };

  const { data: checklists = [] } = useQuery({
    queryKey: ['projectChecklists', projectId],
    queryFn: () => base44.entities.Checklist.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const openChecklists = checklists.filter(c => c.status !== 'fullfort').length;

  const kpis = [
    {
      title: 'Kontraktsverdi',
      value: formatAmount(contractValue),
      subtitle: 'Ordre + endringsmeldinger',
      status: 'neutral'
    },
    {
      title: 'Fakturert beløp',
      value: formatAmount(invoicedAmount),
      status: 'neutral'
    },
    {
      title: 'Gjenstående fakturering',
      value: formatAmount(remainingInvoicing),
      status: remainingInvoicing > 0 ? 'good' : 'neutral'
    },
    {
      title: 'Kalkulerte timer',
      value: formatNumber(calculatedHours),
      status: 'neutral'
    },
    {
      title: 'Registrerte timer',
      value: formatNumber(registeredHours),
      status: getHourStatus(),
      link: createPageUrl(`Timelister?project_id=${projectId}`)
    },
    {
      title: 'Timeravvik',
      value: `${hourDeviation.toFixed(1)} %`,
      subtitle: calculatedHours > 0 ? `${formatNumber(registeredHours)} / ${formatNumber(calculatedHours)}` : '',
      status: getHourStatus()
    },
    {
      title: 'Kalkulert timekost',
      value: formatAmount(calculatedHourCost),
      subtitle: `${formatNumber(registeredHours)} timer × ${hourlyRate} kr`,
      status: 'neutral'
    },
    {
      title: 'Kalkulert total kostnad',
      value: formatAmount(calculatedTotalCost),
      subtitle: 'Timer + materiale + underentreprenør',
      status: 'neutral'
    },
    {
      title: 'Kalkulert bruttofortjeneste',
      value: formatAmount(grossProfit),
      subtitle: `Margin: ${contractValue > 0 ? ((grossProfit / contractValue) * 100).toFixed(1) : 0} %`,
      status: getProfitStatus()
    },
    {
      title: 'Åpne avvik',
      value: formatNumber(openDeviations),
      status: openDeviations > 5 ? 'warning' : openDeviations > 0 ? 'neutral' : 'good',
      link: createPageUrl(`Avvik?project_id=${projectId}`)
    },
    {
      title: 'Sjekklister',
      value: formatNumber(openChecklists),
      subtitle: 'Ikke fullførte',
      status: openChecklists > 0 ? 'neutral' : 'good',
      link: createPageUrl(`Sjekklister?project_id=${projectId}`)
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Prosjekt nøkkeltall</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpis.map((kpi, index) => {
            const cardContent = (
              <Card
                key={index}
                className={cn(
                  "p-4 hover:shadow-md transition-all h-full",
                  statusColors[kpi.status],
                  kpi.link && "cursor-pointer"
                )}
              >
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">{kpi.title}</p>
                  <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-xs text-slate-500">{kpi.subtitle}</p>
                  )}
                </div>
              </Card>
            );
            return kpi.link ? (
              <Link key={index} to={kpi.link} className="h-full block">{cardContent}</Link>
            ) : (
              <div key={index} className="h-full">{cardContent}</div>
            );
          })}
        </div>
      )}

      {isExpanded && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-slate-700">
            <strong>Viktig:</strong> Alle tall er basert på registrerte data i KS-systemet. 
            Dette er et prosjektstyringsverktøy, ikke et økonomisystem.
          </p>
        </Card>
      )}
    </div>
  );
}