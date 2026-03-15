import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ekstrakostnad_id } = await req.json();
    if (!ekstrakostnad_id) {
      return Response.json({ error: 'Mangler ekstrakostnad_id' }, { status: 400 });
    }

    const [ek] = await base44.asServiceRole.entities.Ekstrakostnad.filter({ id: ekstrakostnad_id });
    if (!ek) {
      return Response.json({ error: 'Ekstrakostnad ikke funnet' }, { status: 404 });
    }

    const tidsplanLabels = {
      nei: 'Ingen forsinkelse',
      '1_dag': 'Forsinkelse 1 dag',
      '2_3_dager': 'Forsinkelse 2-3 dager',
      flere_dager: 'Forsinkelse flere dager'
    };

    const baseUrl = req.headers.get('origin') || 'https://app.base44.com';
    const godkjennUrl = `${baseUrl}/GodkjennEkstrakostnad?token=${ek.godkjennings_token}&action=godkjenn`;
    const avvisUrl = `${baseUrl}/GodkjennEkstrakostnad?token=${ek.godkjennings_token}&action=avvis`;
    const sporUrl = `${baseUrl}/GodkjennEkstrakostnad?token=${ek.godkjennings_token}&action=spor`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1E3A5F;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Avvik krever din godkjenning</h1>
      <p style="color:#a0c4e8;margin:8px 0 0;">Prosjekt: ${ek.prosjekt_navn || ''}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">Hei,</p>
      <p style="color:#374151;">Et avvik på ditt prosjekt <strong>${ek.prosjekt_navn || ''}</strong> krever godkjenning av merkostnad.</p>

      <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:20px 0;">
        <h3 style="color:#1e293b;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">Avvik-detaljer</h3>
        <p style="margin:4px 0;color:#475569;"><strong>Avvik:</strong> ${ek.avvik_tittel || ''} ${ek.avvik_nummer ? '(#' + ek.avvik_nummer + ')' : ''}</p>
        <p style="margin:4px 0;color:#475569;"><strong>Kategori:</strong> ${ek.avvik_kategori || '-'}</p>
      </div>

      <div style="background:#fff7ed;border:2px solid #ea580c;border-radius:8px;padding:20px;margin:20px 0;">
        <h3 style="color:#9a3412;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">Merkostnad</h3>
        <p style="margin:4px 0;color:#9a3412;font-size:24px;font-weight:700;">${ek.belop?.toLocaleString('nb-NO')} kr</p>
        <p style="margin:8px 0;color:#7c2d12;"><strong>Årsak:</strong> ${ek.arsak || ''}</p>
        <p style="margin:4px 0;color:#7c2d12;"><strong>Tidsplan:</strong> ${tidsplanLabels[ek.tidsplan_pavirkning] || 'Ingen forsinkelse'}</p>
      </div>

      <p style="color:#374151;font-size:15px;font-weight:600;margin-bottom:16px;">Vennligst godkjenn eller avvis merkostnaden:</p>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <a href="${godkjennUrl}" style="display:block;text-align:center;background:#16a34a;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">✓ Godkjenn merkostnad</a>
        <a href="${avvisUrl}" style="display:block;text-align:center;background:#dc2626;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">✗ Avvis merkostnad</a>
        <a href="${sporUrl}" style="display:block;text-align:center;background:#6b7280;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">? Spør om mer informasjon</a>
      </div>

      <p style="color:#9ca3af;font-size:13px;margin-top:24px;">Lenken er gyldig i 7 dager. Har du spørsmål, kontakt oss direkte.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Sendt fra En Plattform</p>
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ek.kunde_epost,
      subject: `Avvik på ditt prosjekt krever godkjenning – ${ek.prosjekt_navn || ''}`,
      body: emailBody
    });

    await base44.asServiceRole.entities.Ekstrakostnad.update(ekstrakostnad_id, {
      epost_sendt_dato: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});