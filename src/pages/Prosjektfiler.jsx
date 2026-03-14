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
  SelectValue } from
'@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import {
  FolderOpen, File, Upload, Plus, Search,
  FileText, FileImage, Download, Trash2,
  MoreVertical, Lock, Users, Shield, Camera,
  Edit, Palette, X, Image as ImageIcon, ChevronDown, ChevronRight,
  CheckCircle2, Archive, History, RefreshCw } from
'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ImageGallery from '@/components/prosjektfiler/ImageGallery';
import ImageModal from '@/components/prosjektfiler/ImageModal';
import RevisionUploadDialog from '@/components/prosjektfiler/RevisionUploadDialog';
import RevisionHistoryPanel from '@/components/prosjektfiler/RevisionHistoryPanel';

const PREDEFINED_CATEGORIES = [
{ name: 'Tegninger / Planer', icon: 'FileText', color: '#3b82f6', order: 1, children: [
  { name: 'Arkitekttegninger', icon: 'FileText', color: '#3b82f6', order: 1 },
  { name: 'Konstruksjonstegninger', icon: 'FileText', color: '#3b82f6', order: 2 },
  { name: 'Elektrisk / VVS', icon: 'FileText', color: '#3b82f6', order: 3 }]
},
{ name: 'Beskrivelser / Spesifikasjoner', icon: 'FileText', color: '#10b981', order: 2 },
{ name: 'Kontrakt / Avtaler', icon: 'FileText', color: '#f59e0b', order: 3 },
{ name: 'Økonomi', icon: 'FileText', color: '#ef4444', order: 4 },
{ name: 'Møtereferater / Kommunikasjon', icon: 'FileText', color: '#8b5cf6', order: 5 },
{ name: 'Tillatelser / Sertifikater', icon: 'FileText', color: '#06b6d4', order: 6 },
{ name: 'Bilder', icon: 'FileImage', color: '#ec4899', order: 7 },
{ name: 'Annet', icon: 'FileText', color: '#6b7280', order: 8 }];


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
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showArchive, setShowArchive] = useState(false);
  const [revisionDialogFile, setRevisionDialogFile] = useState(null);
  const [historyFile, setHistoryFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: files = [] } = useQuery({
    queryKey: ['projectFiles'],
    queryFn: () => base44.entities.ProjectFile.list('-created_date')
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['fileCategories'],
    queryFn: () => base44.entities.FileCategory.list('order')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  // Initialize categories for new projects
  useEffect(() => {
    if (projectFilter !== 'all' && categories.length > 0) {
      const projectCats = categories.filter((c) => c.project_id === projectFilter);
      if (projectCats.length === 0) {
        initializeCategoriesForProject(projectFilter);
      }
    }
  }, [projectFilter]);

  const initializeCategoriesForProject = async (projectId) => {
    const existingCats = categories.filter((c) => c.project_id === projectId);
    if (existingCats.length > 0) return;

    try {
      for (const cat of PREDEFINED_CATEGORIES) {
        // Check if parent category already exists
        const parentExists = existingCats.some(c => c.name === cat.name && !c.parent_category);
        if (!parentExists) {
          await base44.entities.FileCategory.create({
            project_id: projectId,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            order: cat.order,
            is_predefined: true,
            access_level: 'alle',
            parent_category: null
          });
        }

        if (cat.children) {
          for (const child of cat.children) {
            // Check if child category already exists
            const childExists = existingCats.some(c => c.name === child.name && c.parent_category === cat.name);
            if (!childExists) {
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
      }
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectFile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      setShowUploadDialog(false);
      setUploadData({ description: '', access_level: 'alle' });
      toast.success('Fil lastet opp');
    }
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectFile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success('Fil oppdatert');
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success('Fil slettet');
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.FileCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      setShowCategoryDialog(false);
      setCategoryData({ name: '', color: '#3b82f6', icon: 'Folder', access_level: 'alle' });
      toast.success('Kategori opprettet');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.FileCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      toast.success('Kategori slettet');
    }
  });

  const userRole = user?.role || 'user';
  const userAccessLevel = userRole === 'admin' ? 'admin' :
  projects.some((p) => p.project_manager === user?.email) ? 'prosjektleder' : 'alle';

  const canAccess = (itemAccessLevel) => {
    if (userAccessLevel === 'admin') return true;
    if (userAccessLevel === 'prosjektleder') return itemAccessLevel !== 'admin';
    return itemAccessLevel === 'alle';
  };

  const projectCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.project_id === projectFilter && canAccess(c.access_level));
    // Remove duplicates based on id using Map for better performance
    const uniqueMap = new Map();
    filtered.forEach(cat => {
      if (!uniqueMap.has(cat.id)) {
        uniqueMap.set(cat.id, cat);
      }
    });
    return Array.from(uniqueMap.values());
  }, [categories, projectFilter, userAccessLevel]);

  const getFilesCountForCategory = (categoryId) => {
    return files.filter((f) => f.category_id === categoryId && f.project_id === projectFilter && canAccess(f.access_level)).length;
  };

  // Determine if a category is revision-controlled (Tegninger or Beskrivelser)
  const isRevisionCategory = (categoryId) => {
    if (!categoryId) return false;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return false;
    const revNames = ['tegninger', 'beskrivelser', 'spesifikasjoner', 'arkitekttegninger', 'konstruksjonstegninger', 'elektrisk', 'vvs'];
    const name = (cat.name || '').toLowerCase();
    return revNames.some(n => name.includes(n)) || (cat.parent_category || '').toLowerCase().includes('tegning') || (cat.parent_category || '').toLowerCase().includes('beskrivelse');
  };

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (!canAccess(file.access_level)) return false;
      if (file.project_id !== projectFilter) return false;
      if (selectedCategory && file.category_id !== selectedCategory) return false;
      if (search && !file.name.toLowerCase().includes(search.toLowerCase()) &&
      !file.description?.toLowerCase().includes(search.toLowerCase())) return false;
      // Filter by archive toggle for revision-controlled categories
      if (isRevisionCategory(selectedCategory)) {
        if (!showArchive && file.active_flag === false) return false;
      }
      return true;
    });
  }, [files, projectFilter, selectedCategory, search, userAccessLevel, showArchive]);

  // Get all revisions for a file (by revision_group_id)
  const getRevisions = (file) => {
    const groupId = file.revision_group_id || file.id;
    return files.filter(f =>
      f.project_id === file.project_id &&
      (f.revision_group_id === groupId || f.id === groupId || f.revision_group_id === file.id)
    ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  };

  // All project user emails for notifications
  const allProjectUserEmails = useMemo(() => {
    const project = projects.find(p => p.id === projectFilter);
    return project?.assigned_users || [];
  }, [projects, projectFilter]);

  const imageFiles = useMemo(() => {
    return filteredFiles.filter((f) => {
      const type = f.file_type?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type);
    });
  }, [filteredFiles]);

  const documentFiles = useMemo(() => {
    return filteredFiles.filter((f) => {
      const type = f.file_type?.toLowerCase();
      return !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type);
    });
  }, [filteredFiles]);

  const logActivity = (fileId, action, details) => {
    const file = files.find((f) => f.id === fileId);
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    if (!selectedCategory) {
      toast.error('Velg en kategori');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewFile(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    if (!selectedCategory) {
      toast.error('Velg en kategori');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewFile(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
    const fileType = selectedFile.name.split('.').pop();

    const isRevCat = isRevisionCategory(selectedCategory);
    const fileData = {
      name: selectedFile.name,
      base_name: selectedFile.name,
      project_id: projectFilter,
      category_id: selectedCategory,
      file_url,
      file_type: fileType,
      file_size: selectedFile.size,
      description: uploadData.description,
      access_level: uploadData.access_level,
      uploaded_by: user?.email,
      uploaded_by_name: user?.full_name,
      ...(isRevCat ? { version: 'Rev01', active_flag: true } : {}),
      activity_log: [{
        action: 'Opprettet',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name,
        details: isRevCat ? 'Rev01 lastet opp' : 'Fil lastet opp'
      }]
    };

    await createFileMutation.mutateAsync(fileData);
    setPreviewFile(null);
    setSelectedFile(null);
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
    setSelectedFiles((prev) =>
    prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleOpenImage = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleNavigateImage = (image) => {
    setSelectedImage(image);
  };

  const handleBulkDownload = async () => {
    for (const fileId of selectedFiles) {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        const link = document.createElement('a');
        link.href = file.file_url;
        link.download = file.name;
        link.click();
      }
    }
    toast.success(`${selectedFiles.length} filer lastet ned`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Prosjektfiler"
        subtitle="Administrer filer og bilder per kategori" />


      <div className="px-6 lg:px-8 py-6">
        {/* Project Filter */}
        <div className="mb-6">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-64 rounded-xl">
              <SelectValue placeholder="Velg prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Velg prosjekt</SelectItem>
              {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {projectFilter === 'all' ?
        <Card className="p-8 text-center border-0 shadow-sm">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-1">Velg et prosjekt</h3>
            <p className="text-slate-500">Velg et prosjekt for å administrere filer</p>
          </Card> :

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Left Panel - Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Kategorier</h3>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryDialog(true)}
                className="h-8 w-8 p-0">

                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {projectCategories
                .filter((c) => !c.parent_category)
                .filter((category, index, self) => 
                  index === self.findIndex((c) => c.name === category.name)
                )
                .map((category) => {
                  const subcategories = projectCategories
                    .filter((c) => c.parent_category === category.name)
                    .reduce((unique, sub) => {
                      if (!unique.find(u => u.name === sub.name)) unique.push(sub);
                      return unique;
                    }, []);
                  const hasChildren = subcategories.length > 0;
                  const isCollapsed = collapsedCategories[category.id];

                  return (
                    <div key={`cat-${category.id}`}>
                      <button
                        onClick={() => {
                          if (hasChildren) {
                            setCollapsedCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }));
                          } else {
                            setSelectedCategory(category.id);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all",
                          selectedCategory === category.id && !hasChildren ?
                          "bg-emerald-50 text-emerald-700 shadow-md" :
                          "hover:bg-white/50"
                        )}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}>
                            <FileText className="h-5 w-5" style={{ color: category.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{category.name}</p>
                            <p className="text-xs text-slate-500">
                              {hasChildren
                                ? `${subcategories.length} undermapper`
                                : `${getFilesCountForCategory(category.id)} filer`}
                            </p>
                          </div>
                          {hasChildren && (
                            isCollapsed
                              ? <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          )}
                          {!category.is_predefined &&
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => deleteCategoryMutation.mutate(category.id)}
                                  className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" /> Slett
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        </div>
                      </button>

                      {/* Subcategories - collapsible */}
                      {hasChildren && !isCollapsed && subcategories.map((sub) =>
                        <button
                          key={`sub-${sub.id}`}
                          onClick={() => setSelectedCategory(sub.id)}
                          className={cn(
                            "w-full text-left px-4 py-2 pl-12 rounded-xl transition-all ml-4 mt-1",
                            selectedCategory === sub.id ?
                            "bg-emerald-50 text-emerald-700 shadow-sm" :
                            "hover:bg-white/50"
                          )}>
                          <p className="text-sm truncate">{sub.name}</p>
                          <p className="text-xs text-slate-500">
                            {getFilesCountForCategory(sub.id)} filer
                          </p>
                        </button>
                      )}
                    </div>
                  );
                })}
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
                  className="pl-10 rounded-xl" />

                </div>
                <Button
                onClick={() => setShowUploadDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                disabled={!selectedCategory}>

                  <Upload className="h-4 w-4" /> Last opp fil
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedFiles.length > 0 &&
            <Card className="p-4 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-emerald-700">{selectedFiles.length} filer valgt</p>
                    <div className="flex gap-2">
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    className="rounded-xl">

                        <Download className="h-4 w-4 mr-2" /> Last ned
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Flytt til kategori
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {projectCategories.map((cat) =>
                      <DropdownMenuItem key={cat.id} onClick={() => handleBulkMove(cat.id)}>
                              {cat.name}
                            </DropdownMenuItem>
                      )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 rounded-xl">

                        <Trash2 className="h-4 w-4 mr-2" /> Slett
                      </Button>
                      <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}>

                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
            }

              {/* Archive toggle for revision-controlled categories */}
              {selectedCategory && isRevisionCategory(selectedCategory) && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowArchive(!showArchive)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      showArchive
                        ? "bg-slate-200 border-slate-300 text-slate-700"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Archive className="h-4 w-4" />
                    {showArchive ? 'Skjul arkiv' : 'Vis arkiverte revisjoner'}
                  </button>
                </div>
              )}

              {/* Files List */}
              {!selectedCategory ?
            <EmptyState
              icon={FolderOpen}
              title="Velg en kategori"
              description="Velg en kategori fra venstre panel for å se filer" /> :

            filteredFiles.length === 0 ?
            <EmptyState
              icon={FileText}
              title="Ingen filer"
              description="Last opp filer til denne kategorien"
              actionLabel="Last opp fil"
              onAction={() => setShowUploadDialog(true)} /> :


            <div className="space-y-6">
                  {/* Images Section */}
                  {imageFiles.length > 0 &&
              <div>
                      <h3 className="font-semibold text-slate-900 mb-4">
                        Bilder ({imageFiles.length})
                      </h3>
                      <ImageGallery
                  images={imageFiles}
                  selectedFiles={selectedFiles}
                  onToggleSelection={toggleFileSelection}
                  onOpenImage={handleOpenImage}
                  onDelete={(id) => deleteFileMutation.mutate(id)}
                  userAccessLevel={userAccessLevel} />

                    </div>
              }

                  {/* Documents Section */}
                  {documentFiles.length > 0 &&
              <div>
                      <h3 className="font-semibold text-slate-900 mb-4">
                        Dokumenter ({documentFiles.length})
                      </h3>
                      <div className="space-y-2">
                        {documentFiles.map((file) => {
                    const FileIcon = getFileIcon(file.file_type);
                    const AccessIcon = accessLevelIcons[file.access_level];
                    const isRevCat = isRevisionCategory(file.category_id);
                    const isActive = file.active_flag !== false;
                    const isArchived = file.active_flag === false;
                    return (
                      <Card key={file.id} className={cn("p-4 hover:shadow-md transition-shadow", isArchived && "opacity-60 bg-slate-50")}>
                              <div className="flex items-center gap-4">
                                <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)} />

                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isActive && isRevCat ? "bg-emerald-100" : "bg-blue-100")}>
                                  <FileIcon className={cn("h-5 w-5", isActive && isRevCat ? "text-emerald-600" : "text-blue-600")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium truncate">{file.base_name || file.name}</p>
                                    {isRevCat && file.version && (
                                      <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0",
                                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                      )}>
                                        {file.version}
                                        {isActive && <CheckCircle2 className="h-3 w-3 inline ml-1" />}
                                        {isArchived && <Archive className="h-3 w-3 inline ml-1" />}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(file.created_date), 'dd.MM.yyyy', { locale: nb })}</span>
                                    {file.uploaded_by_name && <><span>•</span><span>{file.uploaded_by_name}</span></>}
                                  </div>
                                  {file.description &&
                            <p className="text-sm text-slate-600 mt-1">{file.description}</p>
                            }
                                </div>
                                <div className="flex items-center gap-1">
                                  {isRevCat && isActive && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs rounded-lg hidden sm:flex gap-1"
                                      onClick={() => setRevisionDialogFile(file)}
                                    >
                                      <RefreshCw className="h-3 w-3" /> Ny revisjon
                                    </Button>
                                  )}
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
                                      {isRevCat && isActive && (
                                        <DropdownMenuItem onClick={() => setRevisionDialogFile(file)}>
                                          <RefreshCw className="h-4 w-4 mr-2" /> Last opp ny revisjon
                                        </DropdownMenuItem>
                                      )}
                                      {isRevCat && (
                                        <DropdownMenuItem onClick={() => setHistoryFile(file)}>
                                          <History className="h-4 w-4 mr-2" /> Revisjonshistorikk
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                  onClick={() => {
                                    deleteFileMutation.mutate(file.id);
                                    logActivity(file.id, 'Slettet', 'Fil slettet');
                                  }}
                                  className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" /> Slett
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </Card>);

                  })}
                      </div>
                    </div>
              }
                </div>
            }


            </div>
          </div>
        }
      </div>

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        images={imageFiles}
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onDelete={(id) => {
          deleteFileMutation.mutate(id);
          logActivity(id, 'Slettet', 'Bilde slettet');
        }}
        onNavigate={handleNavigateImage} />


      {/* Upload File Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) {
          setPreviewFile(null);
          setSelectedFile(null);
          setUploadData({ description: '', access_level: 'alle' });
        }
      }}>
        <DialogContent>
          <DialogHeader className="pt-0">
            <DialogTitle className="my-2 py-1 text-lg font-semibold tracking-tight leading-none">Last opp tegning/fil/bilde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedFile ?
            <>
                <div>
                  <Label>Tilgangsnivå</Label>
                  <Select value={uploadData.access_level} onValueChange={(v) => setUploadData({ ...uploadData, access_level: v })}>
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
                  <Label>Beskrivelse (valgfritt)</Label>
                  <Textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Legg til beskrivelse av opplastningen..."
                  rows={2}
                  className="mt-1.5" />

                </div>
                <label 
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                    isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-50"
                  )}>
                  <Upload className={cn("h-8 w-8", isDragging ? "text-emerald-600" : "text-slate-400")} />
                  <span className={cn("text-sm font-medium", isDragging ? "text-emerald-700" : "text-slate-500")}>
                    {isDragging ? "Slipp filen her" : "Klikk for å velge fil eller dra og slipp"}
                  </span>
                  <span className="text-xs text-slate-400">Støtter bilder, PDF, Word og Excel</span>
                  <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                  capture="environment" />

                </label>
              </> :

            <>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      {previewFile ? 'Bilde' : 'Dokument/Fil'}
                    </Label>
                    {previewFile ?
                  <div className="relative rounded-lg overflow-hidden border bg-slate-50">
                        <img src={previewFile} alt="Preview" className="w-full h-64 object-contain" />
                      </div> :

                  <div className="p-6 rounded-lg border bg-slate-50 text-center">
                        <File className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
                      </div>
                  }
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewFile(null);
                    }}
                    className="flex-1">

                      Velg annen fil
                    </Button>
                    <Button
                    onClick={handleSaveFile}
                    disabled={createFileMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700">

                      {createFileMutation.isPending ? 'Laster opp...' : 'Lagre'}
                    </Button>
                  </div>
                </div>
              </>
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Revision Upload Dialog */}
      <RevisionUploadDialog
        open={!!revisionDialogFile}
        onClose={() => setRevisionDialogFile(null)}
        existingFile={revisionDialogFile}
        user={user}
        allProjectUsers={allProjectUserEmails}
      />

      {/* Revision History Panel */}
      <RevisionHistoryPanel
        open={!!historyFile}
        onClose={() => setHistoryFile(null)}
        revisions={historyFile ? getRevisions(historyFile) : []}
        baseName={historyFile?.base_name || historyFile?.name}
      />

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
                onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                placeholder="f.eks. Kvalitetsdokumenter"
                className="mt-1.5" />

            </div>
            <div>
              <Label>Farge</Label>
              <Input
                type="color"
                value={categoryData.color}
                onChange={(e) => setCategoryData({ ...categoryData, color: e.target.value })}
                className="mt-1.5 h-12" />

            </div>
            <div>
              <Label>Tilgangsnivå</Label>
              <Select value={categoryData.access_level} onValueChange={(v) => setCategoryData({ ...categoryData, access_level: v })}>
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
    </div>);

}