import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function QuoteFollowUpDetail({ open, onOpenChange, quote, activities }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phase: quote?.phase || '',
    next_followup_date: quote?.next_followup_date || '',
    follow_up_completed: quote?.follow_up_completed || false
  });
  const [activityForm, setActivityForm] = useState({
    activity_type: 'notat',
    notes: '',
    next_action: '',
    next_action_date: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuoteFollowUp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteFollowUps'] });
      setEditMode(false);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followUpActivities'] });
      
      // Update quote if next action date is set
      if (data.next_action_date) {
        updateMutation.mutate({
          id: quote.id,
          data: { 
            next_followup_date: data.next_action_date,
            follow_up_completed: false
          }
        });
      }
      
      setShowActivityForm(false);
      setActivityForm({
        activity_type: 'notat',
        notes: '',
        next_action: '',
        next_action_date: ''
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: quote.id, data: formData });
  };

  const handleActivitySubmit = (e) => {
    e.preventDefault();
    createActivityMutation.mutate(activityForm);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'samtale': return <Phone className="h-4 w-4" />;
      case 'mote': return <Calendar className="h-4 w-4" />;
      case 'epost': return <Mail className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type) => {
    const labels = {
      samtale: 'Samtale',
      mote: 'Møte',
      epost: 'E-post',
      notat: 'Notat',
      annet: 'Annet'
    };
    return labels[type] || type;
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="flex items-center justify-between">
            <span>{quote.customer_name}</span>
            <div className="flex items-center gap-2">
              <Badge className={`${quote.phase === 'godkjent' ? 'bg-green-100 text-green-700' : 
                                quote.phase === 'avslatt' ? 'bg-red-100 text-red-700' : 
                                'bg-blue-100 text-blue-700'}`}>
                {quote.phase}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 max-h-[calc(90vh-10rem)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Oversikt</TabsTrigger>
              <TabsTrigger value="activities">
                Aktiviteter ({activities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {editMode ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Fase</Label>
                    <Select
                      value={formData.phase}
                      onValueChange={(v) => setFormData({...formData, phase: v})}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utarbeidet">Utarbeidet</SelectItem>
                        <SelectItem value="sendt">Sendt</SelectItem>
                        <SelectItem value="under_vurdering">Under vurdering</SelectItem>
                        <SelectItem value="godkjent">Godkjent</SelectItem>
                        <SelectItem value="avslatt">Avslått</SelectItem>
                        <SelectItem value="utlopt">Utløpt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Neste oppfølging</Label>
                    <Input
                      type="date"
                      value={formData.next_followup_date}
                      onChange={(e) => setFormData({...formData, next_followup_date: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="rounded-xl">
                      Avbryt
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      Lagre
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <Card className="p-4 bg-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Tilbudsnummer</p>
                        <p className="font-medium">{quote.quote_reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Beløp</p>
                        <p className="font-medium">{quote.quote_amount?.toLocaleString('nb-NO')} kr</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Sendt dato</p>
                        <p className="font-medium">
                          {format(parseISO(quote.sent_date), 'dd.MM.yyyy', { locale: nb })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Ansvarlig</p>
                        <p className="font-medium">{quote.responsible_name || quote.responsible_user}</p>
                      </div>
                      {quote.next_followup_date && (
                        <div>
                          <p className="text-sm text-slate-500">Neste oppfølging</p>
                          <p className="font-medium">
                            {format(parseISO(quote.next_followup_date), 'dd.MM.yyyy', { locale: nb })}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {quote.description && (
                    <Card className="p-4">
                      <p className="text-sm text-slate-500 mb-2">Beskrivelse</p>
                      <p className="text-slate-700">{quote.description}</p>
                    </Card>
                  )}

                  {quote.documents?.length > 0 && (
                    <Card className="p-4">
                      <p className="text-sm text-slate-500 mb-2">Dokumenter</p>
                      <div className="space-y-2">
                        {quote.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-emerald-600 hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            Dokument {idx + 1}
                          </a>
                        ))}
                      </div>
                    </Card>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(quote.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Slett tilbud
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormData({
                          phase: quote.phase,
                          next_followup_date: quote.next_followup_date || '',
                          follow_up_completed: quote.follow_up_completed || false
                        });
                        setEditMode(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rediger
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ny oppfølging
              </Button>

              {showActivityForm && (
                <Card className="p-4">
                  <form onSubmit={handleActivitySubmit} className="space-y-4">
                    <div>
                      <Label>Type aktivitet</Label>
                      <Select
                        value={activityForm.activity_type}
                        onValueChange={(v) => setActivityForm({...activityForm, activity_type: v})}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="samtale">Samtale</SelectItem>
                          <SelectItem value="mote">Møte</SelectItem>
                          <SelectItem value="epost">E-post</SelectItem>
                          <SelectItem value="notat">Notat</SelectItem>
                          <SelectItem value="annet">Annet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notater *</Label>
                      <Textarea
                        value={activityForm.notes}
                        onChange={(e) => setActivityForm({...activityForm, notes: e.target.value})}
                        placeholder="Hva ble diskutert? Hva er status?"
                        rows={4}
                        required
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Neste handling</Label>
                      <Input
                        value={activityForm.next_action}
                        onChange={(e) => setActivityForm({...activityForm, next_action: e.target.value})}
                        placeholder="Hva skal gjøres videre?"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Dato for neste handling</Label>
                      <Input
                        type="date"
                        value={activityForm.next_action_date}
                        onChange={(e) => setActivityForm({...activityForm, next_action_date: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowActivityForm(false)}
                        className="rounded-xl"
                      >
                        Avbryt
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createActivityMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                      >
                        Lagre aktivitet
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {activities.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Ingen aktiviteter ennå</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Legg til din første oppfølging for å bygge opp historikk
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getActivityLabel(activity.activity_type)}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {format(parseISO(activity.activity_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                            </span>
                            <span className="text-xs text-slate-500">• {activity.user_name}</span>
                          </div>
                          <p className="text-slate-700 mb-2">{activity.notes}</p>
                          {activity.next_action && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                <span className="font-medium text-blue-900">Neste handling:</span>
                                <span className="text-blue-700">{activity.next_action}</span>
                                {activity.next_action_date && (
                                  <>
                                    <span className="text-blue-500">•</span>
                                    <span className="text-blue-600">
                                      {format(parseISO(activity.next_action_date), 'dd.MM.yyyy', { locale: nb })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}