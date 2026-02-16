import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { CheckSquare, Search, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const checklistTemplates = [
  {
    name: 'HMS-sjekk',
    items: [
      'Verneutstyr på plass',
      'Førstehjelpsutstyr tilgjengelig',
      'Rømningsveier fri',
      'Brannslukker tilgjengelig',
      'Sikkerhetsskilt på plass'
    ]
  },
  {
    name: 'Kvalitetskontroll betong',
    items: [
      'Armering kontrollert',
      'Forskaling sikret',
      'Betongkvalitet verifisert',
      'Herdetid dokumentert',
      'Overflate godkjent'
    ]
  },
  {
    name: 'Oppstartsmøte',
    items: [
      'Prosjektplan gjennomgått',
      'HMS-gjennomgang',
      'Kontaktinformasjon delt',
      'Adkomst og riggområde avklart',
      'Tidsplan bekreftet'
    ]
  },
  {
    name: 'Egendefinert',
    items: []
  }
];

export default function Sjekklister() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedChecklists, setExpandedChecklists] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    template_name: '',
    items: []
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => base44.entities.Checklist.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Checklist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Checklist.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      project_id: '',
      template_name: '',
      items: []
    });
  };

  const handleTemplateSelect = (templateName) => {
    const template = checklistTemplates.find(t => t.name === templateName);
    if (template) {
      setFormData({
        ...formData,
        template_name: templateName,
        items: template.items.map(text => ({ text, checked: false, comment: '' }))
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { text: '', checked: false, comment: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      status: 'ikke_startet'
    });
  };

  const handleCheckItem = (checklist, itemIndex, checked) => {
    const newItems = [...checklist.items];
    newItems[itemIndex] = { ...newItems[itemIndex], checked };
    
    const allChecked = newItems.every(item => item.checked);
    const anyChecked = newItems.some(item => item.checked);
    
    let status = 'ikke_startet';
    if (allChecked) {
      status = 'fullfort';
    } else if (anyChecked) {
      status = 'pagarende';
    }

    updateMutation.mutate({
      id: checklist.id,
      data: {
        items: newItems,
        status,
        completed_date: allChecked ? new Date().toISOString().split('T')[0] : null,
        signed_by: allChecked ? user?.email : null
      }
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const getProgress = (items) => {
    if (!items?.length) return 0;
    return Math.round((items.filter(i => i.checked).length / items.length) * 100);
  };

  const toggleExpanded = (id) => {
    setExpandedChecklists(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChecklists = checklists.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Sjekklister"
        subtitle={`${checklists.length} sjekklister totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Ny sjekkliste"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter sjekklister..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="ikke_startet">Ikke startet</SelectItem>
              <SelectItem value="pagarende">Pågående</SelectItem>
              <SelectItem value="fullfort">Fullført</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Checklists */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredChecklists.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Ingen sjekklister"
            description="Opprett sjekklister for kvalitetskontroll og HMS"
            actionLabel="Ny sjekkliste"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredChecklists.map((checklist) => {
              const progress = getProgress(checklist.items);
              const isExpanded = expandedChecklists[checklist.id];
              
              return (
                <Card key={checklist.id} className="border-0 shadow-sm overflow-hidden">
                  <div
                    className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpanded(checklist.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          progress === 100 ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <CheckSquare className={`h-6 w-6 ${
                            progress === 100 ? 'text-emerald-600' : 'text-slate-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{checklist.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {getProjectName(checklist.project_id)}
                            {checklist.template_name && ` • ${checklist.template_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={checklist.status} />
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500">Fremgang</span>
                        <span className="font-medium text-slate-900">{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                      <div className="space-y-3">
                        {checklist.items?.map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              item.checked ? 'bg-emerald-50' : 'bg-slate-50'
                            }`}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={(checked) => handleCheckItem(checklist, index, checked)}
                            />
                            <span className={`flex-1 ${item.checked ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {checklist.signed_by && (
                        <p className="text-sm text-slate-500 mt-4">
                          Signert av {checklist.signed_by} • {checklist.completed_date && format(new Date(checklist.completed_date), 'd. MMM yyyy', { locale: nb })}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ny sjekkliste</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Navn på sjekklisten"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Prosjekt *</Label>
              <ProjectSelector
                value={formData.project_id}
                onChange={(v) => setFormData({...formData, project_id: v})}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Mal</Label>
              <Select 
                value={formData.template_name} 
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg mal" />
                </SelectTrigger>
                <SelectContent>
                  {checklistTemplates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sjekkpunkter</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Legg til
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                      placeholder="Sjekkpunkt..."
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.items.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Velg en mal eller legg til sjekkpunkter manuelt
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || formData.items.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}