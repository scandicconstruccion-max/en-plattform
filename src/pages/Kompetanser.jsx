import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Shield, Wrench, Car } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

const categoryIcons = {
  sikkerhet_hms: Shield,
  maskin_utstyr: Wrench,
  forerkort: Car
};

const categoryLabels = {
  sikkerhet_hms: 'Sikkerhet og HMS',
  maskin_utstyr: 'Maskin og utstyr',
  forerkort: 'Førerkort'
};

const categoryColors = {
  sikkerhet_hms: 'bg-red-100 text-red-700 border-red-200',
  maskin_utstyr: 'bg-orange-100 text-orange-700 border-orange-200',
  forerkort: 'bg-blue-100 text-blue-700 border-blue-200'
};

export default function KompetanserPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'sikkerhet_hms',
    description: '',
    is_active: true,
    display_order: 0
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: competencies = [], isLoading } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => base44.entities.Competency.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Competency.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      toast.success('Kompetanse opprettet');
      handleCloseDialog();
    },
    onError: () => toast.error('Kunne ikke opprette kompetanse')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Competency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      toast.success('Kompetanse oppdatert');
      handleCloseDialog();
    },
    onError: () => toast.error('Kunne ikke oppdatere kompetanse')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Competency.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      toast.success('Kompetanse slettet');
    },
    onError: () => toast.error('Kunne ikke slette kompetanse')
  });

  const handleOpenDialog = (competency = null) => {
    if (competency) {
      setEditingCompetency(competency);
      setFormData({
        name: competency.name || '',
        category: competency.category || 'sikkerhet_hms',
        description: competency.description || '',
        is_active: competency.is_active !== false,
        display_order: competency.display_order || 0
      });
    } else {
      setEditingCompetency(null);
      setFormData({
        name: '',
        category: 'sikkerhet_hms',
        description: '',
        is_active: true,
        display_order: 0
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompetency(null);
    setFormData({
      name: '',
      category: 'sikkerhet_hms',
      description: '',
      is_active: true,
      display_order: 0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCompetency) {
      updateMutation.mutate({ id: editingCompetency.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Er du sikker på at du vil slette denne kompetansen?')) {
      deleteMutation.mutate(id);
    }
  };

  const groupedCompetencies = competencies.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  // Sort by display_order within each category
  Object.keys(groupedCompetencies).forEach(cat => {
    groupedCompetencies[cat].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  });

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Kun for administratorer</h2>
          <p className="text-slate-600">
            Kun administratorer kan administrere kompetanser i systemet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Kompetanser"
        subtitle="Administrer forhåndsdefinerte kompetanser for ansatte"
        onAdd={() => handleOpenDialog()}
        addLabel="Legg til kompetanse"
      />

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Laster kompetanser...</p>
        </div>
      ) : (
        <div className="grid gap-6 mt-6">
          {['sikkerhet_hms', 'maskin_utstyr', 'forerkort'].map((category) => {
            const Icon = categoryIcons[category];
            const items = groupedCompetencies[category] || [];

            return (
              <Card key={category}>
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                  <div className={`p-2 rounded-lg ${categoryColors[category]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{categoryLabels[category]}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {items.length} {items.length === 1 ? 'kompetanse' : 'kompetanser'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Ingen kompetanser i denne kategorien</p>
                  ) : (
                    <div className="grid gap-3">
                      {items.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900">{comp.name}</h4>
                              {!comp.is_active && (
                                <Badge variant="outline" className="text-slate-500">Inaktiv</Badge>
                              )}
                            </div>
                            {comp.description && (
                              <p className="text-sm text-slate-600 mt-1">{comp.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(comp)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(comp.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCompetency ? 'Rediger kompetanse' : 'Legg til kompetanse'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Navn *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="f.eks. Stillaskurs"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Kategori *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sikkerhet_hms">Sikkerhet og HMS</SelectItem>
                  <SelectItem value="maskin_utstyr">Maskin og utstyr</SelectItem>
                  <SelectItem value="forerkort">Førerkort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kort beskrivelse av kompetansen..."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Sorteringsrekkefølge</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Lavere tall vises først i listen
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {editingCompetency ? 'Oppdater' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}