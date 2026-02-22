import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const categoryLabels = {
  'tømrer': '🪵 Tømrer',
  'betong': '🏗️ Betong',
  'tak': '🏠 Tak',
  'våtrom': '💧 Våtrom',
  'internkontroll': '✓ Internkontroll',
  'overtakelse': '🎯 Overtakelse',
  'hms': '⚠️ HMS',
  'kvalitet': '🔍 Kvalitet',
  'annet': '📋 Annet'
};

export default function TemplateSelector({ templates, onSelect, isLoading }) {
  if (isLoading) {
    return <div className="text-center py-8">Laster maler...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Ingen maler tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="p-4 cursor-pointer hover:bg-slate-50 transition-colors border hover:border-emerald-300"
          onClick={() => onSelect(template)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-slate-600 mt-1">{template.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>{categoryLabels[template.category] || template.category}</span>
                <span>{template.items?.length || 0} punkter</span>
                <span>v{template.version}</span>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 ml-4">
              Bruk
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}