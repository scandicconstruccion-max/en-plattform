import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Ny',
  showBack = false,
  backUrl,
  actions
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {showBack &&
            <Button
              variant="ghost"
              size="icon"
              onClick={() => backUrl ? navigate(backUrl) : navigate(-1)}
              className="rounded-xl flex-shrink-0">

                <ArrowLeft className="h-5 w-5" />
              </Button>
            }
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              

            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto">
            {actions}
            {onAdd &&
            <Button
              onClick={onAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 flex-1 lg:flex-none">

                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            }
          </div>
        </div>
      </div>
    </div>);

}