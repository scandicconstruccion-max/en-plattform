import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, getWeek, getYear, isSameDay, parseISO
} from 'date-fns';
import { nb } from 'date-fns/locale';

export default function TimeSummary({ employee }) {
  const [tab, setTab] = useState('uke');
  const [refDate, setRefDate] = useState(new Date());

  // Fetch all timesheets for this employee
  const { data: allTimesheets = [] } = useQuery({
    queryKey: ['allTimesheets', employee?.id],
    queryFn: () => base44.entities.Timesheet.filter({ employee_id: employee.id }),
    enabled: !!employee
  });

  const navigate = (dir) => {
    if (tab === 'dag') setRefDate(d => addDays(d, dir));
    else if (tab === 'uke') setRefDate(d => addWeeks(d, dir));
    else setRefDate(d => addMonths(d, dir));
  };

  const periodLabel = useMemo(() => {
    if (tab === 'dag') return format(refDate, 'd. MMMM yyyy', { locale: nb });
    if (tab === 'uke') {
      const ws = startOfWeek(refDate, { weekStartsOn: 1 });
      const we = endOfWeek(refDate, { weekStartsOn: 1 });
      return `Uke ${getWeek(ws, { weekStartsOn: 1 })} — ${format(ws, 'd. MMM', { locale: nb })} – ${format(we, 'd. MMM yyyy', { locale: nb })}`;
    }
    return format(refDate, 'MMMM yyyy', { locale: nb });
  }, [tab, refDate]);

  const filtered = useMemo(() => {
    return allTimesheets.filter(t => {
      if (!t.date) return false;
      const d = parseISO(t.date);
      if (tab === 'dag') return isSameDay(d, refDate);
      if (tab === 'uke') {
        const ws = startOfWeek(refDate, { weekStartsOn: 1 });
        const we = endOfWeek(refDate, { weekStartsOn: 1 });
        return d >= ws && d <= we;
      }
      const ms = startOfMonth(refDate);
      const me = endOfMonth(refDate);
      return d >= ms && d <= me;
    });
  }, [allTimesheets, tab, refDate]);

  const totalHours = filtered.reduce((sum, t) => sum + (t.hours || 0), 0);

  // Group by date for week/month views
  const grouped = useMemo(() => {
    if (tab === 'dag') return null;
    const map = {};
    filtered.forEach(t => {
      const key = t.date;
      if (!map[key]) map[key] = { date: key, timesheets: [], hours: 0 };
      map[key].timesheets.push(t);
      map[key].hours += t.hours || 0;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, tab]);

  const statusColor = (status) => {
    if (status === 'godkjent') return 'bg-green-100 text-green-700';
    if (status === 'sendt_inn') return 'bg-blue-100 text-blue-700';
    if (status === 'avvist') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  const statusLabel = (status) => {
    if (status === 'godkjent') return 'Godkjent';
    if (status === 'sendt_inn') return 'Sendt inn';
    if (status === 'avvist') return 'Avvist';
    return 'Kladd';
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Timeoversikt</h2>
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xl">
          <Clock className="h-5 w-5" />
          {totalHours.toFixed(1)}t
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setRefDate(new Date()); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="dag">Dag</TabsTrigger>
          <TabsTrigger value="uke">Uke</TabsTrigger>
          <TabsTrigger value="maned">Måned</TabsTrigger>
        </TabsList>

        {/* Period navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 capitalize">{periodLabel}</span>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} className="rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="dag" className="space-y-2 mt-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Ingen timer registrert denne dagen</p>
          ) : filtered.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">{t.project_name}</p>
                <p className="text-xs text-slate-500">{t.work_description?.slice(0, 60)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{(t.hours || 0).toFixed(1)}t</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="uke" className="space-y-2 mt-0">
          {!grouped || grouped.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Ingen timer registrert denne uken</p>
          ) : grouped.map(day => (
            <div key={day.date} className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {format(parseISO(day.date), 'EEEE d. MMM', { locale: nb })}
                </span>
                <span className="text-sm font-bold text-emerald-600">{day.hours.toFixed(1)}t</span>
              </div>
              {day.timesheets.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{t.project_name}</p>
                    <p className="text-xs text-slate-500">{t.work_description?.slice(0, 50)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{(t.hours || 0).toFixed(1)}t</span>
                </div>
              ))}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="maned" className="space-y-2 mt-0">
          {!grouped || grouped.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Ingen timer registrert denne måneden</p>
          ) : grouped.map(day => (
            <div key={day.date} className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {format(parseISO(day.date), 'EEEE d. MMM', { locale: nb })}
                </span>
                <span className="text-sm font-bold text-emerald-600">{day.hours.toFixed(1)}t</span>
              </div>
              {day.timesheets.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{t.project_name}</p>
                    <p className="text-xs text-slate-500">{t.work_description?.slice(0, 50)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{(t.hours || 0).toFixed(1)}t</span>
                </div>
              ))}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
}