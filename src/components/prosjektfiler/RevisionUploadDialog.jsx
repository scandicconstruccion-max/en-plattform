import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Upload, File } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RevisionUploadDialog({ open, onClose, existingFile, user, allProjectUsers = [] }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectFile.update(id, data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectFile.create(data),
  });

  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const nextRevisionLabel = (currentVersion) => {
    if (!currentVersion) return 'Rev01';
    const match = currentVersion.match(/Rev(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `Rev${String(num).padStart(2, '0')}`;
    }
    return 'Rev01';
  };

  const handleUpload = async () => {
    if (!selectedFile || !existingFile) return;
    setUploading(true);

    try {
      // 1. Archive old version
      await updateMutation.mutateAsync({
        id: existingFile.id,
        data: { active_flag: false }
      });

      // 2. Upload new file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileType = selectedFile.name.split('.').pop();
      const newVersion = nextRevisionLabel(existingFile.version);

      // 3. Create new revision record
      await createMutation.mutateAsync({
        name: selectedFile.name,
        base_name: existingFile.base_name || existingFile.name,
        project_id: existingFile.project_id,
        category_id: existingFile.category_id,
        file_url,
        file_type: fileType,
        file_size: selectedFile.size,
        description,
        access_level: existingFile.access_level,
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        version: newVersion,
        active_flag: true,
        revision_group_id: existingFile.revision_group_id || existingFile.id,
        activity_log: [{
          action: 'Ny revisjon',
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name,
          details: `${newVersion} lastet opp`
        }]
      });

      // 4. Send system notifications to all project users
      const baseName = existingFile.base_name || existingFile.name;
      const notifText = `Ny revisjon av ${baseName} er lastet opp: ${newVersion}`;
      await Promise.all(
        allProjectUsers
          .filter(email => email !== user?.email)
          .map(email =>
            base44.entities.Notification.create({
              user_email: email,
              title: 'Ny filrevisjon',
              message: notifText,
              type: 'info',
              project_id: existingFile.project_id,
              read: false
            }).catch(() => {})
          )
      );

      queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
      toast.success(`${newVersion} lastet opp`);
      onClose();
      setSelectedFile(null);
      setDescription('');
    } catch {
      toast.error('Feil ved opplasting av revisjon');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSelectedFile(null); setDescription(''); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Last opp ny revisjon</DialogTitle>
        </DialogHeader>

        {existingFile && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-slate-700">{existingFile.base_name || existingFile.name}</p>
            <p className="text-slate-500 mt-0.5">
              Gjeldende: <span className="font-semibold text-emerald-700">{existingFile.version || 'Rev01'}</span>
              {' → '}
              Ny: <span className="font-semibold text-blue-700">{nextRevisionLabel(existingFile.version)}</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Beskrivelse av endringer (valgfritt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hva er endret i denne revisjonen?"
              rows={2}
              className="mt-1.5"
            />
          </div>

          {!selectedFile ? (
            <label
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              className={cn(
                "flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-50"
              )}
            >
              <Upload className={cn("h-8 w-8", isDragging ? "text-emerald-600" : "text-slate-400")} />
              <span className="text-sm font-medium text-slate-500">
                {isDragging ? "Slipp filen her" : "Klikk for å velge ny revisjon"}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg"
              />
            </label>
          ) : (
            <div className="p-4 rounded-xl border bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <File className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>Bytt</Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {uploading ? 'Laster opp...' : 'Last opp revisjon'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}