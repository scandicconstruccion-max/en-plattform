import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { Camera, Search, Upload, X, MapPin, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Bildedok() {
  const [showDialog, setShowDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    category: 'annet',
    location: '',
    image_url: ''
  });

  const queryClient = useQueryClient();

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.ImageDoc.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ImageDoc.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      category: 'annet',
      location: '',
      image_url: ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, image_url: file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const filteredImages = images.filter(img => {
    const matchesSearch = img.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || img.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || img.project_id === projectFilter;
    return matchesSearch && matchesCategory && matchesProject;
  });

  const categoryLabels = {
    for_arbeid: 'Før arbeid',
    under_arbeid: 'Under arbeid',
    etter_arbeid: 'Etter arbeid',
    skade: 'Skade',
    annet: 'Annet'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Bildedokumentasjon"
        subtitle={`${images.length} bilder totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Last opp bilde"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter bilder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Alle prosjekter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle kategorier</SelectItem>
              <SelectItem value="for_arbeid">Før arbeid</SelectItem>
              <SelectItem value="under_arbeid">Under arbeid</SelectItem>
              <SelectItem value="etter_arbeid">Etter arbeid</SelectItem>
              <SelectItem value="skade">Skade</SelectItem>
              <SelectItem value="annet">Annet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Images Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Ingen bilder"
            description="Last opp bilder for å dokumentere arbeid"
            actionLabel="Last opp bilde"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <Card
                key={image.id}
                className="group relative overflow-hidden border-0 shadow-sm cursor-pointer rounded-2xl"
                onClick={() => {
                  setSelectedImage(image);
                  setShowImageDialog(true);
                }}
              >
                <div className="aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-medium truncate">{image.title}</p>
                    <p className="text-white/70 text-sm">{getProjectName(image.project_id)}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-xs bg-white/90 text-slate-700 px-2 py-1 rounded-lg">
                    {categoryLabels[image.category]}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Last opp bilde</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>Bilde *</Label>
              {formData.image_url ? (
                <div className="relative mt-1.5">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
                    onClick={() => setFormData({...formData, image_url: ''})}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="mt-1.5 flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">Klikk for å laste opp</p>
                    </>
                  )}
                </label>
              )}
            </div>

            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Beskrivende tittel"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_arbeid">Før arbeid</SelectItem>
                    <SelectItem value="under_arbeid">Under arbeid</SelectItem>
                    <SelectItem value="etter_arbeid">Etter arbeid</SelectItem>
                    <SelectItem value="skade">Skade</SelectItem>
                    <SelectItem value="annet">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plassering</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="f.eks. 2. etasje"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Tilleggsinformasjon..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !formData.image_url}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Last opp'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Detail Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {selectedImage && (
            <div>
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title}
                className="w-full max-h-[60vh] object-contain bg-slate-900"
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900">{selectedImage.title}</h2>
                <p className="text-slate-500 mt-1">{getProjectName(selectedImage.project_id)}</p>
                {selectedImage.description && (
                  <p className="text-slate-600 mt-3">{selectedImage.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedImage.created_date && format(new Date(selectedImage.created_date), 'd. MMM yyyy', { locale: nb })}
                  </span>
                  {selectedImage.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedImage.location}
                    </span>
                  )}
                  <span className="bg-slate-100 px-2 py-1 rounded-lg">
                    {categoryLabels[selectedImage.category]}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}