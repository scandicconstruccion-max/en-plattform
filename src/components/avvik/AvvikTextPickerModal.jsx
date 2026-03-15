import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// Predefined suggestions per category and field
const PREDEFINED = {
  hms_fall: {
    title: ['Fallrisiko – manglende rekkverk', 'Personskade ved fall fra høyde', 'Usikret åpning i gulv/tak'],
    description: [
      'Manglende rekkverk ved arbeidsplatform på etasje. Risiko for fall på over 2 meter.',
      'Ansatt skadet ved fall. Arbeidsstedet var ikke tilfredsstillende sikret.',
      'Åpning i etasjeskiller ikke merket eller sperret av.'
    ],
    corrective_action: [
      'Steng av umiddelbart. Monter rekkverk i henhold til krav. Varsle HMS-ansvarlig.',
      'Tilkall lege. Sperr av området. Skriv RUH-rapport. Varsle verneombud.',
      'Installer midlertidig dekke eller sperring. Sett opp tydelig merking.'
    ]
  },
  kvalitet_feil: {
    title: ['Kvalitetsfeil – avvik fra tegning', 'Feil dimensjon/mål', 'Uakseptabel overflatebehandling', 'Manglende sveisekvalitet'],
    description: [
      'Arbeidet er utført med feil dimensjoner i forhold til godkjent tegning.',
      'Overflaten tilfredsstiller ikke krav til finish. Synlige sprekker/ujevnheter.',
      'Sveis er ikke utført ihht. kravspesifikasjon. Mangler penetrasjon.',
      'Montasje avviker fra prosjektert løsning uten godkjent endringsmelding.'
    ],
    corrective_action: [
      'Stopp videre arbeid. Ta bilder. Avklar riktig løsning med prosjektleder.',
      'Riv og gjør om. Dokumenter utbedring med bilder etter ferdigstillelse.',
      'Kontakt prosjekterende for avklaring. Krev skriftlig svar før videre arbeid.'
    ]
  },
  fremdrift_forsinkelse: {
    title: ['Fremdriftsforsinkelse', 'Leveringsforsinkelse fra leverandør', 'Mannskapssvikt – ikke tilstrekkelig bemanning'],
    description: [
      'Aktivitet er forsinket i forhold til gjeldende fremdriftsplan.',
      'Materiell er ikke levert til avtalt tid. Påvirker kritisk sti.',
      'Underentreprenør møtte ikke opp. Arbeid ble ikke utført som planlagt.'
    ],
    corrective_action: [
      'Oppdater fremdriftsplan. Vurder innleie/økt bemanning. Varsle byggherre.',
      'Kontakt leverandør for ny leveringsdato. Vurder erstatningsleverandør.',
      'Avhold oppfølgingsmøte. Sett tidsfrist og dagmulkt-varsel.'
    ]
  },
  miljo: {
    title: ['Miljøavvik – oljeutslipp', 'Feil sortering av avfall', 'Kjemikalieutslipp'],
    description: [
      'Oljeutslipp fra maskin/utstyr. Mengde og utbredelse ikke kartlagt.',
      'Avfall er ikke sortert i henhold til plan. Farlig avfall i restavfall.',
      'Kjemikalie er sølt på grunn. Fare for forurensning av jord/vann.'
    ],
    corrective_action: [
      'Stopp maskinen. Legg absorpsjonsduker. Varsle miljøansvarlig. Dokumenter.',
      'Sorter om umiddelbart. Sett opp tydeligere merking av kontainere.',
      'Bruk verneutstyr. Saml opp spill. Kontakt miljøansvarlig og meld til Statsforvalter ved behov.'
    ]
  },
  prosjektering: {
    title: ['Feil i tegning', 'Tegningskonflikt', 'Manglende detaljtegning'],
    description: [
      'Tegning inneholder målsettingsfeil som ikke lar seg utføre i felt.',
      'To tegninger fra ulike fag er i konflikt med hverandre.',
      'Nødvendig detaljtegning for kritisk punkt mangler.'
    ],
    corrective_action: [
      'Stans berørt arbeid. Send RFI til prosjekterende. Krev svar innen 48 timer.',
      'Send tegningsanmerkning til arkitekt/rådgiver. Avklar hvilken tegning som gjelder.',
      'Be om utsendelse av manglende tegning. Sett frist.'
    ]
  },
  dokumentasjon: {
    title: ['Manglende samsvarserklæring', 'FDV-dokumentasjon ikke levert', 'Sertifikat mangler'],
    description: [
      'Samsvarserklæring for elektrisk installasjon er ikke mottatt.',
      'FDV-dokumentasjon for installert utstyr er ikke overlevert.',
      'Sertifikat for materiell/produkt er ikke fremlagt som krevd.'
    ],
    corrective_action: [
      'Krev dokumentasjon fra ansvarlig utfører. Sett frist.',
      'Send purring til leverandør. Dokumentasjon skal foreligge før overtakelse.',
      'Innhent kopi av gyldig sertifikat. Arkiver i prosjektmappe.'
    ]
  },
  sikkerhet_brann: {
    title: ['Branncelle brutt', 'Branntetning mangler', 'Rømningsvei blokkert'],
    description: [
      'Gjennomføring i brannklassifisert vegg/etasjeskiller er ikke tettet.',
      'Branntetning er ikke montert rundt rør/kabel i brannskille.',
      'Rømningsvei er blokkert av materiell/utstyr.'
    ],
    corrective_action: [
      'Monter godkjent branntetning umiddelbart. Dokumenter med foto.',
      'Varsle brannansvarlig. Utbedring skal utføres av godkjent firma.',
      'Fjern hindringen umiddelbart. Merk rømningsvei tydelig.'
    ]
  },
  annet: {
    title: ['Avvik fra prosedyre', 'Orden og ryddighet', 'Annet avvik'],
    description: [
      'Arbeid er utført uten å følge gjeldende prosedyre.',
      'Byggeplassen tilfredsstiller ikke krav til orden og ryddighet.',
      'Avvik er observert. Se beskrivelse for detaljer.'
    ],
    corrective_action: [
      'Gjennomgå prosedyre med ansvarlig. Sett krav til etterlevelse.',
      'Rydd arbeidsstedet umiddelbart. Sett daglig ryddeansvar.',
      'Beskriv tiltak og sett frist for utbedring.'
    ]
  }
};

const FIELD_LABELS = {
  title: 'Tittel',
  description: 'Beskrivelse',
  corrective_action: 'Korrigerende tiltak'
};

export default function AvvikTextPickerModal({ open, onOpenChange, field, category, templateId, onSelect }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const queryClient = useQueryClient();

  const { data: customTemplates = [] } = useQuery({
    queryKey: ['deviationTextTemplates', field, category],
    queryFn: () => base44.entities.DeviationTextTemplate.filter({ field, category }),
    enabled: open
  });

  // Also fetch "all" category templates
  const { data: allCategoryTemplates = [] } = useQuery({
    queryKey: ['deviationTextTemplates', field, 'all'],
    queryFn: () => base44.entities.DeviationTextTemplate.filter({ field, category: 'all' }),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeviationTextTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviationTextTemplates'] });
      setShowAddForm(false);
      setNewLabel('');
      setNewText('');
      toast.success('Standardtekst lagret');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeviationTextTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviationTextTemplates'] });
    }
  });

  const handleSaveCustom = async () => {
    if (!newLabel.trim() || !newText.trim()) return;
    const user = await base44.auth.me();
    createMutation.mutate({
      category: category || 'all',
      field,
      text: newText,
      label: newLabel,
      created_by_name: user.full_name || user.email
    });
  };

  // Get predefined suggestions for this templateId/field
  const predefined = templateId && PREDEFINED[templateId]?.[field] || [];
  const allCustom = [...customTemplates, ...allCategoryTemplates];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80dvh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Velg tekst – {FIELD_LABELS[field]}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">Klikk på en tekst for å sette den inn i feltet</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Predefined suggestions */}
          {predefined.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Forslag</p>
              <div className="space-y-2">
                {predefined.map((text, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onSelect(text); onOpenChange(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-sm text-slate-700 flex items-start gap-2 group"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User's saved templates */}
          {allCustom.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mine standardtekster</p>
              <div className="space-y-2">
                {allCustom.map((tpl) => (
                  <div key={tpl.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => { onSelect(tpl.text); onOpenChange(false); }}
                      className="flex-1 text-left px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-sm text-slate-700 flex items-start gap-2 group"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <div className="font-medium text-xs text-emerald-700 mb-0.5">{tpl.label}</div>
                        <div>{tpl.text}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(tpl.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new custom template */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-emerald-600 hover:border-emerald-400 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Lagre ny standardtekst
            </button>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Ny standardtekst</p>
              <div>
                <Label className="text-xs">Navn / etikett</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="F.eks. «Standard rekkverk-avvik»"
                  className="mt-1 rounded-lg text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Tekst</Label>
                <Textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Skriv teksten som skal lagres..."
                  rows={3}
                  className="mt-1 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustom}
                  disabled={!newLabel.trim() || !newText.trim() || createMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-lg h-7 text-xs"
                >
                  Lagre
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowAddForm(false); setNewLabel(''); setNewText(''); }}
                  className="rounded-lg h-7 text-xs"
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}