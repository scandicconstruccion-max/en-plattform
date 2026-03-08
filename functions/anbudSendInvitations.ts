import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { anbudProjectId, supplierIds, resend } = await req.json();

    // Fetch the project
    const project = await base44.entities.AnbudProject.get(anbudProjectId);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // Fetch suppliers
    const allSuppliers = await base44.entities.AnbudSupplier.list();
    const suppliers = allSuppliers.filter(s => supplierIds.includes(s.id));

    const appUrl = req.headers.get('x-app-url') || req.headers.get('origin') || 'https://app.enplattform.no';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const results = [];

    for (const supplier of suppliers) {
      // Check if invitation already exists
      const existing = await base44.entities.AnbudInvitation.filter({
        anbudProjectId,
        supplierId: supplier.id,
      });

      let invitation;
      if (existing.length > 0) {
        if (!resend) {
          results.push({ supplierId: supplier.id, status: 'already_invited' });
          continue;
        }
        // Resend: reuse existing invitation, reset status to INVITED
        invitation = existing[0];
        await base44.entities.AnbudInvitation.update(invitation.id, {
          status: 'INVITED',
          invitedAt: new Date().toISOString(),
        });
      } else {
        // Create new invitation
        invitation = await base44.entities.AnbudInvitation.create({
          anbudProjectId,
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierEmail: supplier.email,
          invitedAt: new Date().toISOString(),
          status: 'INVITED',
        });
      }

      // Build submission URL
      const submissionUrl = `${appUrl}/AnbudSvar?projectId=${anbudProjectId}&invitationId=${invitation.id}`;

      // Build file links
      const fileLinks = (project.fileAttachments || [])
        .map(f => `<li><a href="${f.url}">${f.name}</a></li>`)
        .join('');

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Forespørsel om tilbud</h2>
          <p>Hei ${supplier.contactPerson || supplier.name},</p>
          <p>Du er invitert til å levere tilbud på følgende forespørsel:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Prosjekt/Tittel:</td><td style="padding: 8px;">${project.title}</td></tr>
            <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; color: #64748b;">Fagområde:</td><td style="padding: 8px;">${project.tradeType || '–'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Svarfrist:</td><td style="padding: 8px; color: #ef4444; font-weight: bold;">${project.responseDeadline || 'Ikke angitt'}</td></tr>
          </table>
          ${project.description ? `<p style="background:#f8fafc;padding:12px;border-radius:8px;">${project.description}</p>` : ''}
          ${fileLinks ? `<p><strong>Vedlegg:</strong></p><ul>${fileLinks}</ul>` : ''}
          <div style="margin: 32px 0; text-align: center;">
            <a href="${submissionUrl}" style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Lever tilbud her
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Denne lenken er personlig og knyttet til din bedrift. Del den ikke med andre.</p>
        </div>
      `;

      // Send via Resend
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'En Plattform <post@enplattform.no>',
          to: [supplier.email],
          subject: `Forespørsel om tilbud: ${project.title}`,
          html: emailBody,
        }),
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        console.error('Resend error for', supplier.email, errData);
        results.push({ supplierId: supplier.id, status: 'email_failed', error: errData.message });
        continue;
      }

      // Log activity
      await base44.entities.AnbudActivityLog.create({
        anbudProjectId,
        activityType: 'INVITE_SENT',
        activityText: resend
          ? `Invitasjon sendt på nytt til ${supplier.name} (${supplier.email})`
          : `Invitasjon sendt til ${supplier.name} (${supplier.email})`,
        createdBy: user.email,
      });

      results.push({ supplierId: supplier.id, status: 'invited', invitationId: invitation.id });
    }

    // Update project status to SENT if it was DRAFT
    if (project.status === 'DRAFT') {
      await base44.entities.AnbudProject.update(anbudProjectId, { status: 'SENT' });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});