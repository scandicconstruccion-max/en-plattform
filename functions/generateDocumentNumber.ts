import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, orderId } = await req.json();
    const year = new Date().getFullYear();

    if (type === 'quote') {
      // TIL-2026-0042-REV00
      const quotes = await base44.asServiceRole.entities.Quote.list('-created_date', 500);
      const thisYearQuotes = quotes.filter(q => {
        const num = q.quote_number || '';
        return num.startsWith(`TIL-${year}-`) && !q.parent_quote_id;
      });
      const maxSeq = thisYearQuotes.reduce((max, q) => {
        const match = q.quote_number?.match(/TIL-\d{4}-(\d{4})/);
        const seq = match ? parseInt(match[1]) : 0;
        return Math.max(max, seq);
      }, 0);
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      return Response.json({ documentNumber: `TIL-${year}-${nextSeq}-REV00`, baseNumber: `TIL-${year}-${nextSeq}`, sequenceNumber: maxSeq + 1 });

    } else if (type === 'quote_revision') {
      // Revisjon av eksisterende tilbud
      const { baseNumber, currentRevision } = await req.json().catch(() => ({})) || {};
      const body = await req.clone().json().catch(() => ({}));
      const base = body.baseNumber;
      const currentRev = body.currentRevision ?? 0;
      const nextRev = currentRev + 1;
      const revStr = String(nextRev).padStart(2, '0');
      return Response.json({ documentNumber: `${base}-REV${revStr}`, revisionNumber: nextRev });

    } else if (type === 'order') {
      // ORD-2026-0018
      const orders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
      const thisYearOrders = orders.filter(o => {
        const num = o.order_number || '';
        return num.startsWith(`ORD-${year}-`);
      });
      const maxSeq = thisYearOrders.reduce((max, o) => {
        const match = o.order_number?.match(/ORD-\d{4}-(\d{4})/);
        const seq = match ? parseInt(match[1]) : 0;
        return Math.max(max, seq);
      }, 0);
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      return Response.json({ documentNumber: `ORD-${year}-${nextSeq}` });

    } else if (type === 'change') {
      // ORD-2026-0018-EM01
      if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });
      const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      const changes = await base44.asServiceRole.entities.ChangeNotification.filter({ order_id: orderId }, '-created_date', 100);
      const maxEm = changes.reduce((max, c) => {
        const match = c.document_number?.match(/-EM(\d+)$/);
        const seq = match ? parseInt(match[1]) : 0;
        return Math.max(max, seq);
      }, 0);
      const nextEm = String(maxEm + 1).padStart(2, '0');
      return Response.json({ documentNumber: `${order.order_number}-EM${nextEm}` });

    } else if (type === 'deviation') {
      // AV-2026-0147
      const deviations = await base44.asServiceRole.entities.Deviation.list('-created_date', 1000);
      const thisYearDeviations = deviations.filter(d => {
        const num = d.deviation_number || '';
        return num.startsWith(`AV-${year}-`);
      });
      const maxSeq = thisYearDeviations.reduce((max, d) => {
        const match = d.deviation_number?.match(/AV-\d{4}-(\d{4})/);
        const seq = match ? parseInt(match[1]) : 0;
        return Math.max(max, seq);
      }, 0);
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      return Response.json({ documentNumber: `AV-${year}-${nextSeq}` });

    } else if (type === 'project') {
      // 0001, 0002, ...
      const projects = await base44.asServiceRole.entities.Project.list('-created_date', 1000);
      const maxSeq = projects.reduce((max, p) => {
        const match = p.project_number?.match(/^(\d{4})$/);
        const seq = match ? parseInt(match[1]) : 0;
        return Math.max(max, seq);
      }, 0);
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      return Response.json({ documentNumber: nextSeq });

    } else {
      return Response.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});