import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const categoryLabels = {
  'tømrer': '🪵 Tømrer',
  'betong': '🏗️ Betongarbeider',
  'blikkenslager': '🔩 Blikkenslager',
  'elektrikker': '⚡ Elektrikker',
  'maler': '🖌️ Maler',
  'membranlegger': '🛡️ Membranlegger',
  'murerer': '🧱 Murerer',
  'rørlegger': '🔧 Rørlegger',
  'sveiser': '🔥 Sveiser',
  'tak': '🏠 Taktekker',
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

  // Calculate total items in a template (from sections or legacy items)
  const getItemCount = (template) => {
    if (template.sections && template.sections.length > 0) {
      return template.sections.reduce((sum, section) => sum + (section.items?.length || 0), 0);
    }
    return template.items?.length || 0;
  };

  // Group templates by category and sort alphabetically within each group
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'annet';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  // Sort categories alphabetically by label, templates within each category alphabetically
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => 
    (categoryLabels[a] || a).localeCompare(categoryLabels[b] || b)
  );

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 px-1">{categoryLabels[category] || category}</h3>
          <div className="space-y-2">
            {groupedTemplates[category]
              .sort((a, b) => (a.name || '').localeCompare(b.name))
              .map((template) => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors border hover:border-emerald-300"
                  onClick={() => onSelect(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      {template.description && (
                        <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
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
        </div>
      ))}
    </div>
  );
}