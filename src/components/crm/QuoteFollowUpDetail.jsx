import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, MessageSquare, Phone, Mail, FileText, Plus, Edit, Trash2,
  Clock, CheckCircle2, AlertTriangle, User, TrendingUp, ExternalLink, X,
  Upload, Paperclip, Download, FolderOpen
} from 'lucide-react';
import { format, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';

const PHASE_CONFIG = {
  utarbeidet: { label: 'Utarbeidet', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  sendt: { label: 'Sendt', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  under_vurdering: { label: 'Under vurdering', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  godkjent: { label: 'Godkjent', color: 'bg-green-100 text-green-700 border-green-200' },
  avslatt: { label: 'Avslått', color: 'bg-red-100 text-red-700 border-red-200' },
  utlopt: { label: 'Utløpt', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const ACTIVITY_LABELS = {
  samtale: 'Samtale', mote: 'Møte', epost: 'E-post', notat: 'Notat', annet: 'Annet'
};

function getFollowUpStatus(dateStr) {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  const days = differenceInDays(date, new Date());
  if (isPast(date) && !isToday(date)) return { label: 'Forfalt', color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' };
  if (days <= 2) return { label: `Om ${days <= 0 ? 'i dag' : days + ' dag' + (days > 1 ? 'er' : '')}`, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' };
  return { label: `${format(date, 'dd.MM.yyyy', { locale: nb })}`, color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' };
}

function ActivityIcon({ type }) {
  const icons = {
    samtale: <Phone className="h-3.5 w-3.5" />,
    mote: <Calendar className="h-3.5 w-3.5" />,
    epost: <Mail className="h-3.5 w-3.5" />,
    notat: <MessageSquare className="h-3.5 w-3.5" />,
    annet: <TrendingUp className="h-3.5 w-3.5" />,
  };
  return icons[type] || <MessageSquare className="h-3.5 w-3.5" />;
}

export default function QuoteFollowUpDetail({ open, onOpenChange, quote, activities }) {
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteDate, setQuickNoteDate] = useState('');
  const [quickNoteType, setQuickNoteType] = useState('notat');
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showPhaseEdit, setShowPhaseEdit] = useState(false);
  const [showFollowUpEdit, setShowFollowUpEdit] = useState(false);
  const [newPhase, setNewPhase] = useState(quote?.phase || '');
  const [newFollowUpDate, setNewFollowUpDate] = useState(quote?.next_followup_date || '');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuoteFollowUp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
      setShowPhaseEdit(false);
      setShowFollowUpEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuoteFollowUp.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
      onOpenChange(false);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.FollowUpActivity.create({
      ...data,
      quote_followup_id: quote.id,
      activity_date: new Date().toISOString(),
      user_email: user?.email,
      user_name: user?.full_name || user?.email
    }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['followUpActivities'] });
      if (created.next_action_date) {
        updateMutation.mutate({ id: quote.id, data: { next_followup_date: created.next_action_date, follow_up_completed: false } });
      }
      setQuickNote('');
      setQuickNoteDate('');
      setQuickNoteType('notat');
      setShowQuickNote(false);
    },
  });

  const handleSaveNote = () => {
    if (!quickNote.trim()) return;
    createActivityMutation.mutate({
      activity_type: quickNoteType,
      notes: quickNote,
      next_action_date: quickNoteDate || undefined,
    });
  };

  const handleMarkDone = () => {
    updateMutation.mutate({ id: quote.id, data: { follow_up_completed: true, next_followup_date: '' } });
  };

  if (!quote) return null;

  const phaseConfig = PHASE_CONFIG[quote.phase] || PHASE_CONFIG.sendt;
  const followUpStatus = getFollowUpStatus(quote.next_followup_date);
  const sortedActivities = [...(activities || [])].sort(
    (a, b) => new Date(b.activity_date) - new Date(a.activity_date)
  );
  const latestActivity = sortedActivities[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">

        {/* STICKY HEADER */}
        <div className="flex-shrink-0 bg-white border-b px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Customer info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">{quote.customer_name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {quote.quote_reference}</span>
                {quote.quote_amount && (
                  <span className="font-semibold text-slate-800">{quote.quote_amount.toLocaleString('nb-NO')} kr</span>
                )}
                {quote.sent_date && (
                  <span>Sendt {format(parseISO(quote.sent_date), 'dd.MM.yyyy', { locale: nb })}</span>
                )}
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {quote.responsible_name || quote.responsible_user}</span>
              </div>
            </div>

            {/* Right: Phase + follow-up status */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Phase badge */}
                {showPhaseEdit ? (
                  <div className="flex items-center gap-2">
                    <Select value={newPhase} onValueChange={setNewPhase}>
                      <SelectTrigger className="h-8 text-xs w-40 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs px-3"
                      onClick={() => updateMutation.mutate({ id: quote.id, data: { phase: newPhase } })}
                      disabled={updateMutation.isPending}
                    >Lagre</Button>
                    <button onClick={() => setShowPhaseEdit(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setNewPhase(quote.phase); setShowPhaseEdit(true); }}>
                    <Badge className={`${phaseConfig.color} border cursor-pointer hover:opacity-80 transition-opacity text-xs px-2.5 py-0.5`}>
                      {phaseConfig.label}
                    </Badge>
                  </button>
                )}
              </div>

              {/* Follow-up status indicator */}
              {followUpStatus && (
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${followUpStatus.color}`}>
                  <span className={`w-2 h-2 rounded-full ${followUpStatus.dot}`} />
                  {followUpStatus.label}
                </div>
              )}
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8"
              onClick={() => setShowQuickNote(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Ny oppfølging
            </Button>
            {quote.documents?.length > 0 && (
              <a href={quote.documents[0]} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="rounded-lg text-xs h-8">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Åpne dokument
                </Button>
              </a>
            )}
            <Button size="sm" variant="outline" className="rounded-lg text-xs h-8"
              onClick={() => { setNewPhase(quote.phase); setShowPhaseEdit(true); }}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Endre fase
            </Button>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs h-8"
                onClick={() => deleteMutation.mutate(quote.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Slett
              </Button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50">

          {/* ACTION CARD - Neste handling */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Neste planlagte oppfølging
              </h3>
            </div>
            {quote.next_followup_date && !quote.follow_up_completed ? (
              <div className="px-4 py-4">
                <div className={`flex items-center gap-2 text-sm mb-2 px-3 py-2 rounded-lg border ${followUpStatus?.color || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${followUpStatus?.dot || 'bg-slate-400'}`} />
                  <span className="font-semibold">{format(parseISO(quote.next_followup_date), 'EEEE dd. MMMM yyyy', { locale: nb })}</span>
                </div>
                {latestActivity?.next_action && (
                  <p className="text-sm text-slate-600 mb-3 px-1">{latestActivity.next_action}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8" onClick={handleMarkDone}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marker som utført
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs h-8"
                    onClick={() => setShowFollowUpEdit(!showFollowUpEdit)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Rediger dato
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs h-8"
                    onClick={() => setShowQuickNote(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Sett ny oppfølging
                  </Button>
                </div>
                {showFollowUpEdit && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Input type="date" value={newFollowUpDate} onChange={(e) => setNewFollowUpDate(e.target.value)}
                      className="rounded-lg h-8 text-sm max-w-xs" />
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8"
                      onClick={() => updateMutation.mutate({ id: quote.id, data: { next_followup_date: newFollowUpDate } })}
                      disabled={updateMutation.isPending}>Lagre</Button>
                    <button onClick={() => setShowFollowUpEdit(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Ingen oppfølging planlagt
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8"
                  onClick={() => setShowQuickNote(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Legg til oppfølging
                </Button>
              </div>
            )}
          </div>

          {/* QUICK NOTE */}
          {showQuickNote && (
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-800">Nytt notat / oppfølging</h3>
                <button onClick={() => setShowQuickNote(false)} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex gap-2">
                  <Select value={quickNoteType} onValueChange={setQuickNoteType}>
                    <SelectTrigger className="h-8 text-xs rounded-lg w-36 flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notat">Notat</SelectItem>
                      <SelectItem value="samtale">Samtale</SelectItem>
                      <SelectItem value="mote">Møte</SelectItem>
                      <SelectItem value="epost">E-post</SelectItem>
                      <SelectItem value="annet">Annet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Skriv notat fra samtale eller møte..."
                  rows={3}
                  className="rounded-lg text-sm resize-none"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500 flex-shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    Neste oppfølging:
                  </div>
                  <Input type="date" value={quickNoteDate} onChange={(e) => setQuickNoteDate(e.target.value)}
                    className="rounded-lg h-8 text-sm max-w-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setShowQuickNote(false)} className="rounded-lg text-xs h-8">
                    Avbryt
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8"
                    onClick={handleSaveNote} disabled={!quickNote.trim() || createActivityMutation.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    {quickNoteDate ? 'Lagre og sett oppfølging' : 'Lagre notat'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE - Historikk */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Historikk
                <span className="text-xs text-slate-400 font-normal">({sortedActivities.length} hendelser)</span>
              </h3>
            </div>

            {sortedActivities.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Ingen historikk ennå</p>
                <p className="text-xs text-slate-300 mt-0.5">Legg til en oppfølging for å starte historikken</p>
              </div>
            ) : (
              <div className="px-4 py-4">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />

                  <div className="space-y-5">
                    {sortedActivities.map((activity, idx) => (
                      <div key={activity.id} className="flex gap-4 relative">
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center z-10 text-slate-500">
                          <ActivityIcon type={activity.activity_type} />
                        </div>

                        <div className="flex-1 pb-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
                            <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                              {ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                            </span>
                            <span className="text-xs text-slate-500">
                              {format(parseISO(activity.activity_date), "dd. MMM yyyy 'kl.' HH:mm", { locale: nb })}
                            </span>
                            {activity.user_name && (
                              <span className="text-xs text-slate-400">• {activity.user_name}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{activity.notes}</p>
                          {activity.next_action && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                              <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-blue-800">Neste: </span>
                                <span className="text-blue-700">{activity.next_action}</span>
                                {activity.next_action_date && (
                                  <span className="text-blue-500 ml-1">
                                    ({format(parseISO(activity.next_action_date), 'dd.MM.yyyy', { locale: nb })})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Initial entry at bottom of timeline */}
                    <div className="flex gap-4 relative">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 border-2 border-white shadow-sm flex items-center justify-center z-10">
                        <FileText className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Tilbud registrert
                          </span>
                          <span className="text-xs text-slate-500">
                            {quote.sent_date && format(parseISO(quote.sent_date), 'dd. MMM yyyy', { locale: nb })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Tilbud {quote.quote_reference} sendt til {quote.customer_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {quote.description && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Beskrivelse</p>
              <p className="text-sm text-slate-700">{quote.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}