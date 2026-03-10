import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

const statusLabels = {
  ok: '✓ OK',
  avvik: '⚠ Avvik',
  ikke_ok: '⚠ Avvik',
  ikke_relevant: '— Ikke relevant',
  ikke_kontrollert: '? Ikke kontrollert'
};

const statusColors = {
  ok: '#16a34a',
  avvik: '#dc2626',
  ikke_ok: '#dc2626',
  ikke_relevant: '#6b7280',
  ikke_kontrollert: '#94a3b8'
};

function getAllItems(checklist) {
  const result = [];
  if (checklist.sections?.length > 0) {
    let globalIdx = 0;
    for (const section of checklist.sections) {
      result.push({ type: 'section', title: section.title, description: section.description });
      for (const item of (section.items || [])) {
        const response = checklist.responses?.find(r => r.item_order === globalIdx);
        result.push({ type: 'item', item, response, globalIdx });
        globalIdx++;
      }
    }
  } else {
    for (let i = 0; i < (checklist.items || []).length; i++) {
      const item = checklist.items[i];
      const response = checklist.responses?.find(r => r.item_order === i);
      result.push({ type: 'item', item, response, globalIdx: i });
    }
  }
  return result;
}

export function generateChecklistPDF(checklist, projectName) {
  const totalItems = checklist.sections?.reduce((s, sec) => s + (sec.items?.length || 0), 0) || checklist.items?.length || 0;
  const controlled = checklist.responses?.filter(r => r.status && r.status !== 'ikke_kontrollert').length || 0;
  const avvik = checklist.responses?.filter(r => r.status === 'avvik' || r.status === 'ikke_ok').length || 0;
  const allEntries = getAllItems(checklist);

  const formatDate = (d) => {
    try { return format(new Date(d), 'dd.MM.yyyy HH:mm', { locale: nb }); } catch { return d || ''; }
  };

  const itemsHtml = allEntries.map(entry => {
    if (entry.type === 'section') {
      return `
        <div style="margin-top:20px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #10b981;">
          <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">${entry.title || ''}</h3>
          ${entry.description ? `<p style="font-size:11px;color:#64748b;margin:2px 0 0;">${entry.description}</p>` : ''}
        </div>
      `;
    }

    const { item, response } = entry;
    const status = response?.status || 'ikke_kontrollert';
    const color = statusColors[status] || '#94a3b8';
    const label = statusLabels[status] || status;

    const imageHtml = response?.images?.length > 0
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
          ${(response.images || []).map(img => {
            const url = typeof img === 'string' ? img : img.url;
            return `<img src="${url}" style="height:80px;width:120px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;" />`;
          }).join('')}
        </div>`
      : '';

    const commentHtml = response?.comment
      ? `<p style="font-size:11px;color:#475569;background:#f8fafc;border-left:3px solid #e2e8f0;padding:4px 8px;margin-top:4px;border-radius:2px;">
          💬 "${response.comment}"
          ${response.comment_by_name ? `<span style="color:#94a3b8;"> — ${response.comment_by_name}</span>` : ''}
        </p>`
      : '';

    const respondedHtml = response?.responded_by
      ? `<p style="font-size:10px;color:#94a3b8;margin-top:2px;">Utført av: ${response.responded_by_name || response.responded_by}${response.responded_date ? ' — ' + formatDate(response.responded_date) : ''}</p>`
      : '';

    return `
      <div style="margin-bottom:10px;padding:10px 12px;border-radius:6px;border-left:4px solid ${color};background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <p style="font-size:12px;font-weight:600;color:#1e293b;margin:0;">${item.title}</p>
            ${item.description ? `<p style="font-size:11px;color:#64748b;margin:2px 0 0;">${item.description}</p>` : ''}
          </div>
          <span style="font-size:11px;font-weight:600;color:${color};white-space:nowrap;margin-left:12px;">${label}</span>
        </div>
        ${commentHtml}
        ${imageHtml}
        ${respondedHtml}
        ${response?.deviation_id ? `<p style="font-size:10px;color:#dc2626;margin-top:2px;">⚠ Avvik registrert i avviksmodulen</p>` : ''}
      </div>
    `;
  }).join('');

  const signaturesHtml = checklist.signatures?.length > 0
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 10px;">Signaturer</h3>
        ${checklist.signatures.map(sig => `
          <div style="display:inline-block;margin-right:16px;margin-bottom:8px;padding:8px 16px;border:1px solid #10b981;border-radius:8px;background:#f0fdf4;">
            <p style="font-size:12px;font-weight:600;color:#166534;margin:0;">✓ ${sig.signed_by_name || sig.signed_by}</p>
            <p style="font-size:10px;color:#4ade80;margin:2px 0 0;">${sig.role} — ${formatDate(sig.signed_date)}</p>
          </div>
        `).join('')}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Sjekkliste: ${checklist.name}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1e293b;">
  <div style="border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#1e293b;">${checklist.name}</h1>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#64748b;">
      ${projectName ? `<span>📁 ${projectName}</span>` : ''}
      ${checklist.date ? `<span>📅 ${checklist.date}</span>` : ''}
      ${checklist.location ? `<span>📍 ${checklist.location}</span>` : ''}
      ${checklist.building_part ? `<span>🏗 ${checklist.building_part}</span>` : ''}
      ${checklist.assigned_to_name ? `<span>👤 ${checklist.assigned_to_name}</span>` : ''}
    </div>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 16px;text-align:center;">
      <p style="font-size:20px;font-weight:700;color:#16a34a;margin:0;">${controlled}</p>
      <p style="font-size:11px;color:#4ade80;margin:0;">av ${totalItems} kontrollert</p>
    </div>
    ${avvik > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;text-align:center;">
      <p style="font-size:20px;font-weight:700;color:#dc2626;margin:0;">${avvik}</p>
      <p style="font-size:11px;color:#f87171;margin:0;">avvik</p>
    </div>` : ''}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;text-align:center;">
      <p style="font-size:16px;font-weight:700;color:#475569;margin:0;">${checklist.status === 'fullfort' ? '✓ Fullført' : 'Pågående'}</p>
      <p style="font-size:11px;color:#94a3b8;margin:0;">status</p>
    </div>
  </div>

  ${itemsHtml}
  ${signaturesHtml}

  <p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;">
    Generert ${formatDate(new Date().toISOString())} — En Plattform
  </p>
</body>
</html>`;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxW = pageW - margin * 2;
  let y = 14;

  const addText = (text, size, color, bold, maxWidth) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text || ''), maxWidth || maxW);
    if (y + lines.length * size * 0.4 > 280) { doc.addPage(); y = 14; }
    doc.text(lines, margin, y);
    y += lines.length * size * 0.4 + 1;
  };

  const checkNewPage = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 14; }
  };

  // Header
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 6, pageW - margin, y + 6);
  addText(checklist.name, 16, [30, 41, 59], true);
  y += 2;

  const meta = [projectName && `Prosjekt: ${projectName}`, checklist.date && `Dato: ${checklist.date}`, checklist.location && `Lokasjon: ${checklist.location}`, checklist.assigned_to_name && `Ansvarlig: ${checklist.assigned_to_name}`].filter(Boolean);
  if (meta.length) addText(meta.join('   |   '), 9, [100, 116, 139], false);

  y += 4;
  addText(`Kontrollert: ${controlled} av ${totalItems}${avvik > 0 ? `   Avvik: ${avvik}` : ''}   Status: ${checklist.status === 'fullfort' ? 'Fullført' : 'Pågående'}`, 9, [71, 85, 105], false);
  y += 6;

  // Items
  for (const entry of allEntries) {
    if (entry.type === 'section') {
      checkNewPage(10);
      y += 3;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 1, pageW - margin, y + 1);
      addText(entry.title || '', 12, [30, 41, 59], true);
      if (entry.description) addText(entry.description, 9, [100, 116, 139], false);
      y += 2;
    } else {
      const { item, response } = entry;
      const status = response?.status || 'ikke_kontrollert';
      const label = statusLabels[status] || status;
      const color = statusColors[status] || '#94a3b8';
      const rgb = color === '#16a34a' ? [22, 163, 74] : color === '#dc2626' ? [220, 38, 38] : color === '#6b7280' ? [107, 114, 128] : [148, 163, 184];

      checkNewPage(14);

      // Left border indicator
      doc.setFillColor(...rgb);
      doc.rect(margin, y - 3, 1.5, 10, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(item.title || '', maxW - 30);
      doc.text(titleLines, margin + 3, y);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...rgb);
      doc.text(label, pageW - margin, y, { align: 'right' });

      y += titleLines.length * 4.5;

      if (item.description) {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        const dl = doc.splitTextToSize(item.description, maxW - 4);
        checkNewPage(dl.length * 4);
        doc.text(dl, margin + 3, y); y += dl.length * 4;
      }

      if (response?.comment) {
        checkNewPage(8);
        doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(71, 85, 105);
        const cl = doc.splitTextToSize(`"${response.comment}"`, maxW - 8);
        doc.text(cl, margin + 5, y); y += cl.length * 4;
      }

      if (response?.responded_by) {
        checkNewPage(5);
        addText(`Utført av: ${response.responded_by_name || response.responded_by}${response.responded_date ? ' — ' + formatDate(response.responded_date) : ''}`, 8, [148, 163, 184], false);
      }

      y += 3;
    }
  }

  // Signatures
  if (checklist.signatures?.length > 0) {
    checkNewPage(20);
    y += 4;
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y); y += 6;
    addText('Signaturer', 12, [30, 41, 59], true);
    for (const sig of checklist.signatures) {
      checkNewPage(10);
      addText(`✓ ${sig.signed_by_name || sig.signed_by} — ${sig.role} — ${formatDate(sig.signed_date)}`, 10, [22, 101, 52], false);
    }
  }

  // Footer
  checkNewPage(10);
  y += 4;
  addText(`Generert ${formatDate(new Date().toISOString())} — En Plattform`, 8, [148, 163, 184], false);

  doc.save(`sjekkliste-${checklist.name.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '-')}.pdf`);
}