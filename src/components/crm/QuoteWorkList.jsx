import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isBefore, isToday, addDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Clock, User, MessageSquare, Calendar, ChevronDown, X, CheckCircle2 } from 'lucide-react';

const PHASE_CONFIG = {
  utarbeidet: { label: 'Utarbeidet', color: 'bg-slate-100 text-slate-700' },
  sendt: { label: 'Sendt', color: 'bg-blue-100 text-blue-700' },
  under_vurdering: { label: 'Under vurdering', color: 'bg-yellow-100 text-yellow-700' },
  avventer_svar: { label: 'Avventer svar', color: 'bg-purple-100 text-purple-700' },
  godkjent: { label: 'Vunnet', color: 'bg-green-100 text-green-700' },
  avslatt: { label: 'Avslått', color: 'bg-red-100 text-red-700' },
  utlopt: { label: 'Utløpt', color: 'bg-orange-100 text-orange-700' },
};

function getStatusDot(quote) {
  if (quote.phase === 'godkjent' || quote.phase === 'avslatt') return null;
  if (!quote.next_followup_date) return { color: 'bg-gray-400', label: 'Mangler oppfølging' };
  const d = parseISO(quote.next_followup_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (isBefore(dd, today)) return { color: 'bg-red-500', label: 'Forfalt' };
  if (isToday(d)) return { color: 'bg-amber-400', label: 'I dag' };
  return { color: 'bg-green-500', label: 'Planlagt' };
}

function sortQuotes(quotes) {
  const order = (q) => {
    if (!q.next_followup_date) return 4;
    const d = parseISO(q.next_followup_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (isBefore(dd, today)) return 1;
    if (isToday(d)) return 2;
    return 3;
  };
  return [...quotes].sort((a, b) => {
    const oa = order(a), ob = order(b);
    if (oa !== ob) return oa - ob;
    if (a.next_followup_date && b.next_followup_date) {
      return new Date(a.next_followup_date) - new Date(b.next_followup_date);
    }
    return 0;
  });
}

function QuoteRow({ quote, onOpen, currentUser }) {
  const [openPanel, setOpenPanel] = useState(null); // 'log' | 'date' | 'phase'
  const [note, setNote] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [notePhase, setNotePhase] = useState('');
  const [phaseValue, setPhaseValue] = useState(quote.phase);
  const [dateValue, setDateValue] = useState(quote.next_followup_date || '');

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.QuoteFollowUp.update(quote.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] }),
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.FollowUpActivity.create({
      ...data,
      quote_followup_id: quote.id,
      activity_date: new Date().toISOString(),
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email,
    }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['followUpActivities'] });
      if (created.next_action_date) {
        updateMutation.mutate({ next_followup_date: created.next_action_date });
      }
      if (notePhase) updateMutation.mutate({ phase: notePhase });
      setNote('');
      setNoteDate('');
      setNotePhase('');
      setOpenPanel(null);
    },
  });

  const handleSaveLog = () => {
    if (!note.trim()) return;
    createActivityMutation.mutate({
      activity_type: 'notat',
      notes: note,
      next_action_date: noteDate || undefined,
    });
  };

  const handleSaveDate = () => {
    updateMutation.mutate({ next_followup_date: dateValue });
    setOpenPanel(null);
  };

  const handleSavePhase = () => {
    updateMutation.mutate({ phase: phaseValue });
    setOpenPanel(null);
  };

  const statusDot = getStatusDot(quote);
  const phaseConf = PHASE_CONFIG[quote.phase] || PHASE_CONFIG.sendt;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => onOpen(quote)}
      >
        {/* Status dot */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}>
          <div className={`w-3 h-3 rounded-full ${statusDot?.color || 'bg-transparent'}`} title={statusDot?.label} />
        </div>

        {/* Customer + ref */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">{quote.customer_name}</span>
            <Badge className={`${phaseConf.color} text-xs`}>{phaseConf.label}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Ref: {quote.quote_reference}
            {quote.quote_amount ? ` • ${quote.quote_amount.toLocaleString('nb-NO')} kr` : ''}
          </p>
        </div>

        {/* Next followup */}
        <div className="hidden md:block flex-shrink-0 text-right min-w-[110px]">
          {quote.next_followup_date ? (
            <span className="text-xs text-slate-600">
              {format(parseISO(quote.next_followup_date), 'dd.MM.yyyy', { locale: nb })}
            </span>
          ) : (
            <span className="text-xs text-slate-300 italic">Ikke satt</span>
          )}
        </div>

        {/* Responsible */}
        <div className="hidden lg:flex flex-shrink-0 items-center gap-1 text-xs text-slate-500 min-w-[120px]">
          <User className="h-3 w-3" />
          <span className="truncate">{quote.responsible_name || quote.responsible_user || '—'}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant={openPanel === 'log' ? 'default' : 'outline'}
            className="h-8 rounded-lg text-xs px-3"
            onClick={() => setOpenPanel(openPanel === 'log' ? null : 'log')}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Logg
          </Button>
          <Button
            size="sm"
            variant={openPanel === 'date' ? 'default' : 'outline'}
            className="h-8 rounded-lg text-xs px-3"
            onClick={() => setOpenPanel(openPanel === 'date' ? null : 'date')}
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Dato
          </Button>
          <Button
            size="sm"
            variant={openPanel === 'phase' ? 'default' : 'outline'}
            className="h-8 rounded-lg text-xs px-3"
            onClick={() => setOpenPanel(openPanel === 'phase' ? null : 'phase')}
          >
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Fase
          </Button>
        </div>
      </div>

      {/* Inline panels */}
      {openPanel === 'log' && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Skriv notat fra samtale eller møte..."
            rows={3}
            className="rounded-lg text-sm resize-none bg-white"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <Input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="h-8 text-sm rounded-lg w-36" />
            </div>
            <Select value={notePhase} onValueChange={setNotePhase}>
              <SelectTrigger className="h-8 text-xs rounded-lg w-40">
                <SelectValue placeholder="Endre fase (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Ikke endre fase</SelectItem>
                {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg"
                onClick={() => setOpenPanel(null)}>Avbryt</Button>
              <Button size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveLog}
                disabled={!note.trim() || createActivityMutation.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Lagre
              </Button>
            </div>
          </div>
        </div>
      )}

      {openPanel === 'date' && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)}
            className="h-8 text-sm rounded-lg w-40" />
          <Button size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSaveDate} disabled={updateMutation.isPending}>Lagre</Button>
          <button onClick={() => setOpenPanel(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {openPanel === 'phase' && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-3">
          <Select value={phaseValue} onValueChange={setPhaseValue}>
            <SelectTrigger className="h-8 text-xs rounded-lg w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSavePhase} disabled={updateMutation.isPending}>Lagre</Button>
          <button onClick={() => setOpenPanel(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuoteWorkList({ quotes, onOpen, showArchive, currentUser }) {
  const activeQuotes = quotes.filter(q => !['godkjent', 'avslatt'].includes(q.phase));
  const archivedQuotes = quotes.filter(q => ['godkjent', 'avslatt'].includes(q.phase));
  const displayQuotes = sortQuotes(showArchive ? archivedQuotes : activeQuotes);

  if (displayQuotes.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-200" />
        <p className="font-medium">{showArchive ? 'Ingen arkiverte tilbud' : 'Ingen aktive tilbud'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayQuotes.map(q => (
        <QuoteRow key={q.id} quote={q} onOpen={onOpen} currentUser={currentUser} />
      ))}
    </div>
  );
}