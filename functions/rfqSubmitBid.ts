import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, comment, attachments } = await req.json();

    if (!token) return Response.json({ error: 'Token kreves' }, { status: 400 });

    // Find invitation by token
    const invitations = await base44.asServiceRole.entities.VendorInvitation.filter({ token });
    if (!invitations.length) return Response.json({ error: 'Ugyldig token' }, { status: 404 });

    const invitation = invitations[0];

    // Create bid
    await base44.asServiceRole.entities.VendorBid.create({
      rfq_id: invitation.rfq_id,
      invitation_id: invitation.id,
      vendor_id: invitation.vendor_id,
      vendor_name: invitation.vendor_name,
      comment,
      attachments: attachments || [],
      received_date: new Date().toISOString(),
      is_selected: false
    });

    // Update invitation status
    await base44.asServiceRole.entities.VendorInvitation.update(invitation.id, {
      status: 'besvart'
    });

    // Update RFQ status if still 'sendt'
    const rfq = await base44.asServiceRole.entities.RFQ.get(invitation.rfq_id);
    if (rfq.status === 'sendt') {
      await base44.asServiceRole.entities.RFQ.update(invitation.rfq_id, { status: 'tilbud_mottas' });
    }

    // Notify responsible person
    if (rfq.responsible_person) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: rfq.responsible_person,
        subject: `Nytt tilbud mottatt: ${rfq.title}`,
        body: `<p>Du har mottatt et nytt tilbud fra <strong>${invitation.vendor_name}</strong> på forespørsel <strong>${rfq.title}</strong>.</p>`
      });
    }

    return Response.json({ success: true, message: 'Tilbud mottatt' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});