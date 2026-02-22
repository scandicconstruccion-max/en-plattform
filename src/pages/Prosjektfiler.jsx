import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { 
  FolderOpen, File, Upload, Plus, Search,
  FileText, FileImage, Download, Trash2,
  MoreVertical, Lock, Users, Shield, Camera,
  Edit, Palette, X, Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PREDEFINED_CATEGORIES = [
  { name: 'Tegninger / Planer', icon: 'FileText', color: '#3b82f6', order: 1, children: [
    { name: 'Arkitekttegninger', icon: 'FileText', color: '#3b82f6', order: 1 },
    { name: 'Konstruksjonstegninger', icon: 'FileText', color: '#3b82f6', order: 2 },
    { name: 'Elektrisk / VVS', icon: 'FileText', color: '#3b82f6', order: 3 }
  ]},
  { name: 'Beskrivelser / Spesifikasjoner', icon: 'FileText', color: '#10b981', order: 2 },
  { name: 'Kontrakt / Avtaler', icon: 'FileText', color: '#f59e0b', order: 3 },
  { name: 'Faktura / Økonomi', icon: 'FileText', color: '#ef4444', order: 4 },
  { name: 'Møtereferater / Kommunikasjon', icon: 'FileText', color: '#8b5cf6', order: 5 },
  { name: 'Tillatelser / Sertifikater', icon: 'FileText', color: '#06b6d4', order: 6 },
  { name: 'Bilder', icon: 'FileImage', color: '#ec4899', order: 7 },
  { name: 'Annet', icon: 'FileText', color: '#6b7280', order: 8 }
];

const accessLevelLabels = {
  alle: 'Alle brukere',
  prosjektleder: 'Prosjektleder',
  admin: 'Admin'
};

const accessLevelIcons = {
  alle: Users,
  prosjektleder: Lock,
  admin: Shield
};

const getFileIcon = (fileType) => {
  const type = fileType?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) return FileImage;
  return FileText;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Prosjektfiler() {
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [uploadData, setUploadData] = useState({ description: '', access_level: 'alle' });
  const [categoryData, setCategoryData] = useState({ name: '', color: '#3b82f6', icon: 'Folder', access_level: 'alle' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: files = [] } = useQuery({
    queryKey: ['projectFiles'],
    queryFn: () => base44.entities.ProjectFile.list('-created_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['fileCategories'],
    queryFn: () => base44.entities.FileCategory.list('order'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  // Initialize categories for new projects
  useEffect(() => {
    if (projectFilter !== 'all' && categories.length === 0) {
      initializeCategoriesForProject(projectFilter);
    }
  }, [projectFilter]);

  const initializeCategoriesForProject = async (projectId) => {
    const existingCats = categories.filter(c => c.project_id === projectId);
    if (existingCats.length > 0) return;

    for (const cat of PREDEFINED_CATEGORIES) {
      const categoryId = await base44.entities.FileCategory.create({
        project_id: projectId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
        is_predefined: true,
        access_level: 'alle'
      });

      if (cat.children) {
        for (const child of cat.children) {
          await base44.entities.FileCategory.create({
            project_id: projectId,
            name: child.name,
            parent_category: cat.name,
            icon: child.icon,
            color: child.color,
            order: child.order,
            is_predefined: true,
            access_level: 'alle'
          });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
  };

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectFile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      setShowUploadDialog(false);
      setUploadData({ description: '', access_level: 'alle' });
      toast.success('Fil lastet opp');
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectFile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success('Fil oppdatert');
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success('Fil slettet');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.FileCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      setShowCategoryDialog(false);
      setCategoryData({ name: '', color: '#3b82f6', icon: 'Folder', access_level: 'alle' });
      toast.success('Kategori opprettet');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.FileCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      toast.success('Kategori slettet');
    },
  });

  const userRole = user?.role || 'user';
  const userAccessLevel = userRole === 'admin' ? 'admin' : 
    projects.some(p => p.project_manager === user?.email) ? 'prosjektleder' : 'alle';

  const canAccess = (itemAccessLevel) => {
    if (userAccessLevel === 'admin') return true;
    if (userAccessLevel === 'prosjektleder') return itemAccessLevel !== 'admin';
    return itemAccessLevel === 'alle';
  };

  const projectCategories = useMemo(() => {
    return categories.filter(c => c.project_id === projectFilter && canAccess(c.access_level));
  }, [categories, projectFilter, userAccessLevel]);

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      if (!canAccess(file.access_level)) return false;
      if (file.project_id !== projectFilter) return false;
      if (selectedCategory && file.category_id !== selectedCategory) return false;
      if (search && !file.name.toLowerCase().includes(search.toLowerCase()) && 
          !file.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [files, projectFilter, selectedCategory, search, userAccessLevel]);

  const logActivity = (fileId, action, details) => {
    const file = files.find(f => f.id === fileId);
    const log = file?.activity_log || [];
    log.push({
      action,
      timestamp: new Date().toISOString(),
      user_email: user?.email,
      user_name: user?.full_name,
      details
    });
    updateFileMutation.mutate({ 
      id: fileId, 
      data: { activity_log: log }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    if (!uploadData.description.trim()) {
      toast.error('Opplastningen må beskrives for å lagre');
      return;
    }

    if (!selectedCategory) {
      toast.error('Velg en kategori');
      return;
    }

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const fileType = file.name.split('.').pop();
    
    const fileData = {
      name: file.name,
      project_id: projectFilter,
      category_id: selectedCategory,
      file_url,
      file_type: fileType,
      file_size: file.size,
      description: uploadData.description,
      access_level: uploadData.access_level,
      uploaded_by: user?.email,
      uploaded_by_name: user?.full_name,
      activity_log: [{
        action: 'Opprettet',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: 'Fil lastet opp'
      }]
    };

    await createFileMutation.mutateAsync(fileData);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    for (const fileId of selectedFiles) {
      await deleteFileMutation.mutateAsync(fileId);
    }
    setSelectedFiles([]);
    setShowBulkActions(false);
  };

  const handleBulkMove = async (newCategoryId) => {
    if (selectedFiles.length === 0) return;
    
    for (const fileId of selectedFiles) {
      await updateFileMutation.mutateAsync({ 
        id: fileId, 
        data: { category_id: newCategoryId }
      });
      logActivity(fileId, 'Flyttet', `Flyttet til ny kategori`);
    }
    setSelectedFiles([]);
    setShowBulkActions(false);
  };

  const handleCreateCategory = () => {
    if (!categoryData.name.trim()) {
      toast.error('Angi kategorinavn');
      return;
    }
    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    createCategoryMutation.mutate({
      name: categoryData.name,
      project_id: projectFilter,
      color: categoryData.color,
      icon: categoryData.icon,
      access_level: categoryData.access_level,
      is_predefined: false,
      order: projectCategories.length + 1
    });
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Prosjektfiler"
        subtitle="Administrer filer og bilder per kategori"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Project Filter */}
        <div className="mb-6">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-64 rounded-xl">
              <SelectValue placeholder="Velg prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Velg prosjekt</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {projectFilter === 'all' ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-1">Velg et prosjekt</h3>
            <p className="text-slate-500">Velg et prosjekt for å administrere filer</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Left Panel - Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Kategorier</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCategoryDialog(true)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {projectCategories.filter(c => !c.parent_category).map(category => (
                <div key={category.id}>
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all",
                      selectedCategory === category.id 
                        ? "bg-white shadow-md" 
                        : "hover:bg-white/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <FileText className="h-5 w-5" style={{ color: category.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{category.name}</p>
                        <p className="text-xs text-slate-500">
                          {filteredFiles.filter(f => f.category_id === category.id).length} filer
                        </p>
                      </div>
                      {!category.is_predefined && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Slett
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </button>
                  
                  {/* Subcategories */}
                  {projectCategories.filter(c => c.parent_category === category.name).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedCategory(sub.id)}
                      className={cn(
                        "w-full text-left px-4 py-2 pl-12 rounded-xl transition-all ml-4 mt-1",
                        selectedCategory === sub.id 
                          ? "bg-white shadow-sm" 
                          : "hover:bg-white/50"
                      )}
                    >
                      <p className="text-sm truncate">{sub.name}</p>
                      <p className="text-xs text-slate-500">
                        {filteredFiles.filter(f => f.category_id === sub.id).length} filer
                      </p>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Right Panel - Files */}
            <div className="space-y-6">
              {/* Search and Actions */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Søk etter filer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                  disabled={!selectedCategory}
                >
                  <Upload className="h-4 w-4" /> Last opp fil
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedFiles.length > 0 && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{selectedFiles.length} filer valgt</p>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Flytt til kategori
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {projectCategories.map(cat => (
                            <DropdownMenuItem key={cat.id} onClick={() => handleBulkMove(cat.id)}>
                              {cat.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleBulkDelete}
                        className="text-red-600 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Slett
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedFiles([])}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Files List */}
              {!selectedCategory ? (
                <EmptyState
                  icon={FolderOpen}
                  title="Velg en kategori"
                  description="Velg en kategori fra venstre panel for å se filer"
                />
              ) : filteredFiles.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Ingen filer"
                  description="Last opp filer til denne kategorien"
                  actionLabel="Last opp fil"
                  onAction={() => setShowUploadDialog(true)}
                />
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map(file => {
                    const FileIcon = getFileIcon(file.file_type);
                    const AccessIcon = accessLevelIcons[file.access_level];
                    return (
                      <Card key={file.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                          />
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>•</span>
                              <span>{format(new Date(file.created_date), 'dd.MM.yyyy', { locale: nb })}</span>
                              <span>•</span>
                              <AccessIcon className="h-3 w-3 inline" />
                              <span>{accessLevelLabels[file.access_level]}</span>
                            </div>
                            {file.description && (
                              <p className="text-sm text-slate-600 mt-1">{file.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" /> Last ned
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  deleteFileMutation.mutate(file.id);
                                  logActivity(file.id, 'Slettet', 'Fil slettet');
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Slett
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}


            </div>
          </div>
        )}
      </div>

      {/* Upload File Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Last opp fil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tilgangsnivå</Label>
              <Select value={uploadData.access_level} onValueChange={(v) => setUploadData({...uploadData, access_level: v})}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle brukere</SelectItem>
                  <SelectItem value="prosjektleder">Kun prosjektleder</SelectItem>
                  <SelectItem value="admin">Kun admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse *</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                placeholder="Beskriv filen..."
                rows={2}
                className="mt-1.5"
              />
            </div>
            <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50">
              <Upload className="h-8 w-8 text-slate-400" />
              <span className="text-sm text-slate-500">Klikk for å velge fil</span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opprett kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategorinavn *</Label>
              <Input
                value={categoryData.name}
                onChange={(e) => setCategoryData({...categoryData, name: e.target.value})}
                placeholder="f.eks. Kvalitetsdokumenter"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Farge</Label>
              <Input
                type="color"
                value={categoryData.color}
                onChange={(e) => setCategoryData({...categoryData, color: e.target.value})}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label>Tilgangsnivå</Label>
              <Select value={categoryData.access_level} onValueChange={(v) => setCategoryData({...categoryData, access_level: v})}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle brukere</SelectItem>
                  <SelectItem value="prosjektleder">Kun prosjektleder</SelectItem>
                  <SelectItem value="admin">Kun admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleCreateCategory} className="bg-emerald-600 hover:bg-emerald-700">
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}