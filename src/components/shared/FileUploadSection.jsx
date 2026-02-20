import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Upload, File, Image, X, Camera, FolderOpen, Search, Edit3, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ImageEditor from './ImageEditor';
import { optimizeImage, extractImageMetadata, getGPSLocation } from './imageOptimizer';

export default function FileUploadSection({ 
  attachments = [], 
  onAttachmentsChange, 
  projectId = null,
  moduleType = null, // 'quote', 'invoice', 'deviation', 'change'
  className 
}) {
  const [uploading, setUploading] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [editingImage, setEditingImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Get current user
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch project files
  const { data: projectFiles = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => projectId ? base44.entities.ProjectFile.filter({ project_id: projectId }) : [],
    enabled: !!projectId && showFileDialog
  });

  // Fetch image docs
  const { data: imageDocs = [] } = useQuery({
    queryKey: ['imageDocs', projectId],
    queryFn: () => projectId ? base44.entities.ImageDoc.filter({ project_id: projectId }) : [],
    enabled: !!projectId && showImageDialog
  });

  const handleFileUpload = async (files, skipOptimization = false) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Get GPS location for images
      const gpsLocation = await getGPSLocation();

      const uploadPromises = Array.from(files).map(async (file) => {
        let fileToUpload = file;
        
        // Optimize images
        if (!skipOptimization && file.type.startsWith('image/')) {
          try {
            fileToUpload = await optimizeImage(file);
          } catch (error) {
            console.warn('Image optimization failed, uploading original', error);
          }
        }

        const metadata = await extractImageMetadata(fileToUpload);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
        
        return {
          name: file.name,
          file_url,
          type: file.type.includes('image') ? 'image' : 'document',
          size: fileToUpload.size,
          original_size: file.size,
          uploaded_by: currentUser?.email,
          uploaded_by_name: currentUser?.full_name,
          uploaded_at: new Date().toISOString(),
          project_id: projectId,
          module_type: moduleType,
          gps_location: gpsLocation,
          metadata
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onAttachmentsChange([...attachments, ...uploadedFiles]);
      
      const savedSize = uploadedFiles.reduce((acc, f) => acc + (f.original_size - f.size), 0);
      const savedMB = (savedSize / 1024 / 1024).toFixed(1);
      
      toast.success(`${uploadedFiles.length} fil(er) lastet opp${savedSize > 0 ? ` (spart ${savedMB} MB)` : ''}`);
    } catch (error) {
      toast.error('Feil ved opplastning av filer');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    handleFileUpload(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFileUpload(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const selectFromFiles = (file) => {
    const newAttachment = {
      name: file.name,
      file_url: file.file_url,
      type: 'document',
      source: 'project_files',
      source_id: file.id
    };
    onAttachmentsChange([...attachments, newAttachment]);
    toast.success('Fil lagt til');
  };

  const selectFromImages = (image) => {
    const newAttachment = {
      name: image.title || 'Bilde',
      file_url: image.image_url,
      type: 'image',
      source: 'image_docs',
      source_id: image.id,
      uploaded_at: image.created_date,
      uploaded_by: image.created_by
    };
    onAttachmentsChange([...attachments, newAttachment]);
    toast.success('Bilde lagt til');
  };

  const handleImageEdit = (attachment) => {
    setEditingImage(attachment);
  };

  const handleImageEditSave = async (blob) => {
    setUploading(true);
    try {
      // Upload edited image
      const file = new File([blob], `edited_${editingImage.name}`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Add as new attachment with reference to original
      const newAttachment = {
        name: `Redigert: ${editingImage.name}`,
        file_url,
        type: 'image',
        size: blob.size,
        uploaded_by: currentUser?.email,
        uploaded_by_name: currentUser?.full_name,
        uploaded_at: new Date().toISOString(),
        edited_from: editingImage.file_url,
        project_id: projectId,
        module_type: moduleType
      };
      
      onAttachmentsChange([...attachments, newAttachment]);
      setEditingImage(null);
      toast.success('Redigert bilde lagret');
    } catch (error) {
      toast.error('Feil ved lagring av redigert bilde');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const openCameraOptions = () => {
    setShowCameraOptions(true);
  };

  const filteredFiles = projectFiles.filter(f => 
    f.name?.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const filteredImages = imageDocs.filter(img => 
    img.title?.toLowerCase().includes(imageSearch.toLowerCase()) ||
    img.description?.toLowerCase().includes(imageSearch.toLowerCase())
  );

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base font-semibold">Vedlegg / Dokumentasjon</Label>

      {/* Upload Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}>
          <Upload className="h-4 w-4" />
          Last opp fra PC
        </Button>

        {projectId && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowFileDialog(true)}>
              <FolderOpen className="h-4 w-4" />
              Hent fra filer
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowImageDialog(true)}>
              <Image className="h-4 w-4" />
              Hent bilder
            </Button>
          </>
        )}

        {/* Mobile Camera Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 lg:hidden"
          onClick={openCameraOptions}
          disabled={uploading}>
          <Camera className="h-4 w-4" />
          Legg til bilde
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag and Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors hidden sm:block">
        <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600">
          Slipp filer her eller klikk for å velge
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PDF, JPG, PNG, DOCX
        </p>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-slate-600">
            Vedlegg ({attachments.length})
          </Label>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {attachment.type === 'image' ? (
                  <Image className="h-5 w-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <File className="h-5 w-5 text-slate-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {attachment.name}
                  </p>
                  {attachment.size && (
                    <p className="text-xs text-slate-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {attachment.type === 'image' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleImageEdit(attachment)}
                      className="h-8 w-8"
                      title="Rediger bilde">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                  {attachment.file_url && (
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline px-2 py-1">
                      Vis
                    </a>
                  )}
                  {attachment.gps_location && (
                    <div className="text-xs text-green-600 flex items-center gap-1" title={`GPS: ${attachment.gps_location.latitude.toFixed(6)}, ${attachment.gps_location.longitude.toFixed(6)}`}>
                      <MapPin className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="h-8 w-8 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Select from Project Files Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Velg filer fra prosjekt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk etter filer..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredFiles.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  Ingen filer funnet
                </p>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <File className="h-5 w-5 text-slate-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {file.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        selectFromFiles(file);
                        setShowFileDialog(false);
                      }}>
                      Velg
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Select from Image Docs Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Velg bilder fra bildedokumentasjon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk etter bilder..."
                value={imageSearch}
                onChange={(e) => setImageSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-96 overflow-y-auto grid grid-cols-2 gap-3">
              {filteredImages.length === 0 ? (
                <div className="col-span-2 text-sm text-slate-500 text-center py-8">
                  Ingen bilder funnet
                </div>
              ) : (
                filteredImages.map((image) => (
                  <div
                    key={image.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-slate-100">
                      <img
                        src={image.image_url}
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate mb-2">
                        {image.title}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          selectFromImages(image);
                          setShowImageDialog(false);
                        }}>
                        Velg
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Options Dialog (Mobile) */}
      <Dialog open={showCameraOptions} onOpenChange={setShowCameraOptions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Legg til bilde</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 justify-start"
              onClick={() => {
                cameraInputRef.current?.click();
                setShowCameraOptions(false);
              }}>
              <Camera className="h-5 w-5" />
              Ta bilde nå
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 justify-start"
              onClick={() => {
                galleryInputRef.current?.click();
                setShowCameraOptions(false);
              }}>
              <Image className="h-5 w-5" />
              Velg fra galleri
            </Button>
            {projectId && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => {
                  setShowCameraOptions(false);
                  setShowImageDialog(true);
                }}>
                <FolderOpen className="h-5 w-5" />
                Hent fra bildedokumentasjon
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.file_url}
          onSave={handleImageEditSave}
          onCancel={() => setEditingImage(null)}
          open={!!editingImage}
        />
      )}
    </div>
  );
}