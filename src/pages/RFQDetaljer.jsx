import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { ArrowLeft, Save, Send, Upload, Paperclip, X, CheckCircle, Clock, Users, FileText, Star, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const rfqStatusConfig = {
  utkast:         { label: 'Utkast',          color: 'bg-slate-100 text-slate-700' },
  sendt:          { label: 'Sendt',            color: 'bg-blue-100 text-blue-700' },
  tilbud_mottas:  { label: 'Tilbud mottas',   color: 'bg-emerald-100 text-emerald-700' },
  evaluering:     { label: 'Evaluering',      color: 'bg-amber-100 text-amber-700' },
  tildelt:        { label: 'Tildelt',          color: 'bg-purple-100 text-purple-700' },
  lukket:         { label: 'Lukket',           color: 'bg-slate-200 text-slate-500' },
};

const invStatusConfig = {
  sendt:         { label: 'Sendt',          color: 'bg-blue-100 text-blue-700' },
  apnet:         { label: 'Åpnet',          color: 'bg-amber-100 text-amber-700' },
  besvart:       { label: 'Besvart',        color: 'bg-emerald-100 text-emerald-700' },
  ingen_respons: { label: 'Ingen respons',  color: 'bg-red-100 text-red-700' },
};

export default function RFQDetaljer() {
  const urlParams = new URLSearchParams(window.location.search);
  const rfqId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('info');
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // bid id

  const emptyForm = {
    title: '', description: '', project_id: '', project_name: '', trade: '',
    deadline: '', responsible_person: '', responsible_name: '', status: 'utkast',
    attachments: [], internal_notes: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const { data: rfq } = useQuery({
    queryKey: ['rfq', rfqId],
    queryFn: () => base44.entities.RFQ.get(rfqId),
    enabled: !!rfqId,
  });

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: invitations = [] } = useQuery({
    queryKey: ['rfqInvitations', rfqId],
    queryFn: () => base44.entities.VendorInvitation.filter({ rfq_id: rfqId }),
    enabled: !!rfqId,
  });
  const { data: bids = [] } = useQuery({
    queryKey: ['rfqBids', rfqId],
    queryFn: () => base44.entities.VendorBid.filter({ rfq_id: rfqId }),
    enabled: !!rfqId,
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  useEffect(() => {
    if (rfq) setFormData({ ...emptyForm, ...rfq });
  }, [rfq]);

  useEffect(() => {
    if (isNew && user) {
      setFormData(f => ({ ...f, responsible_person: user.email, responsible_name: user.full_name }));
    }
  }, [isNew, user]);

  const saveMutation = useMutation({
    mutationFn: (data) => rfqId
      ? base44.entities.RFQ.update(rfqId, data)
      : base44.entities.RFQ.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      if (!rfqId) navigate(createPageUrl('RFQDetaljer') + `?id=${result.id}`);
    }
  });

  const updateBidMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VendorBid.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfqBids', rfqId] }),
  });

  const handleSave = () => saveMutation.mutate(formData);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(f => ({ ...f, attachments: [...(f.attachments || []), { name: file.name, url: file_url }] }));
    setIsUploading(false);
  };

  const handleSend = async () => {
    if (!selectedVendors.length) return;
    setIsSending(true);
    // Save first if new
    let id = rfqId;
    if (!id) {
      const result = await base44.entities.RFQ.create(formData);
      id = result.id;
      navigate(createPageUrl('RFQDetaljer') + `?id=${id}`);
    }
    await base44.functions.invoke('rfqSendInvitations', { rfq_id: id, vendor_ids: selectedVendors });
    queryClient.invalidateQueries({ queryKey: ['rfqs'] });
    queryClient.invalidateQueries({ queryKey: ['rfqInvitations', id] });
    setShowVendorPicker(false);
    setSelectedVendors([]);
    setIsSending(false);
  };

  const handleSelectWinner = async (bid) => {
    // Deselect all, then select this one
    for (const b of bids) {
      if (b.id !== bid.id) await base44.entities.VendorBid.update(b.id, { is_selected: false });
    }
    await base44.entities.VendorBid.update(bid.id, { is_selected: !bid.is_selected });
    await base44.entities.RFQ.update(rfqId, { status: 'tildelt', selected_vendor_id: bid.is_selected ? null : bid.vendor_id });
    queryClient.invalidateQueries({ queryKey: ['rfqBids', rfqId] });
    queryClient.invalidateQueries({ queryKey: ['rfqs'] });
  };

  const rfqStatus = rfqStatusConfig[formData.status] || rfqStatusConfig.utkast;
  const tabs = [
    { id: 'info', label: 'Informasjon' },
    { id: 'invitations', label: `Invitasjoner (${invitations.length})` },
    { id: 'bids', label: `Tilbud (${bids.length})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Anbudsportal'))} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{formData.title || 'Ny forespørsel'}</h1>
              {formData.rfq_number && <p className="text-xs text-slate-500">{formData.rfq_number}</p>}
            </div>
            <Badge className={cn("border-0 text-xs", rfqStatus.color)}>{rfqStatus.label}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending} className="rounded-xl gap-2">
              <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
            </Button>
            <Button onClick={() => setShowVendorPicker(true)} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
              <Send className="h-4 w-4" /> Send til leverandører
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === t.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="max-w-2xl space-y-5">
            <Card className="border-0 shadow-sm dark:bg-slate-900 p-5 space-y-4">
              <div>
                <Label>Tittel *</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Tittel på forespørsel" className="mt-1.5 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Prosjekt</Label>
                  <Select value={formData.project_id || '_none'} onValueChange={v => {
                    const p = projects.find(x => x.id === v);
                    setFormData(f => ({ ...f, project_id: v === '_none' ? '' : v, project_name: p?.name || '' }));
                  }}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Velg prosjekt" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Ingen prosjekt</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fagområde</Label>
                  <Input value={formData.trade} onChange={e => setFormData(f => ({ ...f, trade: e.target.value }))} placeholder="F.eks. Elektro, VVS, Tømrer" className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Svarfrist</Label>
                  <Input type="date" value={formData.deadline} onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Ansvarlig person</Label>
                  <Input value={formData.responsible_name} onChange={e => setFormData(f => ({ ...f, responsible_name: e.target.value }))} placeholder="Navn" className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <div>
                <Label>Beskrivelse</Label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Beskriv hva som skal tilbys..." rows={4} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(rfqStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="border-0 shadow-sm dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <Label>Vedlegg</Label>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleUpload} />
                  <span className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    <Upload className="h-4 w-4" /> {isUploading ? 'Laster opp...' : 'Last opp'}
                  </span>
                </label>
              </div>
              {formData.attachments?.length === 0 ? (
                <p className="text-sm text-slate-400">Ingen vedlegg ennå</p>
              ) : (
                <div className="space-y-2">
                  {formData.attachments?.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex-1 truncate">{att.name}</a>
                      <button onClick={() => setFormData(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-0 shadow-sm dark:bg-slate-900 p-5">
              <Label>Interne notater</Label>
              <Textarea value={formData.internal_notes} onChange={e => setFormData(f => ({ ...f, internal_notes: e.target.value }))} placeholder="Notater som ikke vises til leverandørene..." rows={3} className="mt-1.5 rounded-xl" />
            </Card>
          </div>
        )}

        {/* INVITATIONS TAB */}
        {activeTab === 'invitations' && (
          <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Inviterte leverandører</h3>
              <Button onClick={() => setShowVendorPicker(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1">
                <Send className="h-3.5 w-3.5" /> Send invitasjoner
              </Button>
            </div>
            {invitations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                <p className="text-sm">Ingen leverandører invitert ennå</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invitations.map(inv => {
                  const s = invStatusConfig[inv.status] || invStatusConfig.sendt;
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{inv.vendor_name}</p>
                        <p className="text-xs text-slate-500">{inv.vendor_email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={cn("border-0 text-xs", s.color)}>{s.label}</Badge>
                        {inv.sent_date && <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(inv.sent_date), 'd. MMM', { locale: nb })}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* BIDS TAB */}
        {activeTab === 'bids' && (
          <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Mottatte tilbud</h3>
            </div>
            {bids.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                <p className="text-sm">Ingen tilbud mottatt ennå</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {bids.map(bid => (
                  <div key={bid.id} className={cn("p-5", bid.is_selected && "bg-emerald-50 dark:bg-emerald-900/20")}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {bid.is_selected && <Star className="h-4 w-4 text-emerald-600 fill-emerald-600 flex-shrink-0" />}
                          <p className="font-semibold text-slate-900 dark:text-white">{bid.vendor_name}</p>
                        </div>
                        {bid.received_date && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Mottatt {format(parseISO(bid.received_date), 'd. MMMM yyyy HH:mm', { locale: nb })}
                          </p>
                        )}
                        {bid.comment && <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{bid.comment}</p>}
                        {bid.attachments?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {bid.attachments.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg hover:underline">
                                <Paperclip className="h-3 w-3" /> {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                        {/* Internal note */}
                        {editingNote === bid.id ? (
                          <div className="mt-3">
                            <Textarea
                              defaultValue={bid.internal_note}
                              rows={2}
                              className="rounded-xl text-sm"
                              id={`note-${bid.id}`}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs" onClick={() => {
                                const val = document.getElementById(`note-${bid.id}`).value;
                                updateBidMutation.mutate({ id: bid.id, data: { internal_note: val } });
                                setEditingNote(null);
                              }}>Lagre notat</Button>
                              <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={() => setEditingNote(null)}>Avbryt</Button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setEditingNote(bid.id)} className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <MessageSquare className="h-3 w-3" /> {bid.internal_note ? bid.internal_note : 'Legg til intern notat'}
                          </button>
                        )}
                      </div>
                      <Button
                        onClick={() => handleSelectWinner(bid)}
                        variant={bid.is_selected ? 'default' : 'outline'}
                        size="sm"
                        className={cn("rounded-xl gap-1 flex-shrink-0", bid.is_selected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}>
                        <Star className="h-3.5 w-3.5" /> {bid.is_selected ? 'Valgt' : 'Velg'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Vendor picker modal */}
      {showVendorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVendorPicker(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Send til leverandører</h2>
              <p className="text-sm text-slate-500 mt-0.5">Velg leverandørene du vil sende forespørselen til</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {vendors.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Ingen leverandører i registeret. Opprett leverandører først.</p>
              ) : vendors.map(v => {
                const checked = selectedVendors.includes(v.id);
                const alreadyInvited = invitations.some(i => i.vendor_id === v.id);
                return (
                  <button key={v.id} disabled={alreadyInvited} onClick={() => setSelectedVendors(prev => checked ? prev.filter(x => x !== v.id) : [...prev, v.id])}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left mb-1",
                      alreadyInvited ? "opacity-50 cursor-not-allowed" : checked ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
                    <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      checked ? "bg-emerald-600 border-emerald-600" : "border-slate-300 dark:border-slate-600")}>
                      {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{v.company_name}</p>
                      <p className="text-xs text-slate-500 truncate">{v.email}{v.trade ? ` · ${v.trade}` : ''}</p>
                    </div>
                    {alreadyInvited && <span className="text-xs text-slate-400 flex-shrink-0">Allerede invitert</span>}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowVendorPicker(false)} className="rounded-xl">Avbryt</Button>
              <Button onClick={handleSend} disabled={!selectedVendors.length || isSending} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
                <Send className="h-4 w-4" /> {isSending ? 'Sender...' : `Send til ${selectedVendors.length} leverandør${selectedVendors.length !== 1 ? 'er' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}