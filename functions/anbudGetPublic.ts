import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { projectId, invitationId } = await req.json();

    if (!projectId || !invitationId) {
      return Response.json({ error: 'Manglende parametere' }, { status: 400 });
    }

    const [project, invitation] = await Promise.all([
      base44.asServiceRole.entities.AnbudProject.get(projectId),
      base44.asServiceRole.entities.AnbudInvitation.get(invitationId),
    ]);

    if (!project || !invitation) {
      return Response.json({ error: 'Forespørselen ble ikke funnet.' }, { status: 404 });
    }

    if (invitation.anbudProjectId !== projectId) {
      return Response.json({ error: 'Ugyldig lenke.' }, { status: 400 });
    }

    // Mark as OPENED if not already
    if (invitation.status === 'INVITED') {
      await base44.asServiceRole.entities.AnbudInvitation.update(invitationId, {
        status: 'OPENED',
        openedAt: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.AnbudActivityLog.create({
        anbudProjectId: projectId,
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
        status: invitation.status,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});