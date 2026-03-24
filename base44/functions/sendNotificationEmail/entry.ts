import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Only handle create events
    if (payload.event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const notification = payload.data;
    if (!notification) {
      return Response.json({ skipped: true, reason: 'no data' });
    }

    // Find the user this notification is for
    const userEmail = notification.userEmail;
    if (!userEmail) {
      return Response.json({ skipped: true, reason: 'no userEmail on notification' });
    }

    // Look up the user to check their email notification settings
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    const user = users?.[0];

    if (!user?.email_notifications_enabled) {
      return Response.json({ skipped: true, reason: 'email notifications not enabled for user' });
    }

    const targetEmail = user.notification_email || userEmail;

    const typeLabels = { info: 'Info', warning: 'Advarsel', critical: 'Kritisk' };
    const typeColors = { info: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
    const typeLabel = typeLabels[notification.type] || 'Info';
    const typeColor = typeColors[notification.type] || '#10b981';

    const subject = `[${notification.module}] ${notification.title}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${typeColor}; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0;">
          <strong>${typeLabel} – ${notification.module}</strong>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1e293b;">${notification.title}</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">${notification.message}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Du mottar denne e-posten fordi du har aktivert e-postvarsler i En Plattform.<br/>
            For å endre innstillinger, gå til Varsler i appen.
          </p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetEmail,
      subject,
      body,
      from_name: 'En Plattform Varsler',
    });

    return Response.json({ sent: true, to: targetEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});