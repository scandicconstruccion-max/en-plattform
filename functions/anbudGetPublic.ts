import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both token-based (new) and id-based (legacy) lookup
    const { token, projectId, invitationId } = body;

    let invitation;

    if (token) {
      const results = await base44.asServiceRole.entities.AnbudInvitation.filter({ token });
      if (!results || results.length === 0) {
        return Response.json({ error: 'Ugyldig eller utløpt lenke.' }, { status: 404 });
      }
      invitation = results[0];
    } else if (projectId && invitationId) {
      invitation = await base44.asServiceRole.entities.AnbudInvitation.get(invitationId);
      if (!invitation || invitation.anbudProjectId !== projectId) {
        return Response.json({ error: 'Ugyldig lenke.' }, { status: 400 });
      }
    } else {
      return Response.json({ error: 'Manglende parametere' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.AnbudProject.get(invitation.anbudProjectId);
    if (!project) {
      return Response.json({ error: 'Forespørselen ble ikke funnet.' }, { status: 404 });
    }

    // Check if past deadline
    if (project.responseDeadline) {
      const deadline = new Date(project.responseDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline && invitation.status !== 'RESPONDED') {
        return Response.json({ error: 'Fristen for å levere tilbud har gått ut.' }, { status: 410 });
      }
    }

    // Mark as OPENED if first time
    if (invitation.status === 'INVITED') {
      await base44.asServiceRole.entities.AnbudInvitation.update(invitation.id, {
        status: 'OPENED',
        openedAt: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.AnbudActivityLog.create({
        anbudProjectId: invitation.anbudProjectId,
        activityType: 'OPENED',
        activityText: `${invitation.supplierName} åpnet forespørselen`,
        createdBy: 'system',
      });
    }

    return Response.json({
      project: {
        title: project.title,
        description: project.description,
        tradeType: project.tradeType,
        responseDeadline: project.responseDeadline,
        fileAttachments: project.fileAttachments || [],
      },
      invitation: {
        id: invitation.id,
        supplierName: invitation.supplierName,
        supplierId: invitation.supplierId,
        supplierEmail: invitation.supplierEmail,
        status: invitation.status,
        projectId: invitation.anbudProjectId,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});