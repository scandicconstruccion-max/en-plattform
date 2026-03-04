import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export default function CancelModuleDialog({ module, open, onCancel, onConfirm, loading }) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg">Avbestille modul?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-slate-600 space-y-3 pt-1">
              <p>Hvis du avbestiller <span className="font-semibold text-slate-900">{module?.name}</span>:</p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  Tilgangen fjernes umiddelbart
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  Du mottar kreditnota for gjenværende periode
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  Modulen blir utilgjengelig for alle brukere i firmaet
                </li>
              </ul>
              <p className="text-sm font-medium text-slate-700">Er du sikker på at du vil fortsette?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="rounded-xl">Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            {loading ? 'Avbestiller...' : 'Bekreft avbestilling'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}