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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {showBack &&
            <Button
              variant="ghost"
              size="icon"
              onClick={() => backUrl ? navigate(backUrl) : navigate(-1)}
              className="rounded-xl flex-shrink-0 mt-0.5">

                <ArrowLeft className="h-5 w-5" />
              </Button>
            }
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 break-words">{title}</h1>
              

            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            {onAdd &&
            <Button
              onClick={onAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 flex-shrink-0">

                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            }
          </div>
        </div>
      </div>
    </div>);

}