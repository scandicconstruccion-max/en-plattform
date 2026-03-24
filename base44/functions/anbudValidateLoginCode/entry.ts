import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, loginCode } = await req.json();

    if (!token || !loginCode) {
      return Response.json({ error: 'Token og innloggingskode kreves' }, { status: 400 });
    }

    // Find invitation by token
    const results = await base44.asServiceRole.entities.AnbudInvitation.filter({ token });
    if (!results || results.length === 0) {
      return Response.json({ error: 'Invitasjonen ble ikke funnet.' }, { status: 404 });
    }

    const invitation = results[0];

    // Validate login code matches
    if (invitation.loginCode !== loginCode) {
      return Response.json({ valid: false });
    }

    // Check if deadline has passed (only for non-responded invitations)
    if (invitation.status !== 'RESPONDED') {
      const project = await base44.asServiceRole.entities.AnbudProject.get(invitation.anbudProjectId);
      if (project?.responseDeadline) {
        const deadline = new Date(project.responseDeadline);
        deadline.setHours(23, 59, 59, 999);
        if (new Date() > deadline) {
          return Response.json({ 
            error: 'Fristen for å levere tilbud har gått ut.' 
          }, { status: 410 });
        }
      }
    }

    return Response.json({ valid: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});