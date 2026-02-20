import React from 'react';
import { PuzzleHouseIcon } from './BrandBanner';
import { cn } from '@/lib/utils';

export default function ModuleFooter({ className }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-2 px-4 border-t border-slate-100 dark:border-slate-800",
      className
    )}>
      <PuzzleHouseIcon className="w-3 h-3 text-slate-400 dark:text-slate-600" />
      <span className="text-xs text-slate-400 dark:text-slate-600 italic">
        Av håndverkeren, for håndverkeren
      </span>
    </div>
  );
}