import React, { useState, useMemo } from 'react';
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
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  FolderOpen, File, Upload, Plus, Search, Filter,
  Folder, FileText, FileImage, FileSpreadsheet, FileArchive,
  MoreVertical, Trash2, Download, ChevronRight, ArrowLeft,
  Lock, Users, Shield, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  if (['xls', 'xlsx', 'csv'].includes(type)) return FileSpreadsheet;
  if (['zip', 'rar', '7z'].includes(type)) return FileArchive;
  return FileText;
};

export default function Prosjektfiler() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({ description: '', access_level: 'alle' });
  const [folderData, setFolderData] = useState({ name: '', access_level: 'alle' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['projectFiles'],
    queryFn: () => base44.entities.ProjectFile.list('-created_date'),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['projectFolders'],
    queryFn: () => base44.entities.ProjectFolder.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectFile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      setShowUploadDialog(false);
      setUploadData({ description: '', access_level: 'alle' });
      toast.success('Fil lastet opp');
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFolders'] });
      setShowFolderDialog(false);
      setFolderData({ name: '', access_level: 'alle' });
      toast.success('Mappe opprettet');
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success('Fil slettet');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFolder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFolders'] });
      toast.success('Mappe slettet');
    },
  });

  // Determine user's access level
  const userRole = user?.role || 'user';
  const userAccessLevel = userRole === 'admin' ? 'admin' : 
    projects.some(p => p.project_manager === user?.email) ? 'prosjektleder' : 'alle';

  const canAccess = (itemAccessLevel) => {
    if (userAccessLevel === 'admin') return true;
    if (userAccessLevel === 'prosjektleder') return itemAccessLevel !== 'admin';
    return itemAccessLevel === 'alle';
  };

  // Filter and organize data
  const filteredFolders = useMemo(() => {
    return folders.filter(folder => {
      if (!canAccess(folder.access_level)) return false;
      if (folder.parent_id !== currentFolderId) return false;
      if (projectFilter !== 'all' && folder.project_id !== projectFilter) return false;
      if (accessFilter !== 'all' && folder.access_level !== accessFilter) return false;
      if (search && !folder.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [folders, currentFolderId, projectFilter, accessFilter, search, userAccessLevel]);

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      if (!canAccess(file.access_level)) return false;
      if (file.folder_id !== currentFolderId) return false;
      if (projectFilter !== 'all' && file.project_id !== projectFilter) return false;
      if (accessFilter !== 'all' && file.access_level !== accessFilter) return false;
      if (search && !file.name.toLowerCase().includes(search.toLowerCase()) && 
          !file.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [files, currentFolderId, projectFilter, accessFilter, search, userAccessLevel]);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let folder = currentFolder;
    while (folder) {
      crumbs.unshift(folder);
      folder = folders.find(f => f.id === folder.parent_id);
    }
    return crumbs;
  }, [currentFolder, folders]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const fileType = file.name.split('.').pop();
    
    await createFileMutation.mutateAsync({
      name: file.name,
      project_id: projectFilter,
      folder_id: currentFolderId || null,
      file_url,
      file_type: fileType,
      file_size: file.size,
      description: uploadData.description,
      access_level: uploadData.access_level,
      uploaded_by: user?.email,
      uploaded_by_name: user?.full_name
    });
    
    setUploading(false);
  };

  const handleCreateFolder = () => {
    if (!folderData.name.trim()) {
      toast.error('Angi mappenavn');
      return;
    }
    if (projectFilter === 'all') {
      toast.error('Velg et prosjekt først');
      return;
    }

    createFolderMutation.mutate({
      name: folderData.name,
      project_id: projectFilter,
      parent_id: currentFolderId || null,
      access_level: folderData.access_level
    });
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Ukjent prosjekt';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Prosjektfiler"
        subtitle="Administrer filer og dokumenter"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFolderDialog(true)}
              className="rounded-xl gap-2"
              disabled={projectFilter === 'all'}
            >
              <Plus className="h-4 w-4" /> Ny mappe
            </Button>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
              disabled={projectFilter === 'all'}
            >
              <Upload className="h-4 w-4" /> Last opp
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter filer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setCurrentFolderId(null); }}>
            <SelectTrigger className="w-48 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Velg prosjekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prosjekter</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accessFilter} onValueChange={setAccessFilter}>
            <SelectTrigger className="w-40 rounded-xl dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Tilgang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle nivåer</SelectItem>
              <SelectItem value="alle">Alle brukere</SelectItem>
              {(userAccessLevel === 'prosjektleder' || userAccessLevel === 'admin') && (
                <SelectItem value="prosjektleder">Prosjektleder</SelectItem>
              )}
              {userAccessLevel === 'admin' && (
                <SelectItem value="admin">Admin</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Breadcrumbs */}
        {(currentFolderId || breadcrumbs.length > 0) && (
          <div className="flex items-center gap-2 text-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentFolderId(null)}
              className="rounded-lg gap-1 text-slate-600 dark:text-slate-400"
            >
              <FolderOpen className="h-4 w-4" />
              Rot
            </Button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "rounded-lg",
                    idx === breadcrumbs.length - 1 
                      ? "text-emerald-600 dark:text-emerald-400 font-medium" 
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  {crumb.name}
                </Button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content */}
        {projectFilter === 'all' ? (
          <Card className="p-8 text-center border-0 shadow-sm dark:bg-slate-900">
            <FolderOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Velg et prosjekt</h3>
            <p className="text-slate-500 dark:text-slate-400">Velg et prosjekt fra filteret for å se filer</p>
          </Card>
        ) : filesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="p-4 animate-pulse border-0 shadow-sm">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Ingen filer"
            description="Last opp filer eller opprett mapper for å organisere dokumenter"
            actionLabel="Last opp fil"
            onAction={() => setShowUploadDialog(true)}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {filteredFolders.map((folder) => {
              const AccessIcon = accessLevelIcons[folder.access_level];
              return (
                <Card 
                  key={folder.id}
                  className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 group"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Folder className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{folder.name}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <AccessIcon className="h-3 w-3" />
                    {accessLevelLabels[folder.access_level]}
                  </div>
                </Card>
              );
            })}

            {/* Files */}
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const AccessIcon = accessLevelIcons[file.access_level];
              return (
                <Card 
                  key={file.id}
                  className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
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
                          onClick={() => deleteFileMutation.mutate(file.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white truncate text-sm" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <AccessIcon className="h-3 w-3" />
                    <span>{formatFileSize(file.file_size)}</span>
                  </div>
                  {file.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{file.description}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Last opp fil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tilgangsnivå</Label>
              <Select value={uploadData.access_level} onValueChange={(v) => setUploadData({...uploadData, access_level: v})}>
                <SelectTrigger className="mt-1.5 rounded-xl">
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
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                placeholder="Legg til kommentar..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span className="text-sm text-slate-500">Klikk for å velge fil</span>
                </>
              )}
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Opprett mappe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mappenavn *</Label>
              <Input
                value={folderData.name}
                onChange={(e) => setFolderData({...folderData, name: e.target.value})}
                placeholder="f.eks. Tegninger"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Tilgangsnivå</Label>
              <Select value={folderData.access_level} onValueChange={(v) => setFolderData({...folderData, access_level: v})}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle brukere</SelectItem>
                  <SelectItem value="prosjektleder">Kun prosjektleder</SelectItem>
                  <SelectItem value="admin">Kun admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowFolderDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button onClick={handleCreateFolder} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                Opprett
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}