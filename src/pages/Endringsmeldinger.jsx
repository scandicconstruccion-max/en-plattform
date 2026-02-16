import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import { FileText, Search, TrendingUp, TrendingDown, RefreshCw, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Endringsmeldinger() {
  const [showDialog, setShowDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedChange, setSelectedChange] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    change_type: 'tillegg',
    amount: '',
    status: 'utkast'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['changeNotifications'],
    queryFn: () => base44.entities.ChangeNotification.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeNotification.create({
      ...data,
      requested_by: user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeNotifications'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChangeNotification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeNotifications'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      change_type: 'tillegg',
      amount: '',
      status: 'utkast'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: formData.amount ? parseFloat(formData.amount) : null
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const getProjectEmail = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.client_email || '';
  };

  const handleSendEmail = (change) => {
    setSelectedChange(change);
    setShowEmailDialog(true);
  };

  const handleEmailSent = (updateData) => {
    updateMutation.mutate({ 
      id: selectedChange.id, 
      data: updateData 
    });
    setSelectedChange(null);
  };

  const filteredChanges = changes.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const changeTypeIcons = {
    tillegg: TrendingUp,
    fradrag: TrendingDown,
    endring: RefreshCw
  };

  const changeTypeLabels = {
    tillegg: 'Tillegg',
    fradrag: 'Fradrag',
    endring: 'Endring'
  };

  const changeTypeColors = {
    tillegg: 'bg-emerald-100 text-emerald-600',
    fradrag: 'bg-red-100 text-red-600',
    endring: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Endringsmeldinger"
        subtitle={`${changes.length} endringsmeldinger totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Ny endringsmelding"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter endringsmelding..."
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
              <SelectItem value="utkast">Utkast</SelectItem>
              <SelectItem value="sendt">Sendt</SelectItem>
              <SelectItem value="godkjent">Godkjent</SelectItem>
              <SelectItem value="avvist">Avvist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Changes List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredChanges.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Ingen endringsmeldinger"
            description="Opprett endringsmeldinger for å dokumentere endringer i prosjekter"
            actionLabel="Ny endringsmelding"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredChanges.map((change) => {
              const Icon = changeTypeIcons[change.change_type] || RefreshCw;
              return (
                <Card key={change.id} className="p-6 border-0 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        changeTypeColors[change.change_type] || 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{change.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            changeTypeColors[change.change_type] || 'bg-slate-100 text-slate-600'
                          }`}>
                            {changeTypeLabels[change.change_type]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{getProjectName(change.project_id)}</p>
                        {change.description && (
                          <p className="text-slate-600 mt-2 line-clamp-2">{change.description}</p>
                        )}
                        <p className="text-sm text-slate-500 mt-2">
                          {change.created_date && format(new Date(change.created_date), 'd. MMM yyyy', { locale: nb })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {change.amount && (
                        <p className={`text-lg font-semibold ${
                          change.change_type === 'tillegg' ? 'text-emerald-600' :
                          change.change_type === 'fradrag' ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {change.change_type === 'tillegg' ? '+' : change.change_type === 'fradrag' ? '-' : ''}
                          {change.amount.toLocaleString('nb-NO')} kr
                        </p>
                      )}
                      <StatusBadge status={change.status} className="mt-2" />
                    </div>
                  </div>

                  {/* Delivery Status */}
                  <DeliveryStatus item={change} />

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(change)}
                      className="rounded-xl gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Send til kunde
                    </Button>
                    {change.status === 'utkast' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(change)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      >
                        Send til godkjenning
                      </Button>
                    )}
                    {change.status === 'sendt' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMutation.mutate({ 
                            id: change.id, 
                            data: { status: 'avvist' } 
                          })}
                          className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Avvis
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ 
                            id: change.id, 
                            data: { 
                              status: 'godkjent',
                              approved_date: new Date().toISOString().split('T')[0]
                            } 
                          })}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        >
                          Godkjenn
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ny endringsmelding</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Beskrivende tittel"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type endring</Label>
                <Select 
                  value={formData.change_type} 
                  onValueChange={(v) => setFormData({...formData, change_type: v})}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tillegg">Tillegg</SelectItem>
                    <SelectItem value="fradrag">Fradrag</SelectItem>
                    <SelectItem value="endring">Endring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Beløp (NOK)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detaljert beskrivelse av endringen..."
                rows={4}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Opprett'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="endringsmelding"
        item={selectedChange}
        defaultEmail={selectedChange ? getProjectEmail(selectedChange.project_id) : ''}
        onSent={handleEmailSent}
      />
    </div>
  );
}