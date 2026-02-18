import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BefaringStatusBadge, PunktStatusBadge } from './BefaringStatusBadge';
import PunktForm from './PunktForm';
import { 
  Plus, ArrowLeft, Calendar, MapPin, User, Building2, 
  Edit, Trash2, Send, CheckCircle, Image as ImageIcon, 
  MessageSquare, Clock, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const befaringTypeLabels = {
  hms: 'HMS',
  kvalitet: 'Kvalitet',
  sluttkontroll: 'Sluttkontroll',
  overtakelse: 'Overtakelse',
  garantibefaring: 'Garantibefaring',
  annet: 'Annet'
};

export default function BefaringDetaljer({ 
  befaring, 
  punkter, 
  project, 
  employees,
  onBack, 
  onEdit 
}) {
  const [showPunktForm, setShowPunktForm] = useState(false);
  const [editingPunkt, setEditingPunkt] = useState(null);
  const [punktFormData, setPunktFormData] = useState({});
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sending, setSending] = useState(false);

  const queryClient = useQueryClient();

  const createPunktMutation = useMutation({
    mutationFn: (data) => base44.entities.BefaringPunkt.create({
      ...data,
      befaring_id: befaring.id,
      access_token: crypto.randomUUID()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringPunkter'] });
      setShowPunktForm(false);
      setPunktFormData({});
    },
  });

  const updatePunktMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BefaringPunkt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringPunkter'] });
      setShowPunktForm(false);
      setEditingPunkt(null);
      setPunktFormData({});
    },
  });

  const deletePunktMutation = useMutation({
    mutationFn: (id) => base44.entities.BefaringPunkt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringPunkter'] });
    },
  });

  const updateBefaringMutation = useMutation({
    mutationFn: (data) => base44.entities.Befaring.update(befaring.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['befaringer'] });
    },
  });

  const handleAddPunkt = () => {
    setPunktFormData({
      assigned_to_type: 'subcontractor',
      images: []
    });
    setEditingPunkt(null);
    setShowPunktForm(true);
  };

  const handleEditPunkt = (punkt) => {
    setEditingPunkt(punkt);
    setPunktFormData({
      description: punkt.description,
      location: punkt.location,
      images: punkt.images || [],
      due_date: punkt.due_date,
      assigned_to_type: punkt.assigned_to_type || 'subcontractor',
      assigned_employee_id: punkt.assigned_employee_id,
      assigned_subcontractor: punkt.assigned_subcontractor
    });
    setShowPunktForm(true);
  };

  const handlePunktSubmit = () => {
    if (editingPunkt) {
      updatePunktMutation.mutate({ id: editingPunkt.id, data: punktFormData });
    } else {
      createPunktMutation.mutate(punktFormData);
    }
  };

  const handleSign = async () => {
    const user = await base44.auth.me();
    await updateBefaringMutation.mutateAsync({
      status: 'signert',
      signed_by: user.email,
      signed_date: new Date().toISOString()
    });
    setShowSignDialog(false);
    toast.success('Befaring signert');
  };

  const handleSend = async () => {
    setSending(true);
    
    // Group punkter by subcontractor/employee
    const grouped = {};
    for (const punkt of punkter) {
      const key = punkt.assigned_subcontractor?.email || punkt.assigned_employee_id || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(punkt);
    }

    // Send emails
    for (const [key, items] of Object.entries(grouped)) {
      if (key === 'unknown') continue;
      
      let email = key;
      let name = '';
      
      if (items[0].assigned_to_type === 'employee') {
        const emp = employees?.find(e => e.id === key);
        if (emp) {
          email = emp.email;
          name = `${emp.first_name} ${emp.last_name}`;
        }
      } else {
        name = items[0].assigned_subcontractor?.name || '';
      }

      if (email && email.includes('@')) {
        const punktList = items.map((p, i) => `${i+1}. ${p.description}`).join('\n');
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Befaring: ${befaring.name} - ${items.length} punkt(er) tildelt`,
          body: `Hei ${name},\n\nDu har fått tildelt ${items.length} punkt(er) fra befaringen "${befaring.name}".\n\nPunkter:\n${punktList}\n\nProsjekt: ${project?.name || ''}\n\nVennligst følg opp punktene.\n\nMvh\n${project?.project_manager_name || 'Prosjektleder'}`
        });
      }
    }

    await updateBefaringMutation.mutateAsync({ status: 'sendt' });
    setSending(false);
    setShowSendDialog(false);
    toast.success('Befaring sendt til entreprenører');
  };

  const getAssigneeName = (punkt) => {
    if (punkt.assigned_to_type === 'employee' && punkt.assigned_employee_id) {
      const emp = employees?.find(e => e.id === punkt.assigned_employee_id);
      return emp ? `${emp.first_name} ${emp.last_name}` : 'Ukjent ansatt';
    }
    return punkt.assigned_subcontractor?.name || 'Ikke tildelt';
  };

  const completedCount = punkter.filter(p => p.status === 'utfort').length;
  const progress = punkter.length > 0 ? Math.round((completedCount / punkter.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{befaring.name}</h1>
              <BefaringStatusBadge status={befaring.status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Badge variant="outline">{befaringTypeLabels[befaring.befaring_type]}</Badge>
              </span>
              {befaring.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(befaring.date), 'd. MMMM yyyy', { locale: nb })}
                </span>
              )}
              {project && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {project.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {befaring.status === 'utkast' && (
            <>
              <Button variant="outline" onClick={() => onEdit(befaring)} className="rounded-xl gap-2">
                <Edit className="h-4 w-4" /> Rediger
              </Button>
              <Button 
                onClick={handleAddPunkt} 
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
              >
                <Plus className="h-4 w-4" /> Legg til punkt
              </Button>
            </>
          )}
          {befaring.status === 'aktiv' && punkter.length > 0 && (
            <Button 
              onClick={() => setShowSignDialog(true)} 
              className="bg-purple-600 hover:bg-purple-700 rounded-xl gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Signer befaring
            </Button>
          )}
          {befaring.status === 'signert' && (
            <Button 
              onClick={() => setShowSendDialog(true)} 
              className="bg-amber-600 hover:bg-amber-700 rounded-xl gap-2"
            >
              <Send className="h-4 w-4" /> Send til entreprenører
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {punkter.length > 0 && (
        <Card className="p-4 border-0 shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fremdrift</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{completedCount} av {punkter.length} fullført</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </Card>
      )}

      {/* Punkter */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Punkter ({punkter.length})
        </h2>

        {punkter.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm dark:bg-slate-900">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Ingen punkter</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Legg til punkter som skal vurderes i befaringen</p>
            <Button onClick={handleAddPunkt} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Legg til punkt
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {punkter.map((punkt, index) => (
              <Card key={punkt.id} className="p-4 border-0 shadow-sm dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900 dark:text-white">{punkt.description}</p>
                        <PunktStatusBadge status={punkt.status} />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {punkt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {punkt.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {getAssigneeName(punkt)}
                        </span>
                        {punkt.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Frist: {format(new Date(punkt.due_date), 'd. MMM', { locale: nb })}
                          </span>
                        )}
                        {punkt.images?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            {punkt.images.length} bilde{punkt.images.length > 1 ? 'r' : ''}
                          </span>
                        )}
                      </div>

                      {/* Images preview */}
                      {punkt.images?.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {punkt.images.slice(0, 4).map((url, i) => (
                            <img 
                              key={i}
                              src={url} 
                              alt="" 
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ))}
                          {punkt.images.length > 4 && (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <span className="text-sm text-slate-500">+{punkt.images.length - 4}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Contractor response */}
                      {punkt.contractor_comment && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kommentar fra entreprenør</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{punkt.contractor_comment}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {befaring.status === 'utkast' && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPunkt(punkt)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePunktMutation.mutate(punkt.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Punkt Form */}
      <PunktForm
        open={showPunktForm}
        onOpenChange={setShowPunktForm}
        formData={punktFormData}
        setFormData={setPunktFormData}
        onSubmit={handlePunktSubmit}
        isEdit={!!editingPunkt}
        project={project}
      />

      {/* Sign Dialog */}
      <AlertDialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <AlertDialogContent className="dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Signer befaring</AlertDialogTitle>
            <AlertDialogDescription>
              Ved å signere bekrefter du at alle punkter er korrekt registrert. 
              Etter signering kan du sende befaringen til underentreprenørene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign} className="bg-purple-600 hover:bg-purple-700 rounded-xl">
              Signer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent className="dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Send til entreprenører</AlertDialogTitle>
            <AlertDialogDescription>
              Alle tildelte underentreprenører og ansatte vil motta e-post med sine punkter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={sending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSend} 
              disabled={sending}
              className="bg-amber-600 hover:bg-amber-700 rounded-xl gap-2"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}