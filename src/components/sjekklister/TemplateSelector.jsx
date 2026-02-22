import React from 'react';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TemplateSelector({ templates, onSelect, isLoading }) {
  if (isLoading) {
    return <div className="text-center py-8">Laster maler...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Ingen sjekklistemaler tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          onClick={() => onSelect(template)}
          className="p-4 cursor-pointer hover:shadow-lg transition-all hover:bg-emerald-50 border-2 hover:border-emerald-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-slate-600 mt-1">{template.description}</p>
              )}
              <div className="flex gap-3 mt-3 text-xs text-slate-500">
                <span>📂 {template.category}</span>
                <span>📌 {template.items?.length || 0} punkter</span>
                <span>v{template.version}</span>
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              <Plus className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}