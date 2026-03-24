import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toEmail, subject, body, entityType, entityId, updateData } = await req.json();

    if (!toEmail || !subject || !body) {
      return Response.json({ error: 'Mangler påkrevde felt' }, { status: 400 });
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'En Plattform <post@enplattform.no>',
        to: [toEmail],
        subject: subject,
        html: body
      })
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      return Response.json({ error: `Resend feil: ${err}` }, { status: 500 });
    }

    // Update entity if provided
    if (entityType && entityId && updateData) {
      await base44.asServiceRole.entities[entityType].update(entityId, updateData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});