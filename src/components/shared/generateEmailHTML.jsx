import { formatAmount } from './formatNumber';
import { generateApprovalEmailHTML } from './approvalEmailTemplate';

export function generateOrderEmailHTML(order, approvalUrl) {
  const items = order.items || [];
  const totalWithVat = (order.total_amount || 0) + (order.vat_amount || order.total_amount * 0.25);

  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordre ${order.order_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Ordre</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Ordrenummer: ${order.order_number}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Customer Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Kundeinformasjon</h2>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Kunde</p>
                    <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 500;">${order.customer_name}</p>
                    ${order.customer_email ? `
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">E-post</p>
                    <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">${order.customer_email}</p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${order.description ? `
              <!-- Description -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Beskrivelse</h2>
                    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${order.description}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${items.length > 0 ? `
              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Ordrelinjer</h2>
                  </td>
                </tr>
                ${items.map(item => `
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${item.description}</p>
                          <p style="margin: 0; color: #64748b; font-size: 14px;">${item.quantity} ${item.unit} × ${formatAmount(item.unit_price)} per ${item.unit}</p>
                        </td>
                        <td align="right" valign="top">
                          <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 700;">${formatAmount(item.total)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                `).join('')}
              </table>
              ` : ''}

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #e2e8f0; padding-top: 16px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 15px;">Sum eks. mva:</p>
                  </td>
                  <td align="right" style="padding: 8px 0;">
                    <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${formatAmount(order.total_amount)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 15px;">MVA (25%):</p>
                  </td>
                  <td align="right" style="padding: 8px 0;">
                    <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${formatAmount(order.vat_amount || order.total_amount * 0.25)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 0 0; border-top: 2px solid #e2e8f0;">
                    <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 700;">Totalt:</p>
                  </td>
                  <td align="right" style="padding: 16px 0 0 0; border-top: 2px solid #e2e8f0;">
                    <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${formatAmount(totalWithVat)}</p>
                  </td>
                </tr>
              </table>

              <!-- Approval Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; min-height: 44px; line-height: 1.5; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                      Godkjenn ordren
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                Denne e-posten er sendt fra En Plattform
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