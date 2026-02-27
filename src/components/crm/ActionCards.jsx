import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Clock, Inbox } from 'lucide-react';
import { isBefore, isToday, parseISO } from 'date-fns';

export default function ActionCards({ quotes, activeFilter, onFilterChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeQuotes = quotes.filter(q => !['godkjent', 'avslatt'].includes(q.phase));

  const overdue = activeQuotes.filter(q => {
    if (!q.next_followup_date) return false;
    const d = parseISO(q.next_followup_date);
    d.setHours(0, 0, 0, 0);
    return isBefore(d, today);
  });

  const todayFollowUp = activeQuotes.filter(q => {
    if (!q.next_followup_date) return false;
    return isToday(parseISO(q.next_followup_date));
  });

  const missingFollowUp = quotes.filter(q =>
    q.phase === 'sendt' && !q.next_followup_date
  );

  const cards = [
    {
      key: 'overdue',
      label: 'Forfalt oppfølging',
      count: overdue.length,
      icon: AlertCircle,
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
      border: activeFilter === 'overdue' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-100',
      countColor: 'text-red-600',
    },
    {
      key: 'today',
      label: 'Oppfølging i dag',
      count: todayFollowUp.length,
      icon: Clock,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      border: activeFilter === 'today' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-100',
      countColor: 'text-amber-600',
    },
    {
      key: 'missing',
      label: 'Mangler oppfølging',
      count: missingFollowUp.length,
      icon: Inbox,
      bg: 'bg-slate-50',
      iconColor: 'text-slate-400',
      border: activeFilter === 'missing' ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-200',
      countColor: 'text-slate-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        return (
          <Card
            key={card.key}
            className={`p-5 border cursor-pointer transition-all hover:shadow-md ${card.border} ${isActive ? card.bg : 'bg-white'}`}
            onClick={() => onFilterChange(isActive ? null : card.key)}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold ${card.countColor}`}>{card.count}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}