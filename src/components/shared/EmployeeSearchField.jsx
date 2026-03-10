import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

export default function EmployeeSearchField({ employees, value, onChange }) {
  const [search, setSearch] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setSearch(value?.name || '');
  }, [value?.name]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = employees.filter(e =>
    `${e.fornavn} ${e.etternavn}`.toLowerCase().includes(search.toLowerCase()) ||
    (e.epost || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const handleSelect = (emp) => {
    const name = `${emp.fornavn} ${emp.etternavn}`.trim();
    setSearch(name);
    setOpen(false);
    onChange({ name, email: emp.epost || '', phone: emp.mobil || emp.telefon || '' });
  };

  const handleManualChange = (e) => {
    setSearch(e.target.value);
    setOpen(true);
    onChange({ name: e.target.value, email: value?.email || '', phone: value?.phone || '' });
  };

  return (
    <div className="space-y-3">
      <div ref={ref} className="relative">
        <Label>Navn</Label>
        <Input
          value={search}
          onChange={handleManualChange}
          onFocus={() => setOpen(true)}
          placeholder="Søk ansatt eller skriv inn navn..."
          className="mt-1.5 rounded-xl"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {filtered.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{emp.fornavn} {emp.etternavn}</p>
                  {emp.epost && <p className="text-xs text-slate-500">{emp.epost}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>E-post</Label>
          <Input
            type="email"
            value={value?.email || ''}
            onChange={(e) => onChange({ name: search, email: e.target.value, phone: value?.phone || '' })}
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input
            value={value?.phone || ''}
            onChange={(e) => onChange({ name: search, email: value?.email || '', phone: e.target.value })}
            className="mt-1.5 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}