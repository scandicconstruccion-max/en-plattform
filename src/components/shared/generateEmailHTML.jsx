import { formatAmount } from './formatNumber';
import { generateApprovalEmailHTML } from './approvalEmailTemplate';

export function generateOrderEmailHTML(order, approvalUrl) {
  const items = order.items || [];
  const totalWithVat = (order.total_amount || 0) + (order.vat_amount || order.total_amount * 0.25);

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Kunde</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1e293b;">${order.customer_name}</p>

    ${order.description ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Beskrivelse</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#475569;line-height:1.6;">${order.description}</p>
    ` : ''}

    ${items.length > 0 ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Ordrelinjer</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${items.map(item => `
      <tr>
        <td style="padding:10px 12px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;">${item.description}</td>
        <td align="right" style="padding:10px 12px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;white-space:nowrap;">${formatAmount(item.total)}</td>
      </tr>
      `).join('')}
    </table>
    ` : ''}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #e2e8f0;margin-bottom:8px;">
      <tr>
        <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;">Sum eks. mva:</td>
        <td align="right" style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;">${formatAmount(order.total_amount)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;">MVA (25%):</td>
        <td align="right" style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;">${formatAmount(order.vat_amount || order.total_amount * 0.25)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0 0;border-top:2px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#0f172a;">Totalt:</td>
        <td align="right" style="padding:12px 0 0 0;border-top:2px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#0f172a;">${formatAmount(totalWithVat)}</td>
      </tr>
    </table>
  `;

  return generateApprovalEmailHTML({
    title: `Ordre ${order.order_number}`,
    heading: 'Ordre',
    subheading: `Ordrenummer: ${order.order_number}`,
    headerColor: '#10b981',
    bodyHtml,
    approvalUrl,
    buttonText: 'Godkjenn ordren',
  });
}

export function generateChangeEmailHTML(change, project, approvalUrl) {
  const bodyHtml = `
    ${project?.name ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Prosjekt</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1e293b;">${project.name}</p>
    ` : ''}

    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Tittel</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1e293b;">${change.title || 'Ingen tittel'}</p>

    ${change.description ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Beskrivelse</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#475569;line-height:1.6;">${change.description}</p>
    ` : ''}

    ${change.amount != null ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-left:4px solid #10b981;margin-bottom:16px;">
      <tr>
        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#166534;">
          <strong>Beløp:</strong> ${change.amount.toLocaleString('nb-NO')} kr
        </td>
      </tr>
    </table>
    ` : ''}
  `;

  return generateApprovalEmailHTML({
    title: `Endringsmelding: ${change.title || ''}`,
    heading: 'Endringsmelding',
    subheading: change.change_number ? `Nummer: ${change.change_number}` : '',
    headerColor: '#7c3aed',
    bodyHtml,
    approvalUrl,
    buttonText: 'Godkjenn endringsmelding',
  });
}

export function generateEmailHTML({ title, content, companyName, companyLogo }) {
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
              ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-width: 150px; max-height: 60px; margin-bottom: 16px;" />` : ''}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                ${companyName ? `Sendt fra ${companyName} via ` : ''}En Plattform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateQuoteEmailHTML(quote, approvalUrl) {
  const items = quote.items || [];
  const totalWithVat = (quote.total_amount || 0) + (quote.vat_amount || 0);

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Kunde</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1e293b;">${quote.customer_name}</p>

    ${quote.project_description ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Prosjektbeskrivelse</p>
    <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#475569;line-height:1.6;">${quote.project_description}</p>
    ` : ''}

    ${items.length > 0 ? `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Tilbudslinjer</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${items.map(item => `
      <tr>
        <td style="padding:10px 12px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;">${item.description}</td>
        <td align="right" style="padding:10px 12px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;white-space:nowrap;">${formatAmount(item.total)}</td>
      </tr>
      `).join('')}
    </table>
    ` : ''}

    ${quote.valid_until ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr><td style="padding:10px 14px;background-color:#fef3c7;border-left:4px solid #f59e0b;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#92400e;">
        <strong>Gyldig til:</strong> ${new Date(quote.valid_until).toLocaleDateString('nb-NO')}
      </td></tr>
    </table>
    ` : ''}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #e2e8f0;margin-bottom:8px;">
      <tr>
        <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;">Sum eks. mva:</td>
        <td align="right" style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;">${formatAmount(quote.total_amount)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;">MVA (25%):</td>
        <td align="right" style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1e293b;">${formatAmount(quote.vat_amount || quote.total_amount * 0.25)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0 0;border-top:2px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#0f172a;">Totalt:</td>
        <td align="right" style="padding:12px 0 0 0;border-top:2px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#0f172a;">${formatAmount(totalWithVat)}</td>
      </tr>
    </table>
  `;

  return generateApprovalEmailHTML({
    title: `Tilbud ${quote.quote_number}`,
    heading: 'Tilbud',
    subheading: `Tilbudsnummer: ${quote.quote_number}`,
    headerColor: '#2563eb',
    bodyHtml,
    approvalUrl,
    buttonText: 'Godkjenn tilbudet',
  });
}