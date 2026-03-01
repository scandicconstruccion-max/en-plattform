import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

function formatAmt(amount) {
  if (!amount && amount !== 0) return 'kr 0,00';
  return `kr ${Number(amount).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generateInvoicePDF({ invoice, lines, totals, company }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;

  // ── BACKGROUND ──────────────────────────────────────────────────────────────
  // Top accent bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageW, 52, 'F');

  // Subtle bottom strip
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, pageH - 18, pageW, 18, 'F');

  // ── LOGO / COMPANY NAME ──────────────────────────────────────────────────────
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const companyName = company?.name || 'En Plattform';
  doc.text(companyName, margin, 22);

  if (company?.org_number) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 250, 229); // emerald-100
    doc.text(`Org.nr: ${company.org_number}`, margin, 29);
  }

  // ── FAKTURA LABEL ────────────────────────────────────────────────────────────
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FAKTURA', pageW - margin, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(209, 250, 229);
  doc.text(`Nr: ${invoice.invoice_number}`, pageW - margin, 29, { align: 'right' });

  // ── INFO BELOW HEADER (white area starts at y=52) ──────────────────────────
  let y = 62;

  // Two-column info block
  const col1 = margin;
  const col2 = pageW / 2 + 4;

  // Dates block (left)
  const drawLabel = (label, value, cx, cy) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, cx, cy);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(value || '—', cx, cy + 5.5);
  };

  try { drawLabel('Fakturadato', format(new Date(invoice.invoice_date), 'dd.MM.yyyy'), col1, y); } catch {}
  try { drawLabel('Forfallsdato', format(new Date(invoice.due_date), 'dd.MM.yyyy'), col1 + 50, y); } catch {}
  if (invoice.kid_number) drawLabel('KID-nummer', invoice.kid_number, col1 + 100, y);

  // Customer block (right)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Faktureres til', col2, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer_name || '', col2, y + 5.5);
  if (invoice.customer_email) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(invoice.customer_email, col2, y + 11);
  }

  y += 22;

  if (invoice.project_name) {
    drawLabel('Prosjekt', invoice.project_name, col1, y);
    y += 14;
  }

  // References
  if (invoice.our_reference_name || invoice.their_reference) {
    if (invoice.our_reference_name) drawLabel('Vår referanse', invoice.our_reference_name, col1, y);
    if (invoice.their_reference) drawLabel('Deres referanse', invoice.their_reference, col1 + 70, y);
    y += 14;
  }

  y += 4;

  // ── DIVIDER ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── TABLE HEADER ─────────────────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');

  const colDesc = margin + 3;
  const colQty = margin + contentW * 0.52;
  const colPrice = margin + contentW * 0.67;
  const colVat = margin + contentW * 0.80;
  const colTotal = margin + contentW - 3;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Beskrivelse', colDesc, y + 5.2);
  doc.text('Antall', colQty, y + 5.2);
  doc.text('Enhetspris', colPrice, y + 5.2);
  doc.text('MVA %', colVat, y + 5.2);
  doc.text('Sum', colTotal, y + 5.2, { align: 'right' });
  y += 11;

  // ── TABLE ROWS ───────────────────────────────────────────────────────────────
  lines.forEach((line, i) => {
    const lineTotal = line.quantity * line.unit_price;
    const lineTotalWithVat = lineTotal * (1 + line.vat_rate / 100);

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentW, 8, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59); // slate-800

    const descText = doc.splitTextToSize(line.description || '', contentW * 0.50);
    doc.text(descText, colDesc, y + 4);
    doc.text(`${line.quantity} ${line.unit || ''}`.trim(), colQty, y + 4);
    doc.text(formatAmt(line.unit_price), colPrice, y + 4);
    doc.text(`${line.vat_rate}%`, colVat, y + 4);
    doc.text(formatAmt(lineTotalWithVat), colTotal, y + 4, { align: 'right' });

    const rowH = Math.max(8, descText.length * 5);
    y += rowH;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, pageW - margin, y - 1);
  });

  y += 6;

  // ── TOTALS ───────────────────────────────────────────────────────────────────
  const totalsX = pageW - margin - 70;
  const totalsW = 70;

  const drawTotalRow = (label, value, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(totalsX - 3, y - 4.5, totalsW + 3, 8, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.setFontSize(bold ? 10 : 8.5);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, totalsX, y);
    doc.text(value, totalsX + totalsW, y, { align: 'right' });
    y += 7;
  };

  drawTotalRow('Sum eks. mva:', formatAmt(totals.amount_excluding_vat));
  drawTotalRow('MVA:', formatAmt(totals.vat_amount));
  y += 2;
  drawTotalRow('Totalt å betale:', formatAmt(totals.total_amount), true, true);
  y += 4;

  // ── PAYMENT INFO ─────────────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70); // emerald-900
  doc.text('Betalingsinformasjon', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  const payLeft = margin + 4;
  if (invoice.kid_number) doc.text(`KID: ${invoice.kid_number}`, payLeft, y + 13.5);
  try { doc.text(`Betalingsfrist: ${format(new Date(invoice.due_date), 'dd.MM.yyyy')}`, payLeft + 55, y + 13.5); } catch {}
  y += 28;

  // ── COMMENT ──────────────────────────────────────────────────────────────────
  if (invoice.comment) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Merknad:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const commentLines = doc.splitTextToSize(invoice.comment, contentW);
    doc.text(commentLines, margin, y);
    y += commentLines.length * 5 + 4;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setFillColor(16, 185, 129);
  doc.rect(0, pageH - 18, pageW, 18, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(209, 250, 229);
  if (company?.address) doc.text(company.address, margin, pageH - 10);
  if (company?.email) doc.text(company.email, pageW / 2, pageH - 10, { align: 'center' });
  doc.text(`Side 1 av 1`, pageW - margin, pageH - 10, { align: 'right' });

  return doc;
}

export async function downloadInvoicePDF({ invoice, lines, totals, company }) {
  const doc = await generateInvoicePDF({ invoice, lines, totals, company });
  doc.save(`Faktura-${invoice.invoice_number || 'preview'}.pdf`);
}