import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { FileText, Download, CheckCircle2, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function GenerateFDVDialog({ open, onClose, project }) {
  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState({
    includeBefore: true,
    includeDuring: true,
    includeAfter: true,
    includeDeviations: true,
    includeChanges: true,
    onlyApprovedChanges: true,
    format: 'pdf' // 'pdf' or 'zip'
  });

  const queryClient = useQueryClient();

  // Fetch all relevant data
  const { data: images = [] } = useQuery({
    queryKey: ['projectImages', project?.id],
    queryFn: () => base44.entities.ImageDoc.filter({ project_id: project.id }),
    enabled: !!project?.id && open
  });

  const { data: deviations = [] } = useQuery({
    queryKey: ['projectDeviations', project?.id],
    queryFn: () => base44.entities.Deviation.filter({ project_id: project.id }),
    enabled: !!project?.id && open
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['projectChanges', project?.id],
    queryFn: () => base44.entities.ChangeNotification.filter({ project_id: project.id }),
    enabled: !!project?.id && open
  });

  const { data: projectFiles = [] } = useQuery({
    queryKey: ['projectFiles', project?.id],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: project.id }),
    enabled: !!project?.id && open
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['projectQuotes', project?.id],
    queryFn: () => base44.entities.Quote.filter({ project_id: project.id }),
    enabled: !!project?.id && open
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: open
  });

  const createFDVMutation = useMutation({
    mutationFn: async (fdvData) => {
      return await base44.entities.FDVPackage.create(fdvData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvPackages'] });
      toast.success('FDV-dokumentasjon opprettet');
    }
  });

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const company = companies[0];
      const currentUser = await base44.auth.me();

      // Filter images based on selected options
      const selectedImages = images.filter(img => {
        if (img.category === 'for_arbeid' && !options.includeBefore) return false;
        if (img.category === 'under_arbeid' && !options.includeDuring) return false;
        if (img.category === 'ferdigstilt' && !options.includeAfter) return false;
        if (img.category === 'avvik' && !options.includeDeviations) return false;
        if (img.category === 'endringsarbeid' && !options.includeChanges) return false;
        return true;
      });

      // Filter deviations
      const selectedDeviations = options.includeDeviations ? deviations : [];

      // Filter changes (only approved if option selected)
      const selectedChanges = options.includeChanges 
        ? (options.onlyApprovedChanges 
            ? changes.filter(c => c.status === 'godkjent') 
            : changes)
        : [];

      // Create FDV Package
      const fdvPackage = await createFDVMutation.mutateAsync({
        project_id: project.id,
        project_name: project.name,
        customer_name: project.client_name,
        customer_email: project.client_email,
        status: 'klar_for_overlevering',
        description: `Automatisk generert FDV-dokumentasjon for ${project.name}`,
        delivery_date: new Date().toISOString(),
        approval_token: `fdv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Create FDV Documents from images
      const imageDocPromises = selectedImages.map(img => 
        base44.entities.FDVDocument.create({
          fdv_package_id: fdvPackage.id,
          category: getCategoryForFDV(img.category),
          name: img.title,
          description: img.description || '',
          file_url: img.image_url,
          source_type: 'image_doc',
          source_id: img.id
        })
      );

      // Create FDV Documents from project files
      const fileDocPromises = projectFiles
        .filter(f => f.description?.toLowerCase().includes('produktdatablad') || 
                     f.description?.toLowerCase().includes('samsvar') ||
                     f.description?.toLowerCase().includes('garanti'))
        .map(file => 
          base44.entities.FDVDocument.create({
            fdv_package_id: fdvPackage.id,
            category: getCategoryFromFileName(file.name),
            name: file.name,
            description: file.description || '',
            file_url: file.file_url,
            source_type: 'project_file',
            source_id: file.id
          })
        );

      // Create FDV Documents from deviations
      const deviationDocPromises = selectedDeviations.map(dev => 
        base44.entities.FDVDocument.create({
          fdv_package_id: fdvPackage.id,
          category: 'sluttrapport',
          name: `Avvik: ${dev.title}`,
          description: dev.description,
          file_url: dev.images?.[0] || '',
          source_type: 'manual',
          source_id: dev.id
        })
      );

      await Promise.all([
        ...imageDocPromises,
        ...fileDocPromises,
        ...deviationDocPromises
      ]);

      // Log the generation
      await base44.analytics.track({
        eventName: 'fdv_generated',
        properties: {
          project_id: project.id,
          project_name: project.name,
          images_count: selectedImages.length,
          deviations_count: selectedDeviations.length,
          changes_count: selectedChanges.length,
          format: options.format,
          generated_by: currentUser.email,
          version: 1
        }
      });

      toast.success('FDV-dokumentasjon generert!', {
        description: `${selectedImages.length} bilder, ${projectFiles.length} dokumenter inkludert`,
        duration: 5000
      });

      onClose(fdvPackage.id);
    } catch (error) {
      console.error('Failed to generate FDV:', error);
      toast.error('Kunne ikke generere FDV-dokumentasjon');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryForFDV = (imageCategory) => {
    const mapping = {
      'for_arbeid': 'ferdigbilder',
      'under_arbeid': 'ferdigbilder',
      'ferdigstilt': 'ferdigbilder',
      'avvik': 'sluttrapport',
      'endringsarbeid': 'sluttrapport',
      'dokumentasjon': 'ferdigbilder'
    };
    return mapping[imageCategory] || 'ferdigbilder';
  };

  const getCategoryFromFileName = (fileName) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('produktdatablad') || lower.includes('datasheet')) return 'produktdatablad';
    if (lower.includes('samsvar') || lower.includes('doc')) return 'samsvarserkl\u00e6ring';
    if (lower.includes('garanti') || lower.includes('warranty')) return 'garantibevis';
    if (lower.includes('tegning') || lower.includes('drawing')) return 'tegning';
    return 'brukermanual';
  };

  // Calculate what will be included
  const beforeCount = images.filter(i => i.category === 'for_arbeid').length;
  const duringCount = images.filter(i => i.category === 'under_arbeid').length;
  const afterCount = images.filter(i => i.category === 'ferdigstilt').length;
  const deviationCount = deviations.length;
  const changeCount = options.onlyApprovedChanges 
    ? changes.filter(c => c.status === 'godkjent').length 
    : changes.length;

  const totalItems = 
    (options.includeBefore ? beforeCount : 0) +
    (options.includeDuring ? duringCount : 0) +
    (options.includeAfter ? afterCount : 0) +
    (options.includeDeviations ? deviationCount : 0) +
    (options.includeChanges ? changeCount : 0) +
    projectFiles.length;

  return (
    <Dialog open={open} onOpenChange={() => !generating && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Generer FDV-dokumentasjon
          </DialogTitle>
          <DialogDescription>
            Samle all prosjektdokumentasjon automatisk i en FDV-pakke
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Prosjekt</h4>
            <p className="text-sm text-slate-600">{project?.name}</p>
            <p className="text-sm text-slate-500">{project?.client_name}</p>
          </div>

          {/* Phase Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Velg faser å inkludere</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="before"
                    checked={options.includeBefore}
                    onCheckedChange={(checked) => setOptions({ ...options, includeBefore: checked })}
                  />
                  <Label htmlFor="before" className="cursor-pointer">
                    Før arbeid
                  </Label>
                </div>
                <span className="text-sm text-slate-500">{beforeCount} bilder</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="during"
                    checked={options.includeDuring}
                    onCheckedChange={(checked) => setOptions({ ...options, includeDuring: checked })}
                  />
                  <Label htmlFor="during" className="cursor-pointer">
                    Under arbeid
                  </Label>
                </div>
                <span className="text-sm text-slate-500">{duringCount} bilder</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="after"
                    checked={options.includeAfter}
                    onCheckedChange={(checked) => setOptions({ ...options, includeAfter: checked })}
                  />
                  <Label htmlFor="after" className="cursor-pointer">
                    Ferdigstilt arbeid
                  </Label>
                </div>
                <span className="text-sm text-slate-500">{afterCount} bilder</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="deviations"
                    checked={options.includeDeviations}
                    onCheckedChange={(checked) => setOptions({ ...options, includeDeviations: checked })}
                  />
                  <Label htmlFor="deviations" className="cursor-pointer">
                    Avvik
                  </Label>
                </div>
                <span className="text-sm text-slate-500">{deviationCount} avvik</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="changes"
                    checked={options.includeChanges}
                    onCheckedChange={(checked) => setOptions({ ...options, includeChanges: checked })}
                  />
                  <Label htmlFor="changes" className="cursor-pointer">
                    Endringsarbeid
                  </Label>
                </div>
                <span className="text-sm text-slate-500">{changeCount} endringer</span>
              </div>

              {options.includeChanges && (
                <div className="ml-6 flex items-center gap-2">
                  <Checkbox
                    id="approvedOnly"
                    checked={options.onlyApprovedChanges}
                    onCheckedChange={(checked) => setOptions({ ...options, onlyApprovedChanges: checked })}
                  />
                  <Label htmlFor="approvedOnly" className="text-sm cursor-pointer">
                    Kun godkjente endringer
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold">Totalt</span>
              </div>
              <span className="text-lg font-bold text-emerald-700">
                {totalItems} elementer
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Dokumentasjonen vil bli lagret og kan sendes til kunde for godkjenning
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={generating}
            className="rounded-xl">
            Avbryt
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || totalItems === 0}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Genererer...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generer FDV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}