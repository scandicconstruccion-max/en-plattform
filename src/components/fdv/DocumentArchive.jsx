import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import { FileText, Plus, Upload, Download, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
{ value: 'produktdatablad', label: 'Produktdatablader' },
{ value: 'monteringsanvisning', label: 'Monteringsanvisninger' },
{ value: 'samsvarserklæring', label: 'Samsvarserklæringer' },
{ value: 'garantibevis', label: 'Garantibevis' },
{ value: 'brukermanual', label: 'Brukermanualer' },
{ value: 'tegning', label: 'Tegninger' },
{ value: 'sluttrapport', label: 'Sluttrapporter' },
{ value: 'ferdigbilder', label: 'Ferdigbilder' }];


export default function DocumentArchive({ fdvPackageId, projectId }) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    file: null
  });
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['fdvDocuments', fdvPackageId],
    queryFn: () => base44.entities.FDVDocument.filter({ fdv_package_id: fdvPackageId }),
    enabled: !!fdvPackageId
  });

  const { data: projectFiles = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }),
    enabled: !!projectId && showImportDialog
  });

  const { data: images = [] } = useQuery({
    queryKey: ['images', projectId],
    queryFn: () => base44.entities.ImageDoc.filter({ project_id: projectId }),
    enabled: !!projectId && showImportDialog
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.file });
      return base44.entities.FDVDocument.create({
        fdv_package_id: fdvPackageId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        file_url,
        source_type: 'manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvDocuments', fdvPackageId] });
      setShowUploadDialog(false);
      setFormData({ name: '', description: '', category: '', file: null });
      toast.success('Dokument lastet opp');
    }
  });

  const importMutation = useMutation({
    mutationFn: async ({ sourceType, sourceId, sourceUrl, sourceName, category }) => {
      return base44.entities.FDVDocument.create({
        fdv_package_id: fdvPackageId,
        name: sourceName,
        category,
        file_url: sourceUrl,
        source_type: sourceType,
        source_id: sourceId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvDocuments', fdvPackageId] });
      toast.success('Dokument importert');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.FDVDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvDocuments', fdvPackageId] });
      toast.success('Dokument slettet');
    }
  });

  const handleUpload = () => {
    if (!formData.name || !formData.category || !formData.file) {
      toast.error('Fyll ut alle påkrevde felt');
      return;
    }
    uploadMutation.mutate();
  };

  const groupedDocs = categories.reduce((acc, cat) => {
    acc[cat.value] = documents.filter((d) => d.category === cat.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowImportDialog(true)}
          className="rounded-xl gap-2">

          <FolderOpen className="h-4 w-4" />
          Importer fra prosjekt
        </Button>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">

          <Plus className="h-4 w-4" />
          Last opp dokument
        </Button>
      </div>

      {/* Categories */}
      {categories.map((category) =>
      <Card key={category.value} className="border-0 shadow-sm dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{category.label}</h3>
              <span className="text-sm text-slate-500">({groupedDocs[category.value]?.length || 0})</span>
            </div>
          </div>
          <div className="p-4">
            {groupedDocs[category.value]?.length === 0 ?
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Ingen dokumenter
              </p> :

          <div className="space-y-2">
                {groupedDocs[category.value]?.map((doc) =>
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">

                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{doc.name}</p>
                      {doc.description &&
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{doc.description}</p>
                }
                      {doc.source_type !== 'manual' &&
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 inline-block mt-1">
                          Fra {doc.source_type === 'project_file' ? 'Prosjektfiler' : doc.source_type === 'image_doc' ? 'Bildedok' : 'Ordre'}
                        </span>
                }
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="rounded-lg">

                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">

                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
            )}
              </div>
          }
          </div>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Last opp dokument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Navn *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Dokumentnavn" />

            </div>
            <div>
              <Label>Kategori *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}>

                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) =>
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Valgfri beskrivelse" />

            </div>
            <div>
              <Label>Fil *</Label>
              <Input
                type="file"
                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                className="mt-1.5 rounded-xl" />

            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              className="rounded-xl">

              Avbryt
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">

              {uploadMutation.isPending ? 'Laster opp...' : 'Last opp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Importer fra prosjekt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) =>
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {projectFiles.length === 0 && images.length === 0 &&
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  Ingen filer eller bilder funnet i prosjektet
                </p>
              }
              {projectFiles.length > 0 &&
              <>
                  <div className="font-medium text-sm text-slate-900 dark:text-white mb-2">Prosjektfiler</div>
                  {projectFiles.map((file) =>
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">

                  <div className="flex-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{file.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => selectedCategory && importMutation.mutate({
                      sourceType: 'project_file',
                      sourceId: file.id,
                      sourceUrl: file.file_url,
                      sourceName: file.name,
                      category: selectedCategory
                    })}
                    disabled={!selectedCategory}
                    className="rounded-lg">

                    Importer
                  </Button>
                </div>
                )}
                </>
              }
              {images.length > 0 &&
              <>
                  <div className="font-medium text-sm text-slate-900 dark:text-white mb-2 mt-4">Bildedokumentasjon</div>
                  {images.map((img) =>
                <div
                  key={img.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">

                  <div className="flex-1">
                    <p className="font-medium text-sm">{img.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{img.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => selectedCategory && importMutation.mutate({
                      sourceType: 'image_doc',
                      sourceId: img.id,
                      sourceUrl: img.image_url,
                      sourceName: img.title,
                      category: selectedCategory
                    })}
                    disabled={!selectedCategory} className="bg-blue-600 text-primary-foreground px-3 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-8">


                    Importer
                  </Button>
                </div>
                )}
                </>
              }
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}