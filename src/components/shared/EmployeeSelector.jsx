import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from 'lucide-react';

export default function EmployeeSelector({ value, onChange, placeholder = "Velg ansatt", className }) {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              {employees.find(e => e.id === value)?.first_name} {employees.find(e => e.id === value)?.last_name}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="p-2 text-sm text-slate-500">Laster...</div>
        ) : employees.length === 0 ? (
          <div className="p-2 text-sm text-slate-500">Ingen ansatte registrert</div>
        ) : (
          employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {employee.first_name} {employee.last_name}
                {employee.position && <span className="text-slate-400">• {employee.position}</span>}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}