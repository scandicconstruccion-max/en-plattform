import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      token, projectId, invitationId,
      price, currency, notes, fileAttachments,
      contactName, contactEmail, contactPhone, companyName,
    } = await req.json();

    // Resolve invitation by token or by IDs (legacy)
    let invitation;
    if (token) {
      const results = await base44.asServiceRole.entities.AnbudInvitation.filter({ token });
      if (!results || results.length === 0) {
        return Response.json({ error: 'Token er utløpt eller ugyldig. Kontakt prosjektleder.' }, { status: 400 });
      }
      invitation = results[0];
    } else if (projectId && invitationId) {
      invitation = await base44.asServiceRole.entities.AnbudInvitation.get(invitationId);
      if (!invitation || invitation.anbudProjectId !== projectId) {
        return Response.json({ error: 'Token er utløpt eller ugyldig. Kontakt prosjektleder.' }, { status: 400 });
      }
    } else {
      return Response.json({ error: 'Manglende parametere' }, { status: 400 });
    }

    if (invitation.status === 'RESPONDED') {
      return Response.json({ error: 'Tilbud er allerede levert for denne forespørselen.' }, { status: 409 });
    }

    // Check deadline
    const project = await base44.asServiceRole.entities.AnbudProject.get(invitation.anbudProjectId);
    if (project?.responseDeadline) {
      const deadline = new Date(project.responseDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline) {
        return Response.json({ error: 'Fristen for å levere tilbud har gått ut.' }, { status: 410 });
      }
    }

    const supplierDisplayName = companyName || invitation.supplierName;

    // Create the quote
    await base44.asServiceRole.entities.AnbudQuote.create({
      anbudProjectId: invitation.anbudProjectId,
      supplierId: invitation.supplierId,
      supplierName: supplierDisplayName,
      contactName: contactName || null,
      contactEmail: contactEmail || invitation.supplierEmail || null,
      contactPhone: contactPhone || null,
      price: price ? parseFloat(price) : null,
      currency: currency || 'NOK',
      notes: notes || '',
      fileAttachments: fileAttachments || [],
      submittedAt: new Date().toISOString(),
    });

    // Update invitation status
    await base44.asServiceRole.entities.AnbudInvitation.update(invitation.id, {
      status: 'RESPONDED',
      respondedAt: new Date().toISOString(),
    });

    // Log activity
    await base44.asServiceRole.entities.AnbudActivityLog.create({
      anbudProjectId: invitation.anbudProjectId,
      activityType: 'RESPONDED',
      activityText: `Tilbud mottatt fra ${supplierDisplayName}${contactEmail ? ` (${contactEmail})` : ''}`,
      createdBy: 'system',
    });

    // Send notification to project creator / responsible person
    // Use built-in created_by field (email) since createdBy data field is often null
    const notifyEmail = project?.created_by;
    if (notifyEmail && !notifyEmail.includes('service+')) {
      await base44.asServiceRole.entities.Notification.create({
        userEmail: notifyEmail,
        module: 'Anbud',
        type: 'info',
        title: 'Tilbud mottatt',
        message: `${supplierDisplayName} har levert tilbud på «${project.title}»`,
        link: `/Anbudsmodul`,
        entityId: invitation.anbudProjectId,
        status: 'unread',
        eventTime: new Date().toISOString(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});