import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invitationId } = await req.json();

    const invitation = await base44.entities.AnbudInvitation.get(invitationId);
    if (!invitation) return Response.json({ error: 'Invitation not found' }, { status: 404 });

    const project = await base44.entities.AnbudProject.get(invitation.anbudProjectId);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Invitasjon trukket tilbake</h2>
        <p>Hei ${invitation.supplierName},</p>
        <p>Vi informerer om at invitasjonen til å levere tilbud på følgende forespørsel er trukket tilbake:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Forespørsel:</td><td style="padding: 8px;">${project?.title || invitation.anbudProjectId}</td></tr>
          ${project?.tradeType ? `<tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; color: #64748b;">Fagområde:</td><td style="padding: 8px;">${project.tradeType}</td></tr>` : ''}
        </table>
        <p style="color: #64748b;">Du trenger ikke foreta deg noe. Ta gjerne kontakt med oss dersom du har spørsmål.</p>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">Med vennlig hilsen<br>${user.full_name || user.email}</p>
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'En Plattform <post@enplattform.no>',
        to: [invitation.supplierEmail],
        subject: `Invitasjon trukket tilbake: ${project?.title || ''}`,
        html: emailBody,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json();
      console.error('Resend error:', errData);
    }

    // Log activity
    await base44.entities.AnbudActivityLog.create({
      anbudProjectId: invitation.anbudProjectId,
      activityType: 'INVITE_WITHDRAWN',
      activityText: `Invitasjon trukket tilbake for ${invitation.supplierName} (${invitation.supplierEmail})`,
      createdBy: user.email,
    });

    // Delete the invitation
    await base44.entities.AnbudInvitation.delete(invitationId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});