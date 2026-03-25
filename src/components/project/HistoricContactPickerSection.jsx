import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

/**
 * type: 'subcontractor' | 'architect' | 'consultant'
 * items: current array
 * onChange: (newArray) => void
 * currentProjectId: exclude current project from history
 */
export default function HistoricContactPickerSection({ type, items, onChange, currentProjectId }) {
  const [selectKey, setSelectKey] = useState(0);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => base44.entities.Project.list(),
  });

  // Collect unique past entries from all other projects
  const historicOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const p of allProjects) {
      if (p.id === currentProjectId) continue;
      const list = type === 'subcontractor' ? p.subcontractors
                 : type === 'architect'    ? p.architects
                 :                           p.consultants;
      for (const entry of list || []) {
        const key = type === 'subcontractor' ? entry.name
                  : entry.company;
        if (key && !seen.has(key)) {
          seen.add(key);
          opts.push(entry);
        }
      }
    }
    return opts;
  }, [allProjects, currentProjectId, type]);

  const emptyItem = type === 'subcontractor'
    ? { name: '', trade: '', contact_person: '', phone: '', email: '' }
    : type === 'architect'
    ? { company: '', contact_person: '', phone: '', email: '' }
    : { company: '', discipline: '', contact_person: '', phone: '', email: '' };

  const addBlank = () => onChange([...items, { ...emptyItem }]);

  const addFromHistory = (index) => {
    const entry = historicOptions[parseInt(index)];
    if (!entry) return;
    onChange([...items, { ...entry }]);
    setSelectKey(k => k + 1);
  };

  const update = (i, field, value) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  const label = type === 'subcontractor' ? 'Underentreprenører'
              : type === 'architect'     ? 'Arkitekter'
              :                            'Rådgivende ingeniører';

  return (
    <div>
      <h4 className="font-medium text-slate-900 mb-2">{label}</h4>
      <div className="flex flex-wrap gap-2 mb-3">
        {historicOptions.length > 0 && (
          <Select key={selectKey} onValueChange={addFromHistory}>
            <SelectTrigger className="h-8 rounded-xl text-xs w-44">
              <SelectValue placeholder="Hent tidligere..." />
            </SelectTrigger>
            <SelectContent>
              {historicOptions.map((opt, i) => (
                <SelectItem key={i} value={String(i)}>
                  {type === 'subcontractor' ? opt.name : opt.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addBlank} className="rounded-xl whitespace-nowrap">
          <Plus className="h-4 w-4 mr-1" /> Legg til
        </Button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="mb-2 p-3 bg-slate-50 rounded-xl relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            className="absolute top-2 right-2 text-red-400 hover:text-red-600 h-7 w-7"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {type === 'subcontractor' && (
            <div className="flex flex-col gap-2 pr-8">
              <Input placeholder="Firma" value={item.name} onChange={e => update(index, 'name', e.target.value)} className="rounded-lg" />
              <Input placeholder="Fag" value={item.trade} onChange={e => update(index, 'trade', e.target.value)} className="rounded-lg" />
              <Input placeholder="Kontaktperson" value={item.contact_person} onChange={e => update(index, 'contact_person', e.target.value)} className="rounded-lg" />
              <Input placeholder="Telefon" value={item.phone} onChange={e => update(index, 'phone', e.target.value)} className="rounded-lg" />
              <Input placeholder="E-post" value={item.email} onChange={e => update(index, 'email', e.target.value)} className="rounded-lg" />
            </div>
          )}
          {type === 'architect' && (
            <div className="flex flex-col gap-2 pr-8">
              <Input placeholder="Firma" value={item.company} onChange={e => update(index, 'company', e.target.value)} className="rounded-lg" />
              <Input placeholder="Kontaktperson" value={item.contact_person} onChange={e => update(index, 'contact_person', e.target.value)} className="rounded-lg" />
              <Input placeholder="Telefon" value={item.phone} onChange={e => update(index, 'phone', e.target.value)} className="rounded-lg" />
              <Input placeholder="E-post" value={item.email} onChange={e => update(index, 'email', e.target.value)} className="rounded-lg" />
            </div>
          )}
          {type === 'consultant' && (
            <div className="flex flex-col gap-2 pr-8">
              <Input placeholder="Firma" value={item.company} onChange={e => update(index, 'company', e.target.value)} className="rounded-lg" />
              <Input placeholder="Fagområde" value={item.discipline} onChange={e => update(index, 'discipline', e.target.value)} className="rounded-lg" />
              <Input placeholder="Kontaktperson" value={item.contact_person} onChange={e => update(index, 'contact_person', e.target.value)} className="rounded-lg" />
              <Input placeholder="Telefon" value={item.phone} onChange={e => update(index, 'phone', e.target.value)} className="rounded-lg" />
              <Input placeholder="E-post" value={item.email} onChange={e => update(index, 'email', e.target.value)} className="rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}