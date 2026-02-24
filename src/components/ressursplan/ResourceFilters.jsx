import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function ResourceFilters({ 
  searchQuery, 
  onSearchChange,
  groupBy,
  onGroupByChange,
  filterType,
  onFilterTypeChange,
  departments = []
}) {
  return (
    <Card className="border-0 shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Label className="mb-2 block text-sm font-medium text-slate-700">Søk ressurs</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk på navn..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-sm font-medium text-slate-700">Ressurstype</Label>
          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle ressurser</SelectItem>
              <SelectItem value="employee">Kun ansatte</SelectItem>
              <SelectItem value="external">Kun eksterne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block text-sm font-medium text-slate-700">Gruppering</Label>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen gruppering</SelectItem>
              <SelectItem value="type">Gruppert etter type</SelectItem>
              <SelectItem value="department">Gruppert etter avdeling</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}