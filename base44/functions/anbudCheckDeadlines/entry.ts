import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fallback: 2 days before deadline if no reminderDeadline is set
    const fallbackReminderDays = 2;

    // Get all open projects
    const allProjects = await base44.asServiceRole.entities.AnbudProject.list();
    const openProjects = allProjects.filter(p => p.status !== 'CLOSED');

    let processedInvitations = 0;
    let noResponseUpdates = 0;
    let remindersSent = 0;

    const appUrl = 'https://app.enplattform.no';

    for (const project of openProjects) {
      if (!project.responseDeadline) continue;
      const deadline = new Date(project.responseDeadline);
      deadline.setHours(0, 0, 0, 0);
      const isPastDeadline = deadline < today;

      // Determine if today is the reminder day
      let isReminderDay = false;
      if (project.reminderDeadline) {
        const reminderDate = new Date(project.reminderDeadline);
        reminderDate.setHours(0, 0, 0, 0);
        isReminderDay = reminderDate.getTime() === today.getTime();
      } else {
        // Fallback: 2 days before deadline
        const fallbackReminder = new Date(deadline);
        fallbackReminder.setDate(fallbackReminder.getDate() - fallbackReminderDays);
        isReminderDay = !isPastDeadline && fallbackReminder.getTime() === today.getTime();
      }

      // Get invitations for this project
      const invitations = await base44.asServiceRole.entities.AnbudInvitation.filter({
        anbudProjectId: project.id,
      });

      for (const inv of invitations) {
        // Mark NO_RESPONSE if past deadline and not responded
        if (isPastDeadline && (inv.status === 'INVITED' || inv.status === 'OPENED')) {
          await base44.asServiceRole.entities.AnbudInvitation.update(inv.id, {
            status: 'NO_RESPONSE',
          });
          await base44.asServiceRole.entities.AnbudActivityLog.create({
            anbudProjectId: project.id,
            activityType: 'NO_RESPONSE',
            activityText: `Ingen respons fra ${inv.supplierName} – frist passert`,
            createdBy: 'system',
          });
          noResponseUpdates++;
        }

        // Send reminder on the reminder day if supplier has not responded
        if (isReminderDay && (inv.status === 'INVITED' || inv.status === 'OPENED') && inv.supplierEmail) {
          const submissionUrl = `${appUrl}/AnbudSvar?projectId=${project.id}&invitationId=${inv.id}`;
          const deadlineStr = deadline.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: inv.supplierEmail,
            subject: `Påminnelse: Svarfrist nærmer seg – ${project.title}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">⚠️ Påminnelse om svarfrist</h2>
                <p>Hei ${inv.supplierName},</p>
                <p>Svarfristen for forespørselen <strong>${project.title}</strong> er <strong style="color:#ef4444">${deadlineStr}</strong>.</p>
                <p>Vi har ennå ikke mottatt tilbud fra dere.</p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${submissionUrl}" style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
                    Lever tilbud nå
                  </a>
                </div>
              </div>
            `,
          });

          await base44.asServiceRole.entities.AnbudActivityLog.create({
            anbudProjectId: project.id,
            activityType: 'REMINDER_SENT',
            activityText: `Påminnelse sendt til ${inv.supplierName}`,
            createdBy: 'system',
          });
          remindersSent++;
        }
      }
      processedInvitations += invitations.length;
    }

    return Response.json({ success: true, processedInvitations, noResponseUpdates, remindersSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});