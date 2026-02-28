import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId, toEmail, subject, htmlBody, updateData } = await req.json();

    if (!toEmail || !subject || !htmlBody) {
      return Response.json({ error: 'Mangler påkrevde felt' }, { status: 400 });
    }

    // Send email via service role (can send to external emails)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject: subject,
      body: htmlBody
    });

    // Update the quote record
    if (quoteId && updateData) {
      await base44.asServiceRole.entities.Quote.update(quoteId, updateData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});