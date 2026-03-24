import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return Response.json({ error: 'Token kreves' }, { status: 400 });

    const invitations = await base44.asServiceRole.entities.VendorInvitation.filter({ token });
    if (!invitations.length) return Response.json({ error: 'Ugyldig token' }, { status: 404 });

    const invitation = invitations[0];
    const rfq = await base44.asServiceRole.entities.RFQ.get(invitation.rfq_id);

    // Mark as opened if first time
    if (invitation.status === 'sendt') {
      await base44.asServiceRole.entities.VendorInvitation.update(invitation.id, {
        status: 'apnet',
        opened_date: new Date().toISOString()
      });
    }

    // Check if already submitted
    const bids = await base44.asServiceRole.entities.VendorBid.filter({ invitation_id: invitation.id });

    return Response.json({
      rfq: {
        title: rfq.title,
        description: rfq.description,
        project_name: rfq.project_name,
        trade: rfq.trade,
        deadline: rfq.deadline,
        attachments: rfq.attachments || []
      },
      vendor_name: invitation.vendor_name,
      already_submitted: bids.length > 0,
      invitation_id: invitation.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});