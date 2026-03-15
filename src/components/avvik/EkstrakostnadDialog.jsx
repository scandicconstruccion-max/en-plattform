import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, DollarSign, Loader2, Mail } from 'lucide-react';

export default function EkstrakostnadDialog({ open, onOpenChange, deviation, project }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [formData, setFormData] = useState({
    belop: '',
    arsak: '',
    tidsplan_pavirkning: 'nei',
    kunde_epost: project?.client_email || ''
  });
  const [savedEk, setSavedEk] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const tidsplanLabels = {
    nei: 'Nei – ingen forsinkelse',
    '1_dag': 'Ja, forsinkelse 1 dag',
    '2_3_dager': 'Ja, forsinkelse 2-3 dager',
    flere_dager: 'Ja, forsinkelse flere dager'
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const tokenExp = new Date();
      tokenExp.setDate(tokenExp.getDate() + 7);

      return base44.entities.Ekstrakostnad.create({
        avvik_id: deviation.id,
        avvik_tittel: deviation.title,
        avvik_nummer: deviation.deviation_number,
        avvik_kategori: deviation.category,
        prosjekt_id: deviation.project_id,
        prosjekt_navn: project?.name || '',
        belop: parseFloat(data.belop),
        arsak: data.arsak,
        tidsplan_pavirkning: data.tidsplan_pavirkning,
        status: 'venter_godkjenning',
        opprettet_av_navn: user.display_name || user.full_name,
        opprettet_av_epost: user.email,
        godkjennings_token: token,
        token_utloper: tokenExp.toISOString(),
        kunde_epost: data.kunde_epost
      });
    },
    onSuccess: async (ek) => {
      setSavedEk(ek);
      if (formData.kunde_epost) {
        setIsSending(true);
        try {
          await base44.functions.invoke('sendEkstrakostnadEmail', { ekstrakostnad_id: ek.id });
        } catch (e) {
          toast.error('Ekstrakostnad lagret, men e-post feilet');
        }
        setIsSending(false);
      }
      setStep('confirm');
      queryClient.invalidateQueries({ queryKey: ['ekstrakostnader', deviation.id] });
    },
    onError: () => toast.error('Kunne ikke lagre ekstrakostnad')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.belop || parseFloat(formData.belop) <= 0) {
      toast.error('Skriv inn et gyldig beløp');
      return;
    }
    if (!formData.arsak || formData.arsak.trim().length < 10) {
      toast.error('Årsak må være minst 10 tegn');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ belop: '', arsak: '', tidsplan_pavirkning: 'nei', kunde_epost: project?.client_email || '' });
    setSavedEk(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                Registrer Ekstrakostnad
              </DialogTitle>
            </DialogHeader>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Avvik: {deviation?.title}</p>
              <p className="text-blue-600">Kategori: {deviation?.category || '-'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label>Estimert kostnad (NOK) *</Label>
                <div className="relative mt-1.5">
                  <Input
                    type="number"
                    min="1"
                    max="50000"
                    value={formData.belop}
                    onChange={(e) => setFormData({ ...formData, belop: e.target.value })}
                    placeholder="f.eks. 650"
                    className="rounded-xl pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">kr</span>
                </div>
              </div>

              <div>
                <Label>Årsak til merkostnad *</Label>
                <Textarea
                  value={formData.arsak}
                  onChange={(e) => setFormData({ ...formData, arsak: e.target.value })}
                  placeholder="F.eks. Stikkontakten var defekt og må byttes, uforutsett skade oppdaget under arbeidet..."
                  rows={3}
                  className="mt-1.5 rounded-xl"
                  required
                  minLength={10}
                  maxLength={500}
                />
                <p className="text-xs text-slate-400 mt-1">{formData.arsak.length}/500 tegn</p>
              </div>

              <div>
                <Label>Påvirkning på tidsplan</Label>
                <Select
                  value={formData.tidsplan_pavirkning}
                  onValueChange={(v) => setFormData({ ...formData, tidsplan_pavirkning: v })}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tidsplanLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Send varsling til (e-post)</Label>
                <Input
                  type="email"
                  value={formData.kunde_epost}
                  onChange={(e) => setFormData({ ...formData, kunde_epost: e.target.value })}
                  placeholder="kunde@example.com"
                  className="mt-1.5 rounded-xl"
                />
                <p className="text-xs text-slate-400 mt-1">La stå tom for å lagre uten å sende e-post</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-blue-700 hover:bg-blue-800"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Lagrer...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" />Lagre & Varsle Kunde</>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-4 text-center space-y-5">
            {isSending ? (
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-green-700">Ekstrakostnad Registrert!</h2>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Estimert merkostnad</span>
                <span className="font-semibold">{parseFloat(formData.belop).toLocaleString('nb-NO')} kr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tidsplan</span>
                <span className="font-medium">{tidsplanLabels[formData.tidsplan_pavirkning]}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Venter på kundegodkjenning
            </div>

            {formData.kunde_epost && (
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                Kunde varslet på {formData.kunde_epost}
              </p>
            )}

            <Button onClick={handleClose} className="w-full rounded-xl bg-blue-700 hover:bg-blue-800">
              Ferdig
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}