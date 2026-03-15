import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import FileUploadSection from '@/components/shared/FileUploadSection';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DeliveryStatus from '@/components/shared/DeliveryStatus';
import SendAvvikDialog from '@/components/avvik/SendAvvikDialog';
import ActivityLog from '@/components/avvik/ActivityLog';
import { AlertTriangle, Calendar, User, DollarSign, Mail, Image as ImageIcon, CheckCircle2, FileText, Loader2, MapPin } from 'lucide-react';
import DocumentChatDrawer from '@/components/chat/DocumentChatDrawer';
import EkstrakostnadDialog from '@/components/avvik/EkstrakostnadDialog';

import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AvvikDetaljer() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const deviationId = urlParams.get('id');

  const [isEditing, setIsEditing] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSendAvvikDialog, setShowSendAvvikDialog] = useState(false);
  const [showEkstrakostnadDialog, setShowEkstrakostnadDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'annet',
    severity: 'middels',
    status: 'opprettet',
    assigned_to: '',
    due_date: '',
    corrective_action: '',
    has_cost_consequence: false,
    cost_amount: '',
    cost_description: '',
    cost_responsible: ''
  });
  const [attachments, setAttachments] = useState([]);

  const queryClient = useQueryClient();

  const { data: deviation, isLoading } = useQuery({
    queryKey: ['deviation', deviationId],
    queryFn: () => base44.entities.Deviation.filter({ id: deviationId }),
    select: (data) => data[0],
    enabled: !!deviationId
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Deviation.update(deviationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviation', deviationId] });
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
      setIsEditing(false);
    }
  });

  React.useEffect(() => {
    if (deviation && !isEditing) {
      setFormData({
        title: deviation.title || '',
        description: deviation.description || '',
        category: deviation.category || 'annet',
        severity: deviation.severity || 'middels',
        status: deviation.status || 'ny',
        assigned_to: deviation.assigned_to || '',
        due_date: deviation.due_date || '',
        corrective_action: deviation.corrective_action || '',
        has_cost_consequence: deviation.has_cost_consequence || false,
        cost_amount: deviation.cost_amount?.toString() || '',
        cost_description: deviation.cost_description || '',
        cost_responsible: deviation.cost_responsible || ''
      });
      setAttachments(deviation.images?.map(url => ({ file_url: url })) || []);
    }
  }, [deviation, isEditing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      cost_amount: formData.cost_amount ? parseFloat(formData.cost_amount) : null,
      images: attachments.map(a => a.file_url).filter(Boolean)
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const getProjectEmail = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.client_email || '';
  };

  const handleSendEmail = () => {
    setShowEmailDialog(true);
  };

  const handleEmailSent = (updateData) => {
    updateMutation.mutate(updateData);
  };

  const handleMarkAsCompleted = async () => {
    setIsProcessing(true);
    try {
      const user = await base44.auth.me();
      const newActivityLog = deviation.activity_log || [];
      
      newActivityLog.push({
        action: 'markert_utfort',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        details: 'Avvik markert som utført'
      });

      await base44.entities.Deviation.update(deviationId, {
        status: 'utfort',
        completed_date: new Date().toISOString(),
        activity_log: newActivityLog
      });

      toast.success('Avvik markert som utført');
      queryClient.invalidateQueries({ queryKey: ['deviation', deviationId] });
      queryClient.invalidateQueries({ queryKey: ['deviations'] });
    } catch (error) {
      console.error('Feil ved markering som utført:', error);
      toast.error('Kunne ikke markere som utført');
    } finally {
      setIsProcessing(false);
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="px-6 lg:px-8 py-6 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!deviation) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Avvik ikke funnet" showBack backUrl={createPageUrl('Avvik')} />
      </div>
    );
  }

  const categoryLabels = {
    sikkerhet: 'Sikkerhet',
    kvalitet: 'Kvalitet',
    miljo: 'Miljø',
    fremdrift: 'Fremdrift',
    prosjektering: 'Prosjektering',
    dokumentasjon: 'Dokumentasjon',
    hms: 'HMS',
    annet: 'Annet'
  };

  const costResponsibleLabels = {
    byggherre: 'Byggherre',
    entreprenor: 'Entreprenør',
    underentreprenor: 'Underentreprenør',
    annet: 'Annet'
  };

  const severityColors = {
    lav: 'bg-blue-50 text-blue-700',
    middels: 'bg-yellow-50 text-yellow-700',
    hoy: 'bg-orange-50 text-orange-700',
    kritisk: 'bg-red-50 text-red-700'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={deviation.title}
        subtitle={`Avvik - ${getProjectName(deviation.project_id)}`}
        showBack
        backUrl={createPageUrl('Avvik')}
        actions={
          <div className="flex gap-2 flex-wrap">
            <DocumentChatDrawer
              entityName="Deviation"
              documentId={deviationId}
              projectId={deviation.project_id}
              chatGroupId={deviation.chat_group_id}
              onLinked={(groupId) => {
                queryClient.invalidateQueries({ queryKey: ['deviation', deviationId] });
              }}
            />
            {deviation.has_cost_consequence && !deviation.sent_to_customer && (
              <Button
                onClick={() => setShowSendAvvikDialog(true)}
                variant="default"
                className="rounded-xl gap-2">
                <Mail className="h-4 w-4" />
                Send til kunde
              </Button>
            )}
            {deviation.customer_approved && deviation.status === 'godkjent_kunde' && (
              <Button
                onClick={handleMarkAsCompleted}
                disabled={isProcessing}
                className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Marker som utført
              </Button>
            )}

            {deviation.invoice_id && (
              <Button
                onClick={() => navigate(createPageUrl('FakturaDetaljer') + '?id=' + deviation.invoice_id)}
                variant="outline"
                className="rounded-xl gap-2">
                <FileText className="h-4 w-4" />
                Se faktura
              </Button>
            )}
          </div>
        }
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {isEditing ? (
          <Card className="p-6 border-0 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Tittel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Beskrivelse av avviket"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sikkerhet">Sikkerhet</SelectItem>
                      <SelectItem value="kvalitet">Kvalitet</SelectItem>
                      <SelectItem value="miljo">Miljø</SelectItem>
                      <SelectItem value="annet">Annet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detaljert beskrivelse av avviket"
                  className="rounded-xl"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="severity">Alvorlighet</Label>
                  <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lav">Lav</SelectItem>
                      <SelectItem value="middels">Middels</SelectItem>
                      <SelectItem value="hoy">Høy</SelectItem>
                      <SelectItem value="kritisk">Kritisk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                     <SelectItem value="opprettet">Opprettet</SelectItem>
                     <SelectItem value="sendt_kunde">Sendt kunde</SelectItem>
                     <SelectItem value="godkjent_kunde">Godkjent av kunde</SelectItem>
                     <SelectItem value="utfort">Utført</SelectItem>
                     <SelectItem value="fakturert">Fakturert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Frist</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="corrective_action">Korrigerende tiltak</Label>
                <Textarea
                  id="corrective_action"
                  value={formData.corrective_action}
                  onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                  placeholder="Hva skal gjøres for å rette opp avviket"
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <FileUploadSection 
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                projectId={deviation.project_id}
                moduleType="deviation"
              />

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Kostnadskonsekvensar</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has_cost"
                    checked={formData.has_cost_consequence}
                    onChange={(e) => setFormData({ ...formData, has_cost_consequence: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="has_cost" className="mb-0 cursor-pointer">Avviket har kostnadskonsekvenser</Label>
                </div>

                {formData.has_cost_consequence && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="cost_amount">Kostnad (Kr.)</Label>
                      <Input
                        id="cost_amount"
                        type="number"
                        value={formData.cost_amount}
                        onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value })}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_responsible">Ansvar</Label>
                      <Select value={formData.cost_responsible} onValueChange={(value) => setFormData({ ...formData, cost_responsible: value })}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="byggherre">Byggherre</SelectItem>
                          <SelectItem value="entreprenor">Entreprenør</SelectItem>
                          <SelectItem value="underentreprenor">Underentreprenør</SelectItem>
                          <SelectItem value="annet">Annet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.has_cost_consequence && (
                  <div className="space-y-2">
                    <Label htmlFor="cost_description">Kostnadsbeskrivelse</Label>
                    <Textarea
                      id="cost_description"
                      value={formData.cost_description}
                      onChange={(e) => setFormData({ ...formData, cost_description: e.target.value })}
                      placeholder="Beskrivelse av kostnaden"
                      className="rounded-xl"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl">
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                  {updateMutation.isPending ? 'Lagrer...' : 'Lagre endringer'}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-0 shadow-sm">
                <div className="text-sm text-slate-600 mb-1">Status</div>
                <StatusBadge status={deviation.status} />
              </Card>
              <Card className="p-4 border-0 shadow-sm">
                <div className="text-sm text-slate-600 mb-1">Alvorlighet</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${severityColors[deviation.severity] || 'bg-slate-100 text-slate-700'}`}>
                  {deviation.severity === 'lav' ? 'Lav' : deviation.severity === 'middels' ? 'Middels' : deviation.severity === 'hoy' ? 'Høy' : 'Kritisk'}
                </div>
              </Card>
              <Card className="p-4 border-0 shadow-sm">
                <div className="text-sm text-slate-600 mb-1">Kategori</div>
                <div className="font-medium text-slate-900">{categoryLabels[deviation.category] || deviation.category}</div>
              </Card>
              <Card className="p-4 border-0 shadow-sm">
                <div className="text-sm text-slate-600 mb-1">Registrert</div>
                <div className="font-medium text-slate-900 text-sm">
                  {format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb })}
                </div>
              </Card>
            </div>

            {/* Description */}
            {deviation.description && (
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">Beskrivelse</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{deviation.description}</p>
              </Card>
            )}

            {/* Corrective Action */}
            {deviation.corrective_action && (
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">Korrigerende tiltak</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{deviation.corrective_action}</p>
              </Card>
            )}

            {/* Cost Information */}
            {deviation.has_cost_consequence && (
              <Card className="p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Kostnadskonsekvensar</h3>
                  {deviation.customer_approved && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Godkjent av kunde
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Kostnad</div>
                    <div className="text-xl font-semibold text-slate-900">{deviation.cost_amount?.toLocaleString()} Kr.</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Ansvar</div>
                    <div className="font-medium text-slate-900">{costResponsibleLabels[deviation.cost_responsible] || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Beskrivelse</div>
                    <div className="text-sm text-slate-700">{deviation.cost_description || '-'}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Details */}
            <Card className="p-6 border-0 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {deviation.due_date && (
                  <div className="flex gap-3">
                    <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-600">Frist</div>
                      <div className="font-medium text-slate-900">{format(new Date(deviation.due_date), 'd. MMM yyyy', { locale: nb })}</div>
                    </div>
                  </div>
                )}
                {deviation.assigned_to && (
                  <div className="flex gap-3">
                    <User className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-600">Tildelt</div>
                      <div className="font-medium text-slate-900">{deviation.assigned_to}</div>
                    </div>
                  </div>
                )}
                {deviation.location_label && (
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-600">Lokasjon</div>
                      <div className="font-medium text-slate-900">{deviation.location_label}</div>
                      {deviation.location_lat && (
                        <a
                          href={`https://maps.google.com/?q=${deviation.location_lat},${deviation.location_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Åpne i kart
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Images */}
            {deviation.images && deviation.images.length > 0 && (
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4 flex gap-2 items-center">
                  <ImageIcon className="h-5 w-5" />
                  Bilder ({deviation.images.length})
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {deviation.images.map((image, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                      <img
                        src={image}
                        alt={`Bilde ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Button variant="ghost" size="sm" className="text-white">
                          Åpne
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Edit Section */}
            <Card className="p-6 border-0 shadow-sm border-t-2 border-emerald-100">
              <h3 className="font-semibold text-slate-900 mb-4">Legg til eller rediger</h3>
              <FileUploadSection
                onFilesSelected={(files) => {
                  setAttachments([...attachments, ...files]);
                }}
                title="Legg til bilder"
              />
              {attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-slate-900 mb-3">Bilder som skal lagres</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {attachments.map((attachment, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                        <img
                          src={attachment.file_url}
                          alt={`Nytt bilde ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                  Rediger avvik
                </Button>
                {attachments.length > 0 && (
                  <Button
                    onClick={() => {
                      updateMutation.mutate({
                        images: attachments.map(a => a.file_url).filter(Boolean)
                      });
                    }}
                    disabled={updateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                    {updateMutation.isPending ? 'Lagrer...' : 'Lagre bilder'}
                  </Button>
                )}
              </div>
            </Card>

            {/* Delivery Status */}
            {(deviation.sent_to_customer || deviation.delivery_confirmed || deviation.downloaded) && (
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Kundelevering</h3>
                <DeliveryStatus
                  sent={deviation.sent_to_customer}
                  sentDate={deviation.sent_date}
                  delivered={deviation.delivery_confirmed}
                  deliveredDate={deviation.delivery_confirmed_date}
                  downloaded={deviation.downloaded}
                  downloadedDate={deviation.downloaded_date}
                />
              </Card>
            )}
          </>
        )}
      </div>

      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="deviation"
        item={{
          ...deviation,
          customer_email: getProjectEmail(deviation.project_id),
          customer_name: getProjectName(deviation.project_id)
        }}
        onSent={handleEmailSent}
      />

       <SendAvvikDialog
         deviation={deviation}
         isOpen={showSendAvvikDialog}
         onClose={() => setShowSendAvvikDialog(false)}
         onSent={() => {
           queryClient.invalidateQueries({ queryKey: ['deviation', deviationId] });
           queryClient.invalidateQueries({ queryKey: ['deviations'] });
         }}
       />

       {deviation.activity_log && deviation.activity_log.length > 0 && (
         <Card className="p-6 border-0 shadow-sm">
           <ActivityLog activityLog={deviation.activity_log} />
         </Card>
       )}

    </div>
  );
}