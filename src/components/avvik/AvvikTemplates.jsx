import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Star, Leaf, Clock, FileText, BookOpen, HardHat, AlertCircle } from 'lucide-react';

export const DEVIATION_TEMPLATES = [
  {
    id: 'hms_fall',
    category: 'hms',
    severity: 'hoy',
    icon: HardHat,
    color: 'bg-red-50 border-red-200 text-red-700',
    label: 'Fall/personskade',
    title: 'Fallrisiko / personskade',
    description: 'Det er registrert en situasjon med risiko for fall eller personskade på byggeplass. Stedet er ikke tilstrekkelig sikret.',
    corrective_action: 'Steng av området umiddelbart. Sett opp rekkverk/sikring. Varsle HMS-ansvarlig og prosjektleder.',
  },
  {
    id: 'kvalitet_feil',
    category: 'kvalitet',
    severity: 'middels',
    icon: Star,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    label: 'Kvalitetsfeil',
    title: 'Kvalitetsfeil – utførelse',
    description: 'Arbeid er utført i strid med spesifikasjon, tegning eller standard. Avvik fra forventet kvalitet er observert.',
    corrective_action: 'Dokumenter med bilder. Stopp videre arbeid på aktuell del. Avklar ansvar og plan for utbedring med prosjektleder.',
  },
  {
    id: 'fremdrift_forsinkelse',
    category: 'fremdrift',
    severity: 'middels',
    icon: Clock,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    label: 'Forsinkelse',
    title: 'Fremdriftsforsinkelse',
    description: 'Aktivitet er forsinket i forhold til opprinnelig plan. Dette kan påvirke kritisk sti og leveransedato.',
    corrective_action: 'Identifiser årsak til forsinkelse. Oppdater fremdriftsplan. Avklar konsekvenser for andre aktiviteter og kunden.',
  },
  {
    id: 'miljo',
    category: 'miljo',
    severity: 'hoy',
    icon: Leaf,
    color: 'bg-green-50 border-green-200 text-green-700',
    label: 'Miljøavvik',
    title: 'Miljøavvik – utslipp/avfall',
    description: 'Det er registrert utslipp eller feil håndtering av miljøfarlig materiale/avfall på byggeplass.',
    corrective_action: 'Stopp arbeidet. Sikre området. Varsle miljøansvarlig. Dokumenter avviket og meld til aktuell myndighet ved behov.',
  },
  {
    id: 'prosjektering',
    category: 'prosjektering',
    severity: 'middels',
    icon: FileText,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    label: 'Prosjekteringsfeil',
    title: 'Feil i tegning / prosjektering',
    description: 'Tegning eller prosjekteringsunderlag inneholder feil, utelatelse eller motstridende informasjon.',
    corrective_action: 'Stans berørt arbeid. Varsle prosjekterende. Avklar korrekt løsning skriftlig før videre arbeid.',
  },
  {
    id: 'dokumentasjon',
    category: 'dokumentasjon',
    severity: 'lav',
    icon: BookOpen,
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    label: 'Dokumentasjonsfeil',
    title: 'Manglende / feil dokumentasjon',
    description: 'Nødvendig dokumentasjon mangler eller er feil. Dette kan gjelde sertifikater, protokoller, FDV-dokumenter o.l.',
    corrective_action: 'Innhent manglende dokumentasjon fra leverandør/utfører. Sett frist og følg opp.',
  },
  {
    id: 'sikkerhet_brann',
    category: 'sikkerhet',
    severity: 'kritisk',
    icon: ShieldAlert,
    color: 'bg-red-50 border-red-200 text-red-700',
    label: 'Sikkerhet',
    title: 'Brannsikkerhet – avvik',
    description: 'Det er avdekket avvik fra brannkrav eller branntekniske løsninger. Brannceller, tetninger, dører eller rømningsveier er ikke i henhold til krav.',
    corrective_action: 'Varsle brannansvarlig umiddelbart. Sett krav om utbedring til ansvarlig utfører. Dokumenter med foto og beskriv nøyaktig plassering.',
  },
  {
    id: 'annet',
    category: 'annet',
    severity: 'middels',
    icon: AlertCircle,
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    label: 'Annet',
    title: '',
    description: '',
    corrective_action: '',
  },
];

export default function AvvikTemplateSelector({ onSelect }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 mb-3">Velg avvikstype (eller fyll ut manuelt)</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DEVIATION_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center hover:opacity-80 transition-opacity text-xs font-medium ${tpl.color}`}
            >
              <Icon className="h-5 w-5" />
              {tpl.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}