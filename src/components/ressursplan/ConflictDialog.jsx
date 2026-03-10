import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ConflictDialog({ 
  open, 
  onOpenChange, 
  conflicts, 
  onConfirm,
  resourceName 
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            ⚠️ Planleggingskonflikt oppdaget
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {resourceName && <><strong>{resourceName}</strong> eller en tilknyttet maskin er</>}
              {!resourceName && <>En ressurs er</>} allerede planlagt i dette tidsrommet:
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-medium text-amber-900">{conflict.prosjekt_navn}</p>
                  <p className="text-amber-700">
                    {format(parseISO(conflict.start_dato_tid), 'dd.MM.yyyy HH:mm', { locale: nb })} - {format(parseISO(conflict.slutt_dato_tid), 'dd.MM.yyyy HH:mm', { locale: nb })}
                  </p>
                  {conflict.rolle_pa_prosjekt && (
                    <p className="text-amber-600 text-xs">Rolle: {conflict.rolle_pa_prosjekt}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-slate-600">
              Vil du fortsette likevel? Konflikten vil bli loggført i systemet.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Fortsett likevel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}