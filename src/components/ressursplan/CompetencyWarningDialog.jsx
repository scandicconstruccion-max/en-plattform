import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CompetencyWarningDialog({ 
  open, 
  onOpenChange, 
  missingCompetencies = [], 
  resourceName, 
  onConfirm, 
  onCancel,
  canOverride = false
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Kompetanse mangler</DialogTitle>
              <DialogDescription>
                Ressursen mangler nødvendige kompetanser
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-700">
            <strong>{resourceName}</strong> mangler følgende kompetanse(r):
          </p>
          
          <div className="flex flex-wrap gap-2">
            {missingCompetencies.map((comp, idx) => (
              <Badge 
                key={idx}
                className="bg-orange-100 text-orange-700 px-3 py-1.5"
              >
                {comp}
              </Badge>
            ))}
          </div>

          {canOverride ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Du kan overstyre denne advarselen</strong> som administrator/prosjektleder.
                Overstyringen vil bli logget.
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">
                <strong>Kun administratorer og prosjektledere</strong> kan overstyre kompetansekrav.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="rounded-xl"
          >
            Avbryt
          </Button>
          {canOverride && (
            <Button 
              onClick={onConfirm}
              className="bg-orange-600 hover:bg-orange-700 rounded-xl"
            >
              Overstyr og fortsett
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}