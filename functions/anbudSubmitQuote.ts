import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { projectId, invitationId, price, currency, notes, fileAttachments } = await req.json();

    if (!projectId || !invitationId) {
      return Response.json({ error: 'Manglende parametere' }, { status: 400 });
    }

    const invitation = await base44.asServiceRole.entities.AnbudInvitation.get(invitationId);
    if (!invitation || invitation.anbudProjectId !== projectId) {
      return Response.json({ error: 'Ugyldig lenke.' }, { status: 400 });
    }

    if (invitation.status === 'RESPONDED') {
      return Response.json({ error: 'Tilbud er allerede levert.' }, { status: 409 });
    }

    await base44.asServiceRole.entities.AnbudQuote.create({
      anbudProjectId: projectId,
      supplierId: invitation.supplierId,
      supplierName: invitation.supplierName,
      price: price ? parseFloat(price) : null,
      currency: currency || 'NOK',
      notes: notes || '',
      fileAttachments: fileAttachments || [],
      submittedAt: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AnbudInvitation.update(invitationId, {
      status: 'RESPONDED',
      respondedAt: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AnbudActivityLog.create({
      anbudProjectId: projectId,
      activityType: 'RESPONDED',
      activityText: `Tilbud mottatt fra ${invitation.supplierName}`,
      createdBy: 'system',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});