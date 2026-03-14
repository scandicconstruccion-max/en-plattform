import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import FileUploadSection from '@/components/shared/FileUploadSection';
import { Camera, Search, FolderTree, Clock, MapPin, User, Tag, X, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Bildedok() {
  const [showDialog, setShowDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [view, setView] = useState('folders'); // 'folders' or 'timeline'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    category: 'for_arbeid',
    room_type: '',
    custom_location: '',
    tags: []
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
      toast.success('Bilde lastet opp');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImageDoc.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setShowImageDialog(false);
      setSelectedImage(null);
      toast.success('Bilde slettet');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      category: 'for_arbeid',
      room_type: '',
      custom_location: '',
      tags: []
    });
    setAttachments([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (attachments.length === 0) {
      toast.error('Last opp minst ett bilde');
      return;
    }

    // Upload all attachments as separate image docs
    for (const attachment of attachments) {
      const imageData = {
        ...formData,
        title: formData.title || attachment.name,
        image_url: attachment.file_url,
        uploaded_by_name: attachment.uploaded_by_name,
        gps_location: attachment.gps_location,
        edited_from: attachment.edited_from,
        timestamp: attachment.uploaded_at,
        module_type: attachment.module_type || 'manual'
      };

      await createMutation.mutateAsync(imageData);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const categoryLabels = {
    for_arbeid: 'Før arbeid',
    under_arbeid: 'Under arbeid',
    ferdigstilt: 'Ferdigstilt arbeid',
    avvik: 'Avvik',
    endringsarbeid: 'Endringsarbeid',
    dokumentasjon: 'Dokumentasjon (FDV)'
  };

  const roomLabels = {
    stue: 'Stue',
    kjokken: 'Kjøkken',
    bad: 'Bad',
    soverom: 'Soverom',
    gang: 'Gang',
    entre: 'Entré',
    bod: 'Bod',
    vaskerom: 'Vaskerom',
    kontor: 'Kontor',
    garasje: 'Garasje',
    utvendig: 'Utvendig',
    tak: 'Tak',
    fasade: 'Fasade',
    annet: 'Annet'
  };

  const moduleLabels = {
    quote: 'Tilbud',
    invoice: 'Faktura',
    deviation: 'Avvik',
    change: 'Endringsmelding',
    manual: 'Manuell opplasting',
    fdv: 'FDV'
  };

  // Filter images
  const filteredImages = images.filter(img => {
    const matchesSearch = img.title?.toLowerCase().includes(search.toLowerCase()) ||
                         img.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || img.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || img.project_id === projectFilter;
    const matchesRoom = roomFilter === 'all' || img.room_type === roomFilter;
    const matchesUser = userFilter === 'all' || img.created_by === userFilter;
    const matchesModule = moduleFilter === 'all' || img.module_type === moduleFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const imageDate = new Date(img.created_date);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = imageDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = imageDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = imageDate >= monthAgo;
      }
    }

    return matchesSearch && matchesCategory && matchesProject && matchesRoom && 
           matchesUser && matchesModule && matchesDate;
  });

  // Group by category for folder view
  const imagesByCategory = Object.keys(categoryLabels).reduce((acc, cat) => {
    acc[cat] = filteredImages.filter(img => img.category === cat);
    return acc;
  }, {});

  // Get unique users for filter
  const uniqueUsers = [...new Set(images.map(img => img.created_by).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Bildedokumentasjon"
        subtitle={`${images.length} bilder totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Last opp bilder"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* View Toggle */}
        <div className="mb-6">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="folders" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Mappestruktur
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Tidslinje
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="rounded-xl">
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
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Alle faser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle faser</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Alle datoer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle datoer</SelectItem>
              <SelectItem value="today">I dag</SelectItem>
              <SelectItem value="week">Siste 7 dager</SelectItem>
              <SelectItem value="month">Siste 30 dager</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roomFilter} onValueChange={setRoomFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Alle rom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle rom</SelectItem>
              {Object.entries(roomLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Alle ansatte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle ansatte</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>{user}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Alle moduler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle moduler</SelectItem>
              {Object.entries(moduleLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(categoryFilter !== 'all' || projectFilter !== 'all' || dateFilter !== 'all' || 
            roomFilter !== 'all' || userFilter !== 'all' || moduleFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter('all');
                setProjectFilter('all');
                setDateFilter('all');
                setRoomFilter('all');
                setUserFilter('all');
                setModuleFilter('all');
              }}
              className="rounded-xl">
              <X className="h-4 w-4 mr-2" />
              Nullstill filtre
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-square bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Ingen bilder"
            description="Last opp bilder for å dokumentere arbeid"
            actionLabel="Last opp bilder"
            onAction={() => setShowDialog(true)}
          />
        ) : view === 'folders' ? (
          // Folder View
          <div className="space-y-8">
            {Object.entries(categoryLabels).map(([category, label]) => {
              const categoryImages = imagesByCategory[category] || [];
              if (categoryImages.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <FolderTree className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {label}
                    </h3>
                    <span className="text-sm text-slate-500">
                      ({categoryImages.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {categoryImages.map((image) => (
                      <ImageCard
                        key={image.id}
                        image={image}
                        projectName={getProjectName(image.project_id)}
                        onClick={() => {
                          setSelectedImage(image);
                          setShowImageDialog(true);
                        }}
                        moduleLabel={moduleLabels[image.module_type] || 'Manuell'}
                        roomLabel={roomLabels[image.room_type] || image.custom_location}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Timeline View
          <div className="space-y-6">
            {filteredImages.map((image) => (
              <Card key={image.id} className="p-4 border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  <div
                    className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedImage(image);
                      setShowImageDialog(true);
                    }}>
                    <img
                      src={image.image_url}
                      alt={image.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 mb-1">{image.title}</h4>
                    {image.description && (
                      <p className="text-sm text-slate-600 mb-3">{image.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(image.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {image.uploaded_by_name || image.created_by}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getProjectName(image.project_id)}
                      </div>
                      {image.room_type && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {roomLabels[image.room_type] || image.custom_location}
                        </div>
                      )}
                      {image.module_type && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {moduleLabels[image.module_type]}
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="inline-block text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                        {categoryLabels[image.category]}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Last opp bilder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prosjekt *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger className="mt-1.5 rounded-lg">
                    <SelectValue placeholder="Velg prosjekt" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fase *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="mt-1.5 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rom / område</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(value) => setFormData({ ...formData, room_type: value })}>
                  <SelectTrigger className="mt-1.5 rounded-lg">
                    <SelectValue placeholder="Velg rom" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roomLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Egendefinert område</Label>
                <Input
                  placeholder="F.eks. Etasje 2, Hjørne A"
                  value={formData.custom_location}
                  onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
                  className="mt-1.5 rounded-lg"
                />
              </div>
            </div>

            <div>
              <Label>Tittel (valgfritt)</Label>
              <Input
                placeholder="Beskrivende tittel for bildene"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1.5 rounded-lg"
              />
            </div>

            <FileUploadSection
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projectId={formData.project_id}
              moduleType="manual"
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="rounded-xl">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!formData.project_id || attachments.length === 0 || createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {createMutation.isPending ? 'Laster opp...' : 'Last opp'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Detail Dialog */}
      {selectedImage && (
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <span>{selectedImage.title}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Er du sikker på at du vil slette dette bildet? Dette kan ikke angres.')) {
                      deleteMutation.mutate(selectedImage.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMutation.isPending ? 'Sletter...' : 'Slett bilde'}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.title}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-500">Prosjekt</Label>
                  <p className="font-medium mt-1">{getProjectName(selectedImage.project_id)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Fase</Label>
                  <p className="font-medium mt-1">{categoryLabels[selectedImage.category]}</p>
                </div>
                {selectedImage.room_type && (
                  <div>
                    <Label className="text-slate-500">Rom</Label>
                    <p className="font-medium mt-1">
                      {roomLabels[selectedImage.room_type] || selectedImage.custom_location}
                    </p>
                  </div>
                )}
                {selectedImage.module_type && (
                  <div>
                    <Label className="text-slate-500">Modul</Label>
                    <p className="font-medium mt-1">{moduleLabels[selectedImage.module_type]}</p>
                  </div>
                )}
                <div>
                  <Label className="text-slate-500">Dato</Label>
                  <p className="font-medium mt-1">
                    {format(new Date(selectedImage.created_date), 'dd. MMMM yyyy, HH:mm', { locale: nb })}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Lastet opp av</Label>
                  <p className="font-medium mt-1">{selectedImage.uploaded_by_name || selectedImage.created_by}</p>
                </div>
                {selectedImage.gps_location && (
                  <div className="col-span-2">
                    <Label className="text-slate-500">GPS-posisjon</Label>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      {selectedImage.gps_location.latitude.toFixed(6)}, {selectedImage.gps_location.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {selectedImage.description && (
                <div>
                  <Label className="text-slate-500">Beskrivelse</Label>
                  <p className="mt-1">{selectedImage.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Image Card Component
function ImageCard({ image, projectName, onClick, moduleLabel, roomLabel }) {
  return (
    <Card
      className="group relative overflow-hidden border-0 shadow-sm cursor-pointer rounded-2xl hover:shadow-md transition-shadow"
      onClick={onClick}>
      <div className="aspect-square">
        <img
          src={image.image_url}
          alt={image.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-medium text-sm truncate mb-1">{image.title}</p>
          <p className="text-white/80 text-xs truncate">{projectName}</p>
          {roomLabel && (
            <p className="text-white/70 text-xs truncate mt-0.5">
              <MapPin className="h-3 w-3 inline mr-1" />
              {roomLabel}
            </p>
          )}
        </div>
      </div>
      <div className="absolute top-2 right-2">
        <span className="text-xs bg-white/95 text-slate-700 px-2 py-1 rounded-lg shadow-sm">
          {moduleLabel}
        </span>
      </div>
      {image.gps_location && (
        <div className="absolute top-2 left-2">
          <div className="bg-green-500/90 p-1 rounded-lg">
            <MapPin className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </Card>
  );
}