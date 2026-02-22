import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'crypto-js';

const categories = {
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

export default function TemplateEditor({ template, onSave, onCancel }) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'annet');
  const [sections, setSections] = useState(template?.sections || []);
  const [customFields, setCustomFields] = useState(template?.custom_fields || []);

  const handleAddSection = () => {
    const newSection = {
      title: 'Ny seksjon',
      description: '',
      order: sections.length,
      items: []
    };
    setSections([...sections, newSection]);
  };

  const handleAddItem = (sectionIdx) => {
    const newSections = [...sections];
    newSections[sectionIdx].items = newSections[sectionIdx].items || [];
    newSections[sectionIdx].items.push({
      order: newSections[sectionIdx].items.length,
      title: 'Nytt sjekkpunkt',
      description: '',
      required: true,
      allow_image: true,
      allow_comment: true
    });
    setSections(newSections);
  };

  const handleUpdateSection = (idx, field, value) => {
    const newSections = [...sections];
    newSections[idx] = { ...newSections[idx], [field]: value };
    setSections(newSections);
  };

  const handleUpdateItem = (sectionIdx, itemIdx, field, value) => {
    const newSections = [...sections];
    newSections[sectionIdx].items[itemIdx] = {
      ...newSections[sectionIdx].items[itemIdx],
      [field]: value
    };
    setSections(newSections);
  };

  const handleDeleteSection = (idx) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const handleDeleteItem = (sectionIdx, itemIdx) => {
    const newSections = [...sections];
    newSections[sectionIdx].items = newSections[sectionIdx].items.filter((_, i) => i !== itemIdx);
    setSections(newSections);
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, {
      id: uuidv4?.() || `field_${Date.now()}`,
      label: 'Nytt felt',
      field_type: 'text',
      required: false,
      order: customFields.length
    }]);
  };

  const handleUpdateCustomField = (idx, field, value) => {
    const newFields = [...customFields];
    newFields[idx] = { ...newFields[idx], [field]: value };
    setCustomFields(newFields);
  };

  const handleDeleteCustomField = (idx) => {
    setCustomFields(customFields.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      description,
      category,
      sections,
      custom_fields: customFields,
      version: template?.version || 1,
      is_active: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grunnleggende info */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Navn *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. Kvalitetskontroll Våtrom"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Beskrivelse</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse av malen..."
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Kategori *</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categories).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seksjoner og punkter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Seksjoner og sjekkpunkter</h3>
          <Button
            type="button"
            onClick={handleAddSection}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Legg til seksjon
          </Button>
        </div>

        <div className="space-y-4">
          {sections.map((section, secIdx) => (
            <Card key={secIdx} className="p-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={section.title}
                    onChange={(e) => handleUpdateSection(secIdx, 'title', e.target.value)}
                    placeholder="Seksjonstittel"
                    className="font-semibold"
                  />
                  <Textarea
                    value={section.description || ''}
                    onChange={(e) => handleUpdateSection(secIdx, 'description', e.target.value)}
                    placeholder="Seksjons beskrivelse"
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleDeleteSection(secIdx)}
                  variant="ghost"
                  className="text-red-500 h-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Items i seksjonen */}
              <div className="ml-4 space-y-2 border-l-2 border-slate-200 pl-4">
                {section.items?.map((item, itemIdx) => (
                  <Card key={itemIdx} className="p-3 bg-slate-50 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.title}
                          onChange={(e) => handleUpdateItem(secIdx, itemIdx, 'title', e.target.value)}
                          placeholder="Sjekkpunkt"
                        />
                        <Textarea
                          value={item.description || ''}
                          onChange={(e) => handleUpdateItem(secIdx, itemIdx, 'description', e.target.value)}
                          placeholder="Beskrivelse"
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleDeleteItem(secIdx, itemIdx)}
                        variant="ghost"
                        className="text-red-500 h-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={(checked) => handleUpdateItem(secIdx, itemIdx, 'required', checked)}
                        />
                        Påkrevd
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.allow_image}
                          onCheckedChange={(checked) => handleUpdateItem(secIdx, itemIdx, 'allow_image', checked)}
                        />
                        Tillat bilde
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.allow_comment}
                          onCheckedChange={(checked) => handleUpdateItem(secIdx, itemIdx, 'allow_comment', checked)}
                        />
                        Tillat kommentar
                      </label>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  onClick={() => handleAddItem(secIdx)}
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                >
                  <Plus className="h-4 w-4" />
                  Legg til punkt
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Egendefinerte felt */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Egendefinerte felt</h3>
          <Button
            type="button"
            onClick={handleAddCustomField}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Legg til felt
          </Button>
        </div>

        <div className="space-y-3">
          {customFields.map((field, idx) => (
            <Card key={idx} className="p-4 flex gap-3">
              <div className="flex-1 space-y-2">
                <Input
                  value={field.label}
                  onChange={(e) => handleUpdateCustomField(idx, 'label', e.target.value)}
                  placeholder="Feltets navn"
                />
                <Select value={field.field_type} onValueChange={(value) => handleUpdateCustomField(idx, 'field_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Tekst</SelectItem>
                    <SelectItem value="number">Tall</SelectItem>
                    <SelectItem value="date">Dato</SelectItem>
                    <SelectItem value="textarea">Lang tekst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <Checkbox
                    checked={field.required}
                    onCheckedChange={(checked) => handleUpdateCustomField(idx, 'required', checked)}
                  />
                  Påkrevd
                </label>
              </div>
              <Button
                type="button"
                onClick={() => handleDeleteCustomField(idx)}
                variant="ghost"
                className="text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Knapper */}
      <div className="flex gap-3 justify-end border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          Lagre mal
        </Button>
      </div>
    </form>
  );
}