import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EmployeeSearchField({ employees, value, onChange }) {
  const selectedId = employees.find(e =>
    `${e.first_name} ${e.last_name}`.trim() === value?.name && e.email === value?.email
  )?.id || '';

  const handleSelect = (id) => {
    if (id === '__clear__') {
      onChange({ name: '', email: '', phone: '' });
      return;
    }
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    onChange({
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      email: emp.email || '',
      phone: emp.phone || ''
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Velg ansatt</Label>
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="mt-1.5 rounded-xl">
            <SelectValue placeholder="Velg prosjektleder..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">— Ingen —</SelectItem>
            {employees.filter(e => e.is_active !== false).map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
                {emp.position ? ` – ${emp.position}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value?.name && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>E-post</Label>
            <Input value={value.email || ''} readOnly className="mt-1.5 rounded-xl bg-slate-50" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={value.phone || ''} readOnly className="mt-1.5 rounded-xl bg-slate-50" />
          </div>
        </div>
      )}
    </div>
  );
}