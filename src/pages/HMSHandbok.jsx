import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FileUploadSection from '@/components/shared/FileUploadSection';
import {
  BookOpen, Save, History, Plus, X, FileText, Download,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Edit3,
  Target, Users, AlertTriangle, ShieldAlert, Activity, GraduationCap,
  Bell, Shield, Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateHMSHandbookPDF } from '@/components/hms/HMSHandbookPDF';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { key: 'maal_for_hms', label: 'Mål for HMS', icon: Target, color: 'emerald', description: 'Bedriftens overordnede HMS-mål og strategi' },
  { key: 'organisasjon_ansvar', label: 'Organisasjon og ansvar', icon: Users, color: 'blue', description: 'Roller, ansvar og organisering av HMS-arbeid' },
  { key: 'rutine_avvik', label: 'Rutine for avvik', icon: AlertTriangle, color: 'orange', description: 'Prosedyre for registrering og håndtering av avvik' },
  { key: 'rutine_ruh', label: 'Rutine for RUH', icon: AlertCircle, color: 'yellow', description: 'Rapportering av uønskede hendelser' },
  { key: 'rutine_sja', label: 'Rutine for SJA', icon: ShieldAlert, color: 'purple', description: 'Sikker jobb-analyse prosedyre' },
  { key: 'rutine_risikovurdering', label: 'Rutine for risikovurdering', icon: Activity, color: 'red', description: 'Metode for kartlegging og vurdering av risiko' },
  { key: 'rutine_vernerunde', label: 'Rutine for vernerunde', icon: CheckCircle2, color: 'teal', description: 'Gjennomføring av vernerunder' },
  { key: 'rutine_opplaring', label: 'Rutine for opplæring', icon: GraduationCap, color: 'indigo', description: 'Opplæring og kompetanseutvikling' },
  { key: 'varslingsrutiner', label: 'Varslingsrutiner', icon: Bell, color: 'pink', description: 'Prosedyre for varsling ved hendelser' },
  { key: 'beredskapsrutiner', label: 'Beredskapsrutiner', icon: Shield, color: 'slate', description: 'Beredskapsplan og nødprosedyrer' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', badge: 'bg-red-100 text-red-700', border: 'border-red-200' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', badge: 'bg-teal-100 text-teal-700', border: 'border-teal-200' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
  pink: { bg: 'bg-pink-50', icon: 'text-pink-600', badge: 'bg-pink-100 text-pink-700', border: 'border-pink-200' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
};

function SectionCard({ section, value, editMode, onChange, index }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = section.icon;
  const colors = colorMap[section.color];
  const hasContent = value && value.trim().length > 0;
  const preview = hasContent ? value.trim().slice(0, 120) + (value.trim().length > 120 ? '...' : '') : null;

  // Auto-expand in edit mode
  React.useEffect(() => {
    if (editMode) setExpanded(true);
  }, [editMode]);

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm overflow-hidden transition-all", expanded && "shadow-md")}>
      {/* Header */}
      <button
        onClick={() => !editMode && setExpanded(!expanded)}
        className={cn("w-full text-left", editMode && "cursor-default")}
      >
        <div className="flex items-center gap-4 p-4 lg:p-5">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">{section.label}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", hasContent ? colors.badge : "bg-slate-100 text-slate-400")}>
                {hasContent ? 'Utfylt' : 'Ikke utfylt'}
              </span>
            </div>
            {!expanded && (
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {preview || section.description}
              </p>
            )}
          </div>
          {!editMode && (
            <div className="flex-shrink-0">
              {expanded
                ? <ChevronUp className="h-5 w-5 text-slate-400" />
                : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </div>
          )}
        </div>
      </button>

      {/* Content */}
      {(expanded || editMode) && (
        <div className={cn("px-4 lg:px-5 pb-5 border-t", colors.border)}>
          <p className="text-xs text-slate-500 mt-3 mb-3">{section.description}</p>
          {editMode ? (
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              rows={6}
              className="text-sm resize-none"
              placeholder={`Beskriv ${section.label.toLowerCase()}...`}
            />
          ) : (
            <div className="prose max-w-none">
              {hasContent ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{value}</p>
              ) : (
                <p className="text-slate-400 italic text-sm">Ikke utfylt ennå. Trykk «Rediger» for å legge til innhold.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HMSHandbok() {
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('innhold');
  const [customChapterDialog, setCustomChapterDialog] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', content: '' });
  const [versionDialog, setVersionDialog] = useState(false);
  const [expandedCustom, setExpandedCustom] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const company = companies[0];

  const { data: handbooks = [] } = useQuery({ queryKey: ['hmshandbook'], queryFn: () => base44.entities.HMSHandbook.list('-version') });
  const { data: versions = [] } = useQuery({ queryKey: ['handbook-versions'], queryFn: () => base44.entities.HMSHandbookVersion.list('-version_number') });
  const handbook = handbooks[0];

  const [formData, setFormData] = useState({
    title: 'HMS-håndbok', version: 1,
    maal_for_hms: '', organisasjon_ansvar: '', rutine_avvik: '', rutine_ruh: '',
    rutine_sja: '', rutine_risikovurdering: '', rutine_vernerunde: '', rutine_opplaring: '',
    varslingsrutiner: '', beredskapsrutiner: '', egne_kapitler: [], vedlegg: [],
    sist_endret_av: user?.email || '', sist_endret_dato: new Date().toISOString()
  });

  React.useEffect(() => { if (handbook) setFormData(handbook); }, [handbook]);

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.HMSHandbook.create(data), onSuccess: () => { queryClient.invalidateQueries(['hmshandbook']); setEditMode(false); toast.success('HMS-håndbok opprettet'); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.HMSHandbook.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['hmshandbook']); setEditMode(false); toast.success('HMS-håndbok oppdatert'); } });
  const createVersionMutation = useMutation({ mutationFn: (data) => base44.entities.HMSHandbookVersion.create(data), onSuccess: () => { queryClient.invalidateQueries(['handbook-versions']); toast.success('Versjon lagret'); } });

  const handleSave = () => {
    const dataToSave = { ...formData, version: handbook ? handbook.version + 1 : 1, sist_endret_av: user?.email, sist_endret_dato: new Date().toISOString() };
    if (handbook) {
      createVersionMutation.mutate({ handbook_id: handbook.id, version_number: handbook.version, content_snapshot: handbook, endret_av: user?.email, endret_av_navn: user?.full_name });
      updateMutation.mutate({ id: handbook.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const addCustomChapter = () => {
    if (!newChapter.title || !newChapter.content) { toast.error('Fyll ut tittel og innhold'); return; }
    setFormData({ ...formData, egne_kapitler: [...(formData.egne_kapitler || []), newChapter] });
    setNewChapter({ title: '', content: '' });
    setCustomChapterDialog(false);
    toast.success('Kapittel lagt til');
  };

  const removeCustomChapter = (index) => {
    const updated = [...formData.egne_kapitler];
    updated.splice(index, 1);
    setFormData({ ...formData, egne_kapitler: updated });
  };

  const filledCount = SECTIONS.filter(s => formData[s.key]?.trim()).length;

  const tabs = [
    { key: 'innhold', label: 'Kapitler', count: `${filledCount}/${SECTIONS.length}` },
    { key: 'egne', label: 'Egne kapitler', count: formData.egne_kapitler?.length || 0 },
    { key: 'vedlegg', label: 'Vedlegg', count: formData.vedlegg?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <PageHeader
        title="HMS-håndbok"
        subtitle={handbook
          ? `Versjon ${handbook.version} • Oppdatert ${format(new Date(handbook.sist_endret_dato || handbook.created_date), 'dd.MM.yyyy', { locale: nb })}`
          : 'Opprett HMS-håndbok for bedriften'}
        actions={
          <div className="flex flex-wrap gap-2">
            {handbook && (
              <Button variant="outline" size="sm" onClick={() => generateHMSHandbookPDF(formData, company)} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Last ned PDF</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setVersionDialog(true)}>
              <History className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Historikk</span>
            </Button>
            {!editMode ? (
              <Button size="sm" onClick={() => setEditMode(true)} className="bg-green-700 hover:bg-green-800 text-white gap-2">
                <Edit3 className="h-4 w-4" /> Rediger
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditMode(false); if (handbook) setFormData(handbook); }}>Avbryt</Button>
                <Button size="sm" onClick={handleSave} className="bg-green-700 hover:bg-green-800 text-white gap-2">
                  <Save className="h-4 w-4" /><span className="hidden sm:inline">Lagre</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-4 lg:py-6">

        {/* Progress bar */}
        <Card className="p-4 mb-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Fullføring av håndbok</p>
            <span className="text-sm font-semibold text-emerald-700">{filledCount} av {SECTIONS.length} kapitler utfylt</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(filledCount / SECTIONS.length) * 100}%` }}
            />
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-6 w-full">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Innhold tab */}
        {activeTab === 'innhold' && (
          <div className="space-y-3">
            {SECTIONS.map((section, i) => (
              <SectionCard
                key={section.key}
                section={section}
                index={i}
                value={formData[section.key]}
                editMode={editMode}
                onChange={(val) => setFormData({ ...formData, [section.key]: val })}
              />
            ))}
          </div>
        )}

        {/* Egne kapitler tab */}
        {activeTab === 'egne' && (
          <div className="space-y-3">
            {editMode && (
              <Button onClick={() => setCustomChapterDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Legg til kapittel
              </Button>
            )}
            {formData.egne_kapitler?.length > 0 ? (
              formData.egne_kapitler.map((chapter, idx) => (
                <div key={idx} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => !editMode && setExpandedCustom(expandedCustom === idx ? null : idx)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-4 lg:p-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{chapter.title}</p>
                        {expandedCustom !== idx && (
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {chapter.content?.slice(0, 100)}{chapter.content?.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      {editMode ? (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeCustomChapter(idx); }}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : (
                        expandedCustom === idx
                          ? <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          : <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  {(expandedCustom === idx || editMode) && (
                    <div className="px-4 lg:px-5 pb-5 border-t border-slate-100">
                      <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed mt-4">{chapter.content}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Card className="p-10 text-center border-0 shadow-sm">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-600">Ingen egne kapitler</p>
                <p className="text-sm text-slate-400 mt-1">Legg til bedriftsspesifikke kapitler her</p>
                {editMode && (
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setCustomChapterDialog(true)}>
                    Legg til kapittel
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Vedlegg tab */}
        {activeTab === 'vedlegg' && (
          <Card className="p-6 border-0 shadow-sm">
            {editMode ? (
              <FileUploadSection
                files={formData.vedlegg || []}
                onFilesChange={(files) => setFormData({ ...formData, vedlegg: files })}
              />
            ) : (
              <div>
                {formData.vedlegg?.length > 0 ? (
                  <div className="space-y-2">
                    {formData.vedlegg.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Paperclip className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-emerald-600 hover:underline text-sm font-medium">Vedlegg {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">Ingen vedlegg lastet opp</p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Custom Chapter Dialog */}
      <Dialog open={customChapterDialog} onOpenChange={setCustomChapterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nytt kapittel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tittel</Label>
              <Input value={newChapter.title} onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })} placeholder="F.eks. Spesielle retningslinjer" className="mt-1.5" />
            </div>
            <div>
              <Label>Innhold</Label>
              <Textarea value={newChapter.content} onChange={(e) => setNewChapter({ ...newChapter, content: e.target.value })} rows={8} placeholder="Skriv innholdet i kapittelet..." className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomChapterDialog(false)}>Avbryt</Button>
            <Button onClick={addCustomChapter} className="bg-emerald-600 hover:bg-emerald-700">Legg til</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialog} onOpenChange={setVersionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Versjonshistorikk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {versions.length > 0 ? (
              versions.map((version) => (
                <div key={version.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600">v{version.version_number}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Versjon {version.version_number}</p>
                    <p className="text-sm text-slate-500">
                      {version.endret_av_navn} • {format(new Date(version.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                    </p>
                    {version.endringer && <p className="text-sm text-slate-600 mt-1">{version.endringer}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">Ingen versjonshistorikk ennå</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}