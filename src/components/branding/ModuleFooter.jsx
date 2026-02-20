import React from 'react';
import { PuzzleHouseIcon } from './BrandBanner';
import { cn } from '@/lib/utils';

export default function ModuleFooter({ className }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-3 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50",
      className
    )}>
      <PuzzleHouseIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs text-slate-500 dark:text-slate-400 italic">
        Av håndverkeren, for håndverkeren
      </span>
      <PuzzleHouseIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}