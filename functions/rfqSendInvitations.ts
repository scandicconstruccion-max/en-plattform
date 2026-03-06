import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfq_id, vendor_ids } = await req.json();
    if (!rfq_id || !vendor_ids?.length) {
      return Response.json({ error: 'rfq_id og vendor_ids kreves' }, { status: 400 });
    }

    const rfq = await base44.entities.RFQ.get(rfq_id);
    const appUrl = req.headers.get('origin') || 'https://app.base44.com';

    const results = [];

    for (const vendor_id of vendor_ids) {
      const vendor = await base44.entities.Vendor.get(vendor_id);

      // Generate unique token
      const token = crypto.randomUUID().replace(/-/g, '');

      // Create invitation record
      const invitation = await base44.entities.VendorInvitation.create({
        rfq_id,
        vendor_id,
        vendor_name: vendor.company_name,
        vendor_email: vendor.email,
        status: 'sendt',
        token,
        sent_date: new Date().toISOString()
      });

      const submitUrl = `${appUrl}/BidSubmit?token=${token}`;
      const deadline = rfq.deadline ? new Date(rfq.deadline).toLocaleDateString('nb-NO') : 'Ikke satt';

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Forespørsel om tilbud</h2>
          <p>Hei ${vendor.contact_person || vendor.company_name},</p>
          <p>Du er invitert til å gi tilbud på følgende forespørsel:</p>
          
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong>Tittel:</strong> ${rfq.title}<br/>
            ${rfq.project_name ? `<strong>Prosjekt:</strong> ${rfq.project_name}<br/>` : ''}
            ${rfq.trade ? `<strong>Fagområde:</strong> ${rfq.trade}<br/>` : ''}
            <strong>Svarfrist:</strong> ${deadline}<br/>
            ${rfq.description ? `<strong>Beskrivelse:</strong><br/>${rfq.description}` : ''}
          </div>

          ${rfq.attachments?.length ? `<p><strong>Vedlegg:</strong><br/>${rfq.attachments.map(a => `<a href="${a.url}">${a.name}</a>`).join('<br/>')}</p>` : ''}

          <p style="margin-top: 24px;">
            <a href="${submitUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Send inn tilbud
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">Denne lenken er unik for din bedrift og kan ikke deles.</p>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: vendor.email,
        subject: `Forespørsel om tilbud: ${rfq.title}`,
        body: emailBody
      });

      results.push({ vendor_id, invitation_id: invitation.id, status: 'sent' });
    }

    // Update RFQ status to 'sendt'
    await base44.entities.RFQ.update(rfq_id, {
      status: 'sendt',
      invited_vendors: vendor_ids,
      sent_date: new Date().toISOString()
    });

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});