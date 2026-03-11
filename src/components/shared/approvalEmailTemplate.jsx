/**
 * Felles e-postmal for godkjenningsflyt.
 * Bygget med tabeller og inline CSS for full Outlook-kompatibilitet.
 *
 * @param {object} opts
 * @param {string} opts.title        - Sidetittel, f.eks. "Tilbud TIL-2025-0001"
 * @param {string} opts.heading      - Overskrift i header
 * @param {string} opts.subheading   - Underoverskrift i header (f.eks. dokumentnummer)
 * @param {string} opts.headerColor  - Bakgrunnsfarge på header (hex)
 * @param {string} opts.bodyHtml     - HTML-innhold mellom header og knapp
 * @param {string} opts.approvalUrl  - URL for godkjenningslenken
 * @param {string} opts.buttonText   - Knappetekst
 * @param {string} opts.companyName  - Firmanavn (vises i footer)
 */
export function generateApprovalEmailHTML({
  title,
  heading,
  subheading = '',
  headerColor = '#10b981',
  bodyHtml = '',
  approvalUrl,
  buttonText = 'Godkjenn',
  companyName = 'En Plattform',
}) {
  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;">

        <!-- HEADER -->
        <tr>
          <td align="center" bgcolor="${headerColor}" style="background-color:${headerColor};padding:32px 40px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">${heading}</p>
            ${subheading ? `<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#ffffff;opacity:0.9;">${subheading}</p>` : ''}
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#334155;line-height:1.6;">
                  ${bodyHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- APPROVAL BUTTON (Outlook-safe table-based button) -->
        ${approvalUrl ? `
        <tr>
          <td align="center" style="padding:0 40px 16px 40px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#2563eb" style="background-color:#2563eb;border-radius:6px;mso-padding-alt:0;">
                  <a href="${approvalUrl}"
                     target="_blank"
                     style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:6px;mso-padding-alt:16px 48px;"
                  >${buttonText}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FALLBACK LINK -->
        <tr>
          <td align="center" style="padding:0 40px 32px 40px;">
            <p style="margin:12px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">
              Hvis knappen ikke fungerer kan du bruke denne lenken:
            </p>
            <a href="${approvalUrl}"
               target="_blank"
               style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2563eb;word-break:break-all;"
            >${approvalUrl}</a>
          </td>
        </tr>
        ` : ''}

        <!-- FOOTER -->
        <tr>
          <td align="center" bgcolor="#f8fafc" style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">
              Sendt fra ${companyName} via En Plattform
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Generer en unik sikker token (32 hex tegn)
 */
export function generateApprovalToken() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Bygg en godkjennings-URL
 * @param {string} action  - 'offer' | 'change' | 'order' | 'deviation'
 * @param {string} id      - Record-ID
 * @param {string} token   - Sikker token
 */
export function buildApprovalUrl(action, id, token) {
  const base = window.location.origin;
  // Base44 router lager lowercase kebab-case av PageName → "Godkjenning" → "/godkjenning"
  return `${base}/godkjenning?action=${action}&id=${id}&token=${token}`;
}