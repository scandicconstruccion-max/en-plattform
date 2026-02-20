import React from 'react';
import { PuzzleHouseIcon } from './BrandBanner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function BrandTooltip({ children, content }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{content}</p>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <PuzzleHouseIcon className="w-3 h-3 text-emerald-600" />
              <p className="text-xs text-slate-500 italic">
                Laget med tanke på håndverkeren
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}