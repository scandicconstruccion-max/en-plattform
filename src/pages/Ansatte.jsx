import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Users, Search, Mail, Phone, MapPin, Briefcase, Calendar, Edit, Trash2, DollarSign, Lock, Plus, X, Camera } from 'lucide-react';
import { AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Ansatte() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    birth_date: '',
    position: '',
    department: '',
    employment_type: 'fast',
    start_date: '',
    end_date: '',
    hourly_rate: '',
    monthly_salary: '',
    overtime_50_rate: '',
    overtime_100_rate: '',
    normal_hours_per_day: 8,
    normal_hours_per_week: 40,
    bank_account: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    is_active: true,
    competencies: []
  });
  const [competencyInput, setCompetencyInput] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => base44.entities.Competency.filter({ is_active: true }),
    initialData: []
  });

  const isAdmin = user?.role === 'admin';
  const canViewSalary = isAdmin;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setSelectedEmployee(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      city: '',
      birth_date: '',
      position: '',
      department: '',
      employment_type: 'fast',
      start_date: '',
      end_date: '',
      hourly_rate: '',
      monthly_salary: '',
      overtime_50_rate: '',
      overtime_100_rate: '',
      normal_hours_per_day: 8,
      normal_hours_per_week: 40,
      bank_account: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
      is_active: true,
      competencies: []
    });
    setCompetencyInput('');
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      address: employee.address || '',
      postal_code: employee.postal_code || '',
      city: employee.city || '',
      birth_date: employee.birth_date || '',
      position: employee.position || '',
      department: employee.department || '',
      employment_type: employee.employment_type || 'fast',
      start_date: employee.start_date || '',
      end_date: employee.end_date || '',
      hourly_rate: employee.hourly_rate || '',
      monthly_salary: employee.monthly_salary || '',
      overtime_50_rate: employee.overtime_50_rate || '',
      overtime_100_rate: employee.overtime_100_rate || '',
      normal_hours_per_day: employee.normal_hours_per_day || 8,
      normal_hours_per_week: employee.normal_hours_per_week || 40,
      bank_account: employee.bank_account || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      notes: employee.notes || '',
      is_active: employee.is_active !== false,
      competencies: employee.competencies || []
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const hourlyRate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
    const overtime50 = formData.overtime_50_rate ? parseFloat(formData.overtime_50_rate) : (hourlyRate ? hourlyRate * 1.5 : null);
    const overtime100 = formData.overtime_100_rate ? parseFloat(formData.overtime_100_rate) : (hourlyRate ? hourlyRate * 2.0 : null);

    const data = {
      ...formData,
      hourly_rate: hourlyRate,
      monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
      overtime_50_rate: overtime50,
      overtime_100_rate: overtime100,
      normal_hours_per_day: formData.normal_hours_per_day || 8,
      normal_hours_per_week: formData.normal_hours_per_week || 40
    };

    // Loggfør lønnsendring
    if (selectedEmployee && hourlyRate && selectedEmployee.hourly_rate !== hourlyRate) {
      const history = selectedEmployee.salary_change_history || [];
      data.salary_change_history = [
        ...history,
        {
          date: new Date().toISOString(),
          old_hourly_rate: selectedEmployee.hourly_rate,
          new_hourly_rate: hourlyRate,
          changed_by: user?.email || 'unknown',
          note: `Timelønn endret fra ${selectedEmployee.hourly_rate} kr til ${hourlyRate} kr`
        }
      ];
    }

    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
           e.email?.toLowerCase().includes(search.toLowerCase()) ||
           e.position?.toLowerCase().includes(search.toLowerCase());
  });

  const employmentTypeLabels = {
    fast: 'Fast ansatt',
    midlertidig: 'Midlertidig',
    vikar: 'Vikar',
    laerling: 'Lærling',
    deltid: 'Deltid'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Ansatte"
        subtitle={`${employees.length} ansatte registrert`}
        onAdd={() => {
          resetForm();
          setSelectedEmployee(null);
          setShowDialog(true);
        }}
        addLabel="Ny ansatt"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk etter ansatt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {/* Employees List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ingen ansatte"
            description="Registrer ansatte for å holde oversikt over teamet"
            actionLabel="Registrer ansatt"
            onAction={() => {
              resetForm();
              setSelectedEmployee(null);
              setShowDialog(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-6 border-0 shadow-sm dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-lg">
                        {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      {employee.position && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{employee.position}</p>
                      )}
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full mt-1 inline-block",
                        employee.is_active !== false
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {employee.is_active !== false ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(employee)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(employee.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {employee.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${employee.email}`} className="hover:text-emerald-600">{employee.email}</a>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${employee.phone}`} className="hover:text-emerald-600">{employee.phone}</a>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Briefcase className="h-4 w-4" />
                      {employee.department}
                    </div>
                  )}
                  {employee.start_date && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      Ansatt fra {format(new Date(employee.start_date), 'd. MMM yyyy', { locale: nb })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Rediger ansatt' : 'Registrer ansatt'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personalia</TabsTrigger>
                <TabsTrigger value="employment">Ansettelse</TabsTrigger>
                <TabsTrigger value="competencies">Kompetanser</TabsTrigger>
                {canViewSalary && <TabsTrigger value="salary">Lønn</TabsTrigger>}
              </TabsList>

              <TabsContent value="personal" className="space-y-6 mt-6">
                {/* Personal Info */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Personalia</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fornavn *</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        required
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Etternavn *</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        required
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>E-post *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Fødselsdato</Label>
                      <Input
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Adresse</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <Label>Gateadresse</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Postnummer</Label>
                      <Input
                        value={formData.postal_code}
                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Sted</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Nødkontakt</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Navn</Label>
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-6 mt-6">
                {/* Employment */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Ansettelsesforhold</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Stilling</Label>
                      <Input
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        placeholder="f.eks. Prosjektleder"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Avdeling</Label>
                      <Input
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Ansettelsestype</Label>
                      <Select 
                        value={formData.employment_type} 
                        onValueChange={(v) => setFormData({...formData, employment_type: v})}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">Fast ansatt</SelectItem>
                          <SelectItem value="midlertidig">Midlertidig</SelectItem>
                          <SelectItem value="vikar">Vikar</SelectItem>
                          <SelectItem value="laerling">Lærling</SelectItem>
                          <SelectItem value="deltid">Deltid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Startdato</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Info */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Bankinformasjon</h4>
                  <div>
                    <Label>Kontonummer</Label>
                    <Input
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                      placeholder="1234 56 78901"
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notater</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </TabsContent>

              <TabsContent value="competencies" className="space-y-6 mt-6">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Kompetanser</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Definer hvilke kompetanser denne ansatte har for ressursplanlegging
                  </p>
                  
                  {/* Add new competency */}
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.competencies.includes(value)) {
                        setFormData({
                          ...formData,
                          competencies: [...formData.competencies, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Velg kompetanse fra listen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competencies
                        .filter(c => !formData.competencies.includes(c.name))
                        .map((comp) => (
                          <SelectItem key={comp.id} value={comp.name}>
                            {comp.name}
                          </SelectItem>
                        ))
                      }
                      {competencies.filter(c => !formData.competencies.includes(c.name)).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-slate-500">
                          Alle kompetanser er valgt
                        </div>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Display competencies */}
                  {formData.competencies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {formData.competencies.map((comp, idx) => (
                        <Badge
                          key={idx}
                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 text-sm flex items-center gap-2"
                        >
                          {comp}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                competencies: formData.competencies.filter((_, i) => i !== idx)
                              });
                            }}
                            className="hover:text-emerald-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-4">
                      Ingen kompetanser lagt til ennå
                    </p>
                  )}
                </div>
              </TabsContent>

              {canViewSalary && (
                <TabsContent value="salary" className="space-y-6 mt-6">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Begrenset tilgang</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Kun administratorer kan se og redigere lønnsinnstillinger
                      </p>
                    </div>
                  </div>

                  {/* Salary Info */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">Lønnsinformasjon</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Timelønn (kr) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.hourly_rate}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value);
                            setFormData({
                              ...formData, 
                              hourly_rate: e.target.value,
                              overtime_50_rate: rate ? (rate * 1.5).toFixed(2) : '',
                              overtime_100_rate: rate ? (rate * 2.0).toFixed(2) : ''
                            });
                          }}
                          className="mt-1.5 rounded-xl"
                        />
                        <p className="text-xs text-slate-500 mt-1">Grunnlag for overtidsberegning</p>
                      </div>
                      <div>
                        <Label>Månedslønn (kr)</Label>
                        <Input
                          type="number"
                          value={formData.monthly_salary}
                          onChange={(e) => setFormData({...formData, monthly_salary: e.target.value})}
                          className="mt-1.5 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overtime Rates */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">Overtidssatser</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Overtid 50% (kr)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.overtime_50_rate}
                          onChange={(e) => setFormData({...formData, overtime_50_rate: e.target.value})}
                          className="mt-1.5 rounded-xl"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Standard: {formData.hourly_rate ? (parseFloat(formData.hourly_rate) * 1.5).toFixed(2) : '0'} kr
                        </p>
                      </div>
                      <div>
                        <Label>Overtid 100% (kr)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.overtime_100_rate}
                          onChange={(e) => setFormData({...formData, overtime_100_rate: e.target.value})}
                          className="mt-1.5 rounded-xl"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Standard: {formData.hourly_rate ? (parseFloat(formData.hourly_rate) * 2.0).toFixed(2) : '0'} kr
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Normal Working Hours */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">Arbeidstid</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Normal arbeidstid per dag (timer)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.normal_hours_per_day}
                          onChange={(e) => setFormData({...formData, normal_hours_per_day: parseFloat(e.target.value)})}
                          className="mt-1.5 rounded-xl"
                        />
                        <p className="text-xs text-slate-500 mt-1">Timer over dette regnes som overtid</p>
                      </div>
                      <div>
                        <Label>Normal arbeidstid per uke (timer)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.normal_hours_per_week}
                          onChange={(e) => setFormData({...formData, normal_hours_per_week: parseFloat(e.target.value)})}
                          className="mt-1.5 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Salary History */}
                  {selectedEmployee?.salary_change_history && selectedEmployee.salary_change_history.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-3">Endringshistorikk</h4>
                      <div className="space-y-2">
                        {selectedEmployee.salary_change_history.slice().reverse().map((change, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {change.old_hourly_rate} kr → {change.new_hourly_rate} kr
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {format(new Date(change.date), 'd. MMM yyyy', { locale: nb })}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Endret av: {change.changed_by}
                            </p>
                            {change.note && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{change.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Lagrer...' : selectedEmployee ? 'Oppdater' : 'Registrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}