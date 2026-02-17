import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { key: 'prosjekter', label: 'Prosjekter', icon: Building2, page: 'Prosjekter' },
  { key: 'avvik', label: 'Avvik', icon: AlertTriangle, page: 'Avvik' },
];

export default function BottomNav({ currentPageName }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.key}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full select-none transition-colors",
                isActive 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-emerald-600 dark:text-emerald-400")} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}