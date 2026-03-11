import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FileText, Upload, X, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AnbudsprosjektDetaljer from './AnbudsprosjektDetaljer';

const statusConfig = {
  DRAFT:       { label: 'Utkast',   classes: 'bg-slate-100 text-slate-600' },
  SENT:        { label: 'Sendt',    classes: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Pågående', classes: 'bg-amber-100 text-amber-700' },
  CLOSED:      { label: 'Lukket',   classes: 'bg-emerald-100 text-emerald-700' },
};

const TRADE_TYPES = ['Elektro', 'Rør/VVS', 'Betong', 'Tømrer', 'Maler', 'Gulvlegger', 'Tak', 'Stål/Sveis', 'HVAC', 'Graving/Anlegg', 'Leverandør av materiell', 'Annet'];

const emptyForm = {
  title: '', description: '', projectId: '', tradeType: '', responseDeadline: '', reminderDeadline: '', fileAttachments: []
};

export default function AnbudsmodulForesporsler() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list('-created_date'),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations'],
    queryFn: () => base44.entities.AnbudInvitation.list(),
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes'],
    queryFn: () => base44.entities.AnbudQuote.list(),
  });
  const { data: sysProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnbudProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anbudProjects'] });
      setShowDialog(false);
      setForm(emptyForm);
    },
  });

  const uploadFile = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, fileAttachments: [...f.fileAttachments, { name: file.name, url: file_url }] }));
    setUploading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, status: 'DRAFT', createdBy: user?.email || null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Forespørsler</h2>
        <Button onClick={() => setShowDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Opprett forespørsel
        </Button>
      </div>

      <Card className="border-0 shadow-sm dark:bg-slate-900">
        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Ingen forespørsler ennå</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Tittel', 'Fag', 'Svarfrist', 'Inviterte', 'Svar', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const projInv = invitations.filter(i => i.anbudProjectId === project.id);
                  const projQ = quotes.filter(q => q.anbudProjectId === project.id);
                  const sc = statusConfig[project.status] || statusConfig.DRAFT;
                  const isDeadlinePast = project.responseDeadline && isPast(parseISO(project.responseDeadline)) && project.status !== 'CLOSED';
                  const noResponse = projInv.filter(i => i.status === 'NO_RESPONSE').length;
                  return (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">{project.title}</span>
                          {isDeadlinePast && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{project.tradeType || '–'}</td>
                      <td className="px-6 py-4">
                        <span className={cn('text-sm', isDeadlinePast ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400')}>
                          {project.responseDeadline ? format(parseISO(project.responseDeadline), 'd. MMM yyyy', { locale: nb }) : '–'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{projInv.length}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">{projQ.length}</span>
                          {noResponse > 0 && <span className="text-xs text-red-500">{noResponse} ingen svar</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn('border-0', sc.classes)}>{sc.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-emerald-600">Åpne →</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Project detail panel */}
      {selectedProject && (
        <AnbudsprosjektDetaljer
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Opprett forespørsel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Navn på forespørselen"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Hva skal det leveres tilbud på?"
                rows={3}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fagområde</Label>
                <Select value={form.tradeType} onValueChange={v => setForm(f => ({ ...f, tradeType: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Velg fag" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Svarfrist</Label>
                <Input
                  type="date"
                  value={form.responseDeadline}
                  onChange={e => setForm(f => ({ ...f, responseDeadline: e.target.value }))}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Påminnelsesfrist <span className="text-slate-400 font-normal">(valgfritt)</span></Label>
              <Input
                type="date"
                value={form.reminderDeadline}
                onChange={e => setForm(f => ({ ...f, reminderDeadline: e.target.value }))}
                max={form.responseDeadline || undefined}
                className="mt-1.5 rounded-xl"
              />
              <p className="text-xs text-slate-400 mt-1">Dato for utsendelse av påminnelse dersom tilbud ikke er mottatt innen denne datoen.</p>
            </div>
            <div>
              <Label>Prosjekt (valgfritt)</Label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ingen</SelectItem>
                  {sysProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vedlegg (tegninger, beskrivelser)</Label>
              <div className="mt-1.5 space-y-2">
                {form.fileAttachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                    <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{f.name}</span>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, fileAttachments: prev.fileAttachments.filter((_, j) => j !== i) }))}>
                      <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
                <label
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-sm text-slate-500',
                    dragOver ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400',
                    uploading && 'opacity-50 pointer-events-none'
                  )}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-5 w-5" />
                  <span>{uploading ? 'Laster opp...' : dragOver ? 'Slipp filen her' : 'Dra og slipp fil her, eller klikk for å laste opp'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Avbryt</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {createMutation.isPending ? 'Lagrer...' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}