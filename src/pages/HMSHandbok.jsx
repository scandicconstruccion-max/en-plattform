import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { BookOpen, Save, History, Plus, X, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateHMSHandbookPDF } from '@/components/hms/HMSHandbookPDF';

export default function HMSHandbok() {
  const [editMode, setEditMode] = useState(false);
  const [customChapterDialog, setCustomChapterDialog] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', content: '' });
  const [versionDialog, setVersionDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  const company = companies[0];

  const { data: handbooks = [] } = useQuery({
    queryKey: ['hmshandbook'],
    queryFn: () => base44.entities.HMSHandbook.list('-version')
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['handbook-versions'],
    queryFn: () => base44.entities.HMSHandbookVersion.list('-version_number')
  });

  const handbook = handbooks[0];

  const [formData, setFormData] = useState({
    title: 'HMS-håndbok',
    version: 1,
    maal_for_hms: '',
    organisasjon_ansvar: '',
    rutine_avvik: '',
    rutine_ruh: '',
    rutine_sja: '',
    rutine_risikovurdering: '',
    rutine_vernerunde: '',
    rutine_opplaring: '',
    varslingsrutiner: '',
    beredskapsrutiner: '',
    egne_kapitler: [],
    vedlegg: [],
    sist_endret_av: user?.email || '',
    sist_endret_dato: new Date().toISOString()
  });

  React.useEffect(() => {
    if (handbook) {
      setFormData(handbook);
    }
  }, [handbook]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HMSHandbook.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hmshandbook']);
      setEditMode(false);
      toast.success('HMS-håndbok opprettet');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HMSHandbook.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hmshandbook']);
      setEditMode(false);
      toast.success('HMS-håndbok oppdatert');
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: (data) => base44.entities.HMSHandbookVersion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['handbook-versions']);
      toast.success('Versjon lagret');
    }
  });

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      version: handbook ? handbook.version + 1 : 1,
      sist_endret_av: user?.email,
      sist_endret_dato: new Date().toISOString()
    };

    if (handbook) {
      // Create version snapshot
      createVersionMutation.mutate({
        handbook_id: handbook.id,
        version_number: handbook.version,
        content_snapshot: handbook,
        endret_av: user?.email,
        endret_av_navn: user?.full_name
      });

      updateMutation.mutate({ id: handbook.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const addCustomChapter = () => {
    if (!newChapter.title || !newChapter.content) {
      toast.error('Fyll ut tittel og innhold');
      return;
    }

    setFormData({
      ...formData,
      egne_kapitler: [...(formData.egne_kapitler || []), newChapter]
    });
    setNewChapter({ title: '', content: '' });
    setCustomChapterDialog(false);
    toast.success('Kapittel lagt til');
  };

  const removeCustomChapter = (index) => {
    const updated = [...formData.egne_kapitler];
    updated.splice(index, 1);
    setFormData({ ...formData, egne_kapitler: updated });
  };

  const sections = [
  { key: 'maal_for_hms', label: 'Mål for HMS' },
  { key: 'organisasjon_ansvar', label: 'Organisasjon og ansvar' },
  { key: 'rutine_avvik', label: 'Rutine for avvik' },
  { key: 'rutine_ruh', label: 'Rutine for RUH' },
  { key: 'rutine_sja', label: 'Rutine for SJA' },
  { key: 'rutine_risikovurdering', label: 'Rutine for risikovurdering' },
  { key: 'rutine_vernerunde', label: 'Rutine for vernerunde' },
  { key: 'rutine_opplaring', label: 'Rutine for opplæring' },
  { key: 'varslingsrutiner', label: 'Varslingsrutiner' },
  { key: 'beredskapsrutiner', label: 'Beredskapsrutiner' }];


  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="HMS-håndbok"
        subtitle={handbook ? `Versjon ${handbook.version} • Sist oppdatert ${format(new Date(handbook.sist_endret_dato || handbook.created_date), 'dd.MM.yyyy', { locale: nb })}` : 'Opprett HMS-håndbok for bedriften'}
        actions={
        <div className="flex flex-wrap gap-2">
            {handbook &&
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateHMSHandbookPDF(formData, company)}
            className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Last ned PDF</span>
              </Button>
          }
            <Button variant="outline" size="sm" onClick={() => setVersionDialog(true)}>
              <History className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Versjonshistorikk</span>
            </Button>
            {!editMode ?
          <Button size="sm" onClick={() => setEditMode(true)} className="bg-green-700 hover:bg-green-800 text-white">
                Rediger
              </Button> :
          <>
                <Button variant="outline" size="sm" onClick={() => {setEditMode(false);if (handbook) setFormData(handbook);}}>
                  Avbryt
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-green-700 hover:bg-green-800 text-white">
                  <Save className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Lagre</span>
                </Button>
              </>
          }
          </div>
        } />


      <div className="px-4 lg:px-8 py-4 lg:py-8">
        <Tabs defaultValue="innhold" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="innhold">Innhold</TabsTrigger>
            <TabsTrigger value="egne">Egne kapitler</TabsTrigger>
            <TabsTrigger value="vedlegg">Vedlegg</TabsTrigger>
          </TabsList>

          <TabsContent value="innhold" className="space-y-3 mt-4">
            {sections.map((section) =>
            <Card key={section.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {editMode ?
                <Textarea
                  value={formData[section.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [section.key]: e.target.value })}
                  rows={5}
                  className="text-sm"
                  placeholder={`Beskriv ${section.label.toLowerCase()}...`} /> :
                <div className="prose max-w-none">
                      {formData[section.key] ?
                  <p className="whitespace-pre-wrap text-sm">{formData[section.key]}</p> :
                  <p className="text-slate-400 italic text-sm">Ikke utfylt</p>
                  }
                    </div>
                }
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="egne" className="space-y-3 mt-4">
            {editMode &&
            <Button onClick={() => setCustomChapterDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til kapittel
              </Button>
            }

            {formData.egne_kapitler?.length > 0 ?
            formData.egne_kapitler.map((chapter, idx) =>
            <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{chapter.title}</CardTitle>
                      {editMode &&
                  <Button variant="ghost" size="sm" onClick={() => removeCustomChapter(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                  }
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{chapter.content}</p>
                  </CardContent>
                </Card>
            ) :

            <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Ingen egne kapitler lagt til</p>
                  {editMode &&
                <Button className="mt-4" onClick={() => setCustomChapterDialog(true)}>
                      Legg til kapittel
                    </Button>
                }
                </CardContent>
              </Card>
            }
          </TabsContent>

          <TabsContent value="vedlegg" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {editMode ?
                <FileUploadSection
                  files={formData.vedlegg || []}
                  onFilesChange={(files) => setFormData({ ...formData, vedlegg: files })} /> :


                <div>
                    {formData.vedlegg?.length > 0 ?
                  <div className="space-y-2">
                        {formData.vedlegg.map((url, idx) =>
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors">

                            <FileText className="h-5 w-5 text-slate-400" />
                            <span className="text-emerald-600 hover:underline">Vedlegg {idx + 1}</span>
                          </a>
                    )}
                      </div> :

                  <p className="text-slate-400 italic text-center py-8">Ingen vedlegg</p>
                  }
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              <Input
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                placeholder="F.eks. Spesielle retningslinjer" />

            </div>
            <div>
              <Label>Innhold</Label>
              <Textarea
                value={newChapter.content}
                onChange={(e) => setNewChapter({ ...newChapter, content: e.target.value })}
                rows={8}
                placeholder="Skriv innholdet i kapittelet..." />

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomChapterDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={addCustomChapter}>Legg til</Button>
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
            {versions.length > 0 ?
            versions.map((version) =>
            <Card key={version.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Versjon {version.version_number}</p>
                        <p className="text-sm text-slate-500">
                          {version.endret_av_navn} • {format(new Date(version.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                        </p>
                        {version.endringer &&
                    <p className="text-sm text-slate-600 mt-1">{version.endringer}</p>
                    }
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ) :

            <p className="text-center text-slate-500 py-8">Ingen versjonshistorikk</p>
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}