import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SendEmailDialog from '@/components/shared/SendEmailDialog';
import DocumentArchive from '@/components/fdv/DocumentArchive';
import EquipmentRegister from '@/components/fdv/EquipmentRegister';
import MaintenancePlan from '@/components/fdv/MaintenancePlan';
import { 
  FileText, Send, CheckCircle2, Building2, 
  Calendar, User, Package
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FDVDetaljer() {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const fdvId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fdvPackage, isLoading } = useQuery({
    queryKey: ['fdvPackage', fdvId],
    queryFn: async () => {
      const packages = await base44.entities.FDVPackage.list();
      return packages.find(p => p.id === fdvId);
    },
    enabled: !!fdvId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['fdvDocuments', fdvId],
    queryFn: () => base44.entities.FDVDocument.filter({ fdv_package_id: fdvId }),
    enabled: !!fdvId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['fdvEquipment', fdvId],
    queryFn: () => base44.entities.FDVEquipment.filter({ fdv_package_id: fdvId }),
    enabled: !!fdvId,
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['fdvMaintenance', fdvId],
    queryFn: () => base44.entities.FDVMaintenance.filter({ fdv_package_id: fdvId }),
    enabled: !!fdvId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.FDVPackage.update(fdvId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdvPackage', fdvId] });
      queryClient.invalidateQueries({ queryKey: ['fdvPackages'] });
      toast.success('Status oppdatert');
    },
  });

  const handleSendEmail = async (email) => {
    const approvalUrl = `${window.location.origin}/approve-fdv/${fdvPackage.approval_token}`;
    
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `FDV-dokumentasjon - ${fdvPackage.project_name}`,
      body: `Hei,\n\nFDV-dokumentasjon for ${fdvPackage.project_name} er nå klar for gjennomgang.\n\nProsjekt: ${fdvPackage.project_name}\nKunde: ${fdvPackage.customer_name}\n\nFor å godkjenne og signere FDV-pakken, klikk på lenken nedenfor:\n${approvalUrl}\n\nMed vennlig hilsen`
    });

    await base44.entities.FDVPackage.update(fdvId, {
      sent_to_customer: true,
      sent_date: new Date().toISOString(),
      status: 'overlevert'
    });

    queryClient.invalidateQueries({ queryKey: ['fdvPackage', fdvId] });
    queryClient.invalidateQueries({ queryKey: ['fdvPackages'] });
    toast.success('FDV-pakke sendt til kunde');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!fdvPackage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">FDV-pakke ikke funnet</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title={fdvPackage.project_name}
        subtitle="FDV-dokumentasjon"
        showBack
      />

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* Header Info */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fdvPackage.status} />
                  {fdvPackage.sent_to_customer && (
                    <span className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      Sendt til kunde
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {fdvPackage.customer_name}
                  </span>
                  {fdvPackage.delivery_date && (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(fdvPackage.delivery_date), 'd. MMMM yyyy', { locale: nb })}
                    </span>
                  )}
                  {fdvPackage.signed_date && (
                    <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Signert {format(new Date(fdvPackage.signed_date), 'd. MMM yyyy', { locale: nb })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={fdvPackage.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                >
                  <SelectTrigger className="w-48 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kladd">Kladd</SelectItem>
                    <SelectItem value="under_arbeid">Under arbeid</SelectItem>
                    <SelectItem value="klar_for_overlevering">Klar for overlevering</SelectItem>
                    <SelectItem value="overlevert">Overlevert</SelectItem>
                    <SelectItem value="signert">Signert</SelectItem>
                  </SelectContent>
                </Select>
                {fdvPackage.status !== 'signert' && (
                  <Button
                    onClick={() => setShowEmailDialog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send til kunde
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{documents.length}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Dokumenter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{equipment.length}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Utstyr</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{maintenance.length}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Vedlikeholdsoppgaver</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
            <TabsTrigger value="documents" className="rounded-lg">Dokumentarkiv</TabsTrigger>
            <TabsTrigger value="equipment" className="rounded-lg">Utstyrsregister</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-lg">Vedlikeholdsplan</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <DocumentArchive fdvPackageId={fdvId} projectId={fdvPackage.project_id} />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentRegister fdvPackageId={fdvId} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenancePlan fdvPackageId={fdvId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="fdv"
        item={fdvPackage}
        defaultEmail={fdvPackage.customer_email}
        onSent={handleSendEmail}
      />
    </div>
  );
}