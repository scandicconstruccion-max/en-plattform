import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ApproveDeviation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [deviation, setDeviation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  const token = searchParams.get('token');
  const deviationId = searchParams.get('deviationId');

  useEffect(() => {
    const loadDeviation = async () => {
      try {
        if (!token || !deviationId) {
          setStatus('invalid');
          setLoading(false);
          return;
        }

        const dev = await base44.entities.Deviation.read(deviationId);
        
        if (dev.approval_token !== token) {
          setStatus('invalid');
        } else if (dev.customer_approved) {
          setStatus('already_approved');
          setDeviation(dev);
        } else {
          setDeviation(dev);
          setStatus('ready');
        }
      } catch (error) {
        console.error('Feil ved lasting av avvik:', error);
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    loadDeviation();
  }, [token, deviationId]);

  const handleApprove = async (approved) => {
    setProcessing(true);
    try {
      const user = await base44.auth.me();
      const newActivityLog = deviation.activity_log || [];
      
      newActivityLog.push({
        action: approved ? 'godkjent_kunde' : 'avvist_kunde',
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_name: user.full_name,
        details: approved ? 'Kunde godkjente avvik' : 'Kunde avviste avvik'
      });

      await base44.entities.Deviation.update(deviation.id, {
        customer_approved: approved,
        customer_approved_date: new Date().toISOString(),
        status: approved ? 'godkjent_kunde' : 'avvist_kunde',
        activity_log: newActivityLog
      });

      // Send notification email to project manager
      const project = await base44.entities.Project.read(deviation.project_id);
      if (project.project_manager) {
        const statusText = approved ? 'godkjent' : 'avvist';
        await base44.integrations.Core.SendEmail({
          to: project.project_manager,
          subject: `Avvik ${statusText} av kunde: ${deviation.title}`,
          body: `Avvik "${deviation.title}" har blitt ${statusText} av kunden.\n\nKostnad: ${deviation.cost_amount} Kr\n\nLogg inn for å se detaljer.`,
          from_name: 'Avvik-system'
        });
      }

      toast.success(approved ? 'Avvik godkjent!' : 'Avvik avvist');
      setStatus(approved ? 'approved' : 'rejected');
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Feil ved godkjenning:', error);
      toast.error('Feil ved behandling av avvik');
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ugyldig lenke</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Lenken er ikke gyldig. Kontakt prosjektleder for mer informasjon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'already_approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Allerede godkjent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Dette avviket har allerede blitt godkjent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Godkjenn avvik</CardTitle>
            <CardDescription>
              Vennligst gjennomgå avviket før godkjenning eller avvisning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {deviation && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Tittel</label>
                    <p className="text-slate-900 font-semibold">{deviation.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">Beskrivelse</label>
                    <p className="text-slate-700 whitespace-pre-wrap">{deviation.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Kategori</label>
                      <p className="text-slate-900 capitalize">{deviation.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Alvorlighetsgrad</label>
                      <p className="text-slate-900 capitalize">{deviation.severity}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="text-sm font-medium text-blue-900">Kostnad</label>
                    <p className="text-2xl font-bold text-blue-900">{deviation.cost_amount} Kr</p>
                    {deviation.cost_description && (
                      <p className="text-sm text-blue-800 mt-2">{deviation.cost_description}</p>
                    )}
                  </div>
                </div>

                {(status === 'approved' || status === 'rejected') && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    status === 'approved' 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {status === 'approved' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Avvik godkjent!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">Avvik avvist</span>
                      </>
                    )}
                  </div>
                )}

                {status === 'ready' && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(false)}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Avvis
                    </Button>
                    <Button
                      onClick={() => handleApprove(true)}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Godkjenn
                    </Button>
                  </div>
                )}

                {(status === 'approved' || status === 'rejected') && (
                  <p className="text-sm text-slate-600 text-center">
                    Du blir omdirigert om noen sekunder...
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}