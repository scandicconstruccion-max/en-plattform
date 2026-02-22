import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function RisikoanalysePDFView({ analyse, project }) {
  const getRisikonivaTekst = (niva) => {
    if (niva <= 2) return 'Lav';
    if (niva <= 4) return 'Middels';
    if (niva <= 6) return 'Høy';
    return 'Kritisk';
  };

  const getKategoriLabel = (kategori) => {
    const labels = {
      'fall_hoyde': 'Fall fra høyde',
      'klem_kutt': 'Klem-/kuttskader',
      'elektrisk': 'Elektrisk fare',
      'brann_eksplosjon': 'Brann/eksplosjon',
      'kjemikalier_stov': 'Kjemikalier/støv',
      'ergonomi_tunge_loft': 'Ergonomi/tunge løft',
      'maskiner_kjoretoy': 'Maskiner/kjøretøy',
      'ytre_forhold_vaer': 'Ytre forhold/vær',
      'samordning': 'Samordning',
      'annet': 'Annet'
    };
    return labels[kategori] || kategori;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'apen': 'Åpen',
      'under_arbeid': 'Under arbeid',
      'lukket': 'Lukket'
    };
    return labels[status] || status;
  };

  return (
    <div className="bg-white p-8 max-w-4xl">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Risikoanalyse
        </h1>
        <p className="text-slate-600">
          Prosjekt: {project?.name || 'Ukjent prosjekt'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Opprettet: {analyse.created_date ? format(new Date(analyse.created_date), 'dd.MM.yyyy HH:mm', { locale: nb }) : '-'}
        </p>
      </div>

      {/* Status og Risikonivå */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-md text-sm font-medium">
            Status: {getStatusLabel(analyse.status)}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-md text-sm font-medium">
            Risikonivå: {getRisikonivaTekst(analyse.risikoniva)} ({analyse.risikoniva})
          </span>
        </div>
      </div>

      {/* Grunninformasjon */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Grunninformasjon
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Dato for analyse</p>
            <p className="text-slate-900 font-medium">
              {analyse.dato_analyse ? format(new Date(analyse.dato_analyse), 'dd.MM.yyyy', { locale: nb }) : '-'}
            </p>
          </div>
          {analyse.adresse && (
            <div className="col-span-2">
              <p className="text-sm text-slate-500 mb-1">Adresse/lokasjon</p>
              <p className="text-slate-900 font-medium">{analyse.adresse}</p>
            </div>
          )}
          {analyse.ansvarlig_navn && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Ansvarlig</p>
              <p className="text-slate-900 font-medium">{analyse.ansvarlig_navn}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-sm text-slate-500 mb-1">Arbeidsoperasjon/aktivitet</p>
            <p className="text-slate-900 font-medium">{analyse.arbeidsoperasjon}</p>
          </div>
        </div>
      </div>

      {/* Deltakere */}
      {analyse.deltakere?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Deltakere
          </h2>
          <ul className="list-disc list-inside space-y-1">
            {analyse.deltakere.map((person, idx) => (
              <li key={idx} className="text-slate-900">
                {person.navn} {person.epost && `(${person.epost})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risiko */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Identifisering av farer/risikoer
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-500 mb-1 font-medium">Beskrivelse</p>
            <p className="text-slate-900 whitespace-pre-wrap">{analyse.risiko_beskrivelse}</p>
          </div>
          {analyse.kategorier?.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Kategorier</p>
              <p className="text-slate-900">
                {analyse.kategorier.map(k => getKategoriLabel(k)).join(', ')}
              </p>
            </div>
          )}
          {analyse.kategori_annet && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Annet</p>
              <p className="text-slate-900">{analyse.kategori_annet}</p>
            </div>
          )}
        </div>
      </div>

      {/* Risikovurdering */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Risikovurdering
        </h2>
        <div className="space-y-3">
          {analyse.potensielt_utfall && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Potensielt utfall</p>
              <p className="text-slate-900 whitespace-pre-wrap">{analyse.potensielt_utfall}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Konsekvens</p>
              <p className="text-slate-900">
                {analyse.konsekvens === 1 && 'Lav (ingen skade)'}
                {analyse.konsekvens === 2 && 'Middels (mindre skade)'}
                {analyse.konsekvens === 3 && 'Høy (alvorlig skade)'}
                {analyse.konsekvens === 4 && 'Kritisk (død eller store skader)'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Sannsynlighet</p>
              <p className="text-slate-900">
                {analyse.sannsynlighet === 1 && 'Lav (1–2 ganger/år)'}
                {analyse.sannsynlighet === 2 && 'Middels (1–2 ganger/måned)'}
                {analyse.sannsynlighet === 3 && 'Høy (1–2 ganger/uke)'}
              </p>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <p className="text-sm text-slate-500 mb-1 font-medium">Risikonivå (beregnet)</p>
            <p className="text-slate-900 font-bold">
              {getRisikonivaTekst(analyse.risikoniva)} - {analyse.konsekvens} × {analyse.sannsynlighet} = {analyse.risikoniva}
            </p>
          </div>
        </div>
      </div>

      {/* Tiltak */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          Tiltak/forebygging
        </h2>
        <div className="space-y-3">
          {analyse.tiltak_beskrivelse && (
            <div>
              <p className="text-sm text-slate-500 mb-1 font-medium">Beskrivelse av tiltak</p>
              <p className="text-slate-900 whitespace-pre-wrap">{analyse.tiltak_beskrivelse}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {analyse.tiltak_ansvarlig_navn && (
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Ansvarlig</p>
                <p className="text-slate-900">{analyse.tiltak_ansvarlig_navn}</p>
              </div>
            )}
            {analyse.tiltak_frist && (
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Frist</p>
                <p className="text-slate-900">
                  {analyse.tiltak_frist ? format(new Date(analyse.tiltak_frist), 'dd.MM.yyyy', { locale: nb }) : '-'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Oppfølging ved lukking */}
      {analyse.status === 'lukket' && (
        <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-3">
            Oppfølging
          </h2>
          <div className="space-y-2">
            {analyse.lukket_dato && (
              <p className="text-sm text-green-800">
                <span className="font-medium">Lukket dato:</span>{' '}
                {analyse.lukket_dato ? format(new Date(analyse.lukket_dato), 'dd.MM.yyyy HH:mm', { locale: nb }) : '-'}
              </p>
            )}
            {analyse.lukket_av_navn && (
              <p className="text-sm text-green-800">
                <span className="font-medium">Lukket av:</span> {analyse.lukket_av_navn}
              </p>
            )}
            {analyse.lukket_kommentar && (
              <div className="mt-2">
                <p className="text-sm text-green-800 font-medium">Kommentar:</p>
                <p className="text-green-900 whitespace-pre-wrap">{analyse.lukket_kommentar}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}