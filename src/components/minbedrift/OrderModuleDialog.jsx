import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ShoppingCart } from 'lucide-react';

export default function OrderModuleDialog({ module, open, onCancel, onConfirm, loading }) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-lg">Bestille modul?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600 space-y-2 pt-1">
            <p>Du er i ferd med å bestille modulen:</p>
            <p className="font-semibold text-slate-900 text-base">{module?.name}</p>
            <p className="text-sm text-slate-500">
              Fakturering skjer forskuddsvis for gjenværende periode frem til neste hovedforfall.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="rounded-xl">Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            {loading ? 'Behandler...' : 'Fortsett til betaling'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}