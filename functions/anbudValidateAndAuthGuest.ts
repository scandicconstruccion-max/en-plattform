import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token mangler' }, { status: 400 });
    }

    // Validate token exists and is linked to invitation
    const results = await base44.asServiceRole.entities.AnbudInvitation.filter({ token });
    if (!results || results.length === 0) {
      return Response.json({ error: 'Token er utløpt eller ugyldig.' }, { status: 404 });
    }

    const invitation = results[0];

    // Validate project exists and deadline not passed
    const project = await base44.asServiceRole.entities.AnbudProject.get(invitation.anbudProjectId);
    if (!project) {
      return Response.json({ error: 'Forespørselen ble ikke funnet.' }, { status: 404 });
    }

    // Check deadline (allow if already responded)
    if (project.responseDeadline && invitation.status !== 'RESPONDED') {
      const deadline = new Date(project.responseDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline) {
        return Response.json({ error: 'Fristen for å levere tilbud har gått ut.' }, { status: 410 });
      }
    }

    // Check if already responded
    if (invitation.status === 'RESPONDED') {
      return Response.json({ 
        error: 'Tilbud er allerede levert for denne forespørselen.' 
      }, { status: 409 });
    }

    // Create or get guest user for this supplier
    const guestEmail = `guest-${invitation.supplierId}@anbud.local`;
    
    // Check if guest user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: guestEmail });
    let guestUser;

    if (existingUsers && existingUsers.length > 0) {
      guestUser = existingUsers[0];
    } else {
      // Create new guest user with UE_GUEST role
      guestUser = await base44.asServiceRole.entities.User.create({
        full_name: invitation.supplierName,
        email: guestEmail,
        role: 'UE_GUEST',
        assigned_projects: [invitation.anbudProjectId],
        managed_projects: [],
        custom_module_access: [],
        is_active: true,
        last_login: new Date().toISOString(),
      });
    }

    // Mark invitation as OPENED if first time
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
      success: true,
      guestUser: {
        id: guestUser.id,
        email: guestUser.email,
        role: guestUser.role,
      },
      invitation: {
        id: invitation.id,
        supplierId: invitation.supplierId,
        supplierName: invitation.supplierName,
        supplierEmail: invitation.supplierEmail,
        loginCode: invitation.loginCode,
        anbudProjectId: invitation.anbudProjectId,
        token: token,
      },
      project: {
        title: project.title,
        description: project.description,
        tradeType: project.tradeType,
        responseDeadline: project.responseDeadline,
        fileAttachments: project.fileAttachments || [],
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});