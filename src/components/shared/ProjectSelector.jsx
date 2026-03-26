import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Search } from 'lucide-react';

export default function ProjectSelector({ value, onChange, placeholder = "Velg prosjekt", className }) {
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              {projects.find(p => p.id === value)?.name || 'Velg prosjekt'}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400"
              placeholder="Søk prosjekt..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
        {isLoading ? (
          <SelectItem value="loading" disabled>Laster...</SelectItem>
        ) : filtered.length === 0 ? (
          <SelectItem value="none" disabled>Ingen treff</SelectItem>
        ) : (
          filtered.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                {project.name}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}