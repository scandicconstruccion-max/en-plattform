import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function RUHPDFView({ ruh, project }) {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'apen': return 'Åpen';
      case 'under_behandling': return 'Under behandling';
      case 'lukket': return 'Lukket';
      default: return status;
    }
  };

  const getTypeLabels = (types = []) => {
    const labels = {
      'personskade': 'Personskade',
      'nestenulykke': 'Nestenulykke',
      'materiell_skade': 'Materiell skade',
      'miljohendelse': 'Miljøhendelse',
      'brudd_rutiner': 'Brudd på rutiner',
      'farlig_forhold': 'Farlig forhold',
      'avvik_sja': 'Avvik fra SJA',
      'annet': 'Annet'
    };
    return types.map(t => labels[t] || t).join(', ');
  };

  const getKonsekvensLabel = (konsekvens) => {
    const labels = {
      'ingen_skade': 'Ingen skade',
      'mindre_personskade': 'Mindre personskade',
      'alvorlig_personskade': 'Alvorlig personskade',
      'materiell_skade': 'Materiell skade',
      'miljoskade': 'Miljøskade'
    };
    return labels[konsekvens] || konsekvens;
  };

  return (
    <div className="bg-white p-8 max-w-4xl">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Rapport om uønsket hendelse (RUH)
        </h1>
        <p className="text-slate-600">
          Prosjekt: {project?.name || 'Ukjent prosjekt'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Opprettet: {format(new Date(ruh.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}
        </p>
      </div>

      {/* Status og Type */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-md text-sm font-medium">
            Status: {getStatusLabel(ruh.status)}
          </span>
          {ruh.type_hendelse?.length > 0 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-md text-sm font-medium">
              {getTypeLabels(ruh.type_hendelse)}
            </span>
          )}
        </div>
      </div>

      {/* Hendelsesinfo */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Hendelsesinfo
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Dato</p>
            <p className="text-slate-900 font-medium">
              {format(new Date(ruh.dato), 'dd.MM.yyyy', { locale: nb })}
            </p>
          </div>
          {ruh.klokkeslett && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Klokkeslett</p>
              <p className="text-slate-900 font-medium">{ruh.klokkeslett}</p>
            </div>
          )}
          {ruh.adresse && (
            <div className="col-span-2">
              <p className="text-sm text-slate-500 mb-1">Adresse</p>
              <p className="text-slate-900 font-medium">{ruh.adresse}</p>
            </div>
          )}
          {ruh.rapportert_av_navn && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Rapportert av</p>
              <p className="text-slate-900 font-medium">{ruh.rapportert_av_navn}</p>
            </div>
          )}
        </div>
      </div>

      {/* Beskrivelse av hendelsen */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Beskrivelse av hendelsen
        </h2>
        <div className="space-y-4">
          {ruh.hva_skjedde && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Hva skjedde?</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.hva_skjedde}</p>
            </div>
          )}
          {ruh.hvordan_skjedde && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Hvordan skjedde det?</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.hvordan_skjedde}</p>
            </div>
          )}
          {ruh.hvor_skjedde && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Hvor skjedde det?</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.hvor_skjedde}</p>
            </div>
          )}
        </div>
      </div>

      {/* Involverte personer */}
      {ruh.involverte_personer?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Involverte personer
          </h2>
          <ul className="list-disc list-inside space-y-1">
            {ruh.involverte_personer.map((person, idx) => (
              <li key={idx} className="text-slate-900">
                {person.navn} {person.rolle && `(${person.rolle})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vitner */}
      {ruh.vitner?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Vitner
          </h2>
          <ul className="list-disc list-inside space-y-1">
            {ruh.vitner.map((vitne, idx) => (
              <li key={idx} className="text-slate-900">{vitne}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Konsekvenser */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Konsekvenser
        </h2>
        <div className="space-y-3">
          {ruh.faktisk_konsekvens && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Faktisk konsekvens</p>
              <p className="text-slate-900">{getKonsekvensLabel(ruh.faktisk_konsekvens)}</p>
            </div>
          )}
          {ruh.potensiell_konsekvens && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Potensiell konsekvens</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.potensiell_konsekvens}</p>
            </div>
          )}
          {ruh.potensiell_konsekvens_grad && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Potensiell konsekvensgrad</p>
              <p className="text-slate-900 capitalize">{ruh.potensiell_konsekvens_grad}</p>
            </div>
          )}
        </div>
      </div>

      {/* Årsaker */}
      {ruh.arsaker?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Årsaker
          </h2>
          <p className="text-slate-900">
            {ruh.arsaker.map(a => {
              const labels = {
                'manglende_opplaring': 'Manglende opplæring',
                'feil_bruk_utstyr': 'Feil bruk av utstyr',
                'manglende_sikring': 'Manglende sikring',
                'daarlig_planlegging': 'Dårlig planlegging',
                'tidsnod': 'Tidsnød',
                'brudd_rutine': 'Brudd på rutine',
                'ukjent': 'Ukjent',
                'annet': 'Annet'
              };
              return labels[a] || a;
            }).join(', ')}
          </p>
          {ruh.arsaker_annet && (
            <p className="text-slate-600 mt-2 italic">{ruh.arsaker_annet}</p>
          )}
        </div>
      )}

      {/* Tiltak */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Tiltak
        </h2>
        <div className="space-y-4">
          {ruh.umiddelbare_tiltak && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Umiddelbare tiltak</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.umiddelbare_tiltak}</p>
            </div>
          )}
          {ruh.forebyggende_tiltak && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Forebyggende tiltak</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ruh.forebyggende_tiltak}</p>
            </div>
          )}
          {ruh.tiltak_ansvarlig_navn && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Ansvarlig for tiltak</p>
              <p className="text-slate-900">{ruh.tiltak_ansvarlig_navn}</p>
            </div>
          )}
          {ruh.tiltak_frist && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Frist</p>
              <p className="text-slate-900">
                {format(new Date(ruh.tiltak_frist), 'dd.MM.yyyy', { locale: nb })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lukket info */}
      {ruh.status === 'lukket' && (
        <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-3">
            Saken er lukket
          </h2>
          <div className="space-y-2">
            {ruh.lukket_dato && (
              <p className="text-sm text-green-800">
                <span className="font-medium">Lukket dato:</span>{' '}
                {format(new Date(ruh.lukket_dato), 'dd.MM.yyyy HH:mm', { locale: nb })}
              </p>
            )}
            {ruh.lukket_av_navn && (
              <p className="text-sm text-green-800">
                <span className="font-medium">Lukket av:</span> {ruh.lukket_av_navn}
              </p>
            )}
            {ruh.lukket_kommentar && (
              <div className="mt-2">
                <p className="text-sm text-green-800 font-medium">Kommentar:</p>
                <p className="text-green-900 whitespace-pre-wrap">{ruh.lukket_kommentar}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}