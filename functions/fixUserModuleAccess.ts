import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email } = await req.json();

  const users = await base44.asServiceRole.entities.User.filter({ email });
  if (!users || users.length === 0) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const targetUser = users[0];
  await base44.asServiceRole.entities.User.update(targetUser.id, {
    custom_module_access: []
  });

  return Response.json({ success: true, userId: targetUser.id });
});