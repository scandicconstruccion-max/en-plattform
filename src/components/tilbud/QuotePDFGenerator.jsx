import React from 'react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';

export const generateQuotePDF = async (quote, company) => {
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="padding: 40px; font-family: Arial, sans-serif; max-width: 800px;">
      <!-- Company Header -->
      <div style="border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #1e293b; margin: 0; font-size: 32px;">${company?.name || 'En Plattform'}</h1>
        ${company?.address ? `<p style="margin: 5px 0; color: #64748b;">${company.address}</p>` : ''}
        <div style="display: flex; gap: 20px; margin-top: 10px; color: #64748b;">
          ${company?.phone ? `<span>Tlf: ${company.phone}</span>` : ''}
          ${company?.email ? `<span>E-post: ${company.email}</span>` : ''}
        </div>
        ${company?.org_number ? `<p style="margin: 5px 0; color: #64748b;">Org.nr: ${company.org_number}</p>` : ''}
      </div>

      <!-- Quote Info -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">Tilbud ${quote.quote_number}${quote.revision_number > 0 ? `-REV${quote.revision_number}` : ''}</h2>
        <p style="color: #64748b; margin: 0;">${format(new Date(), 'd. MMMM yyyy', { locale: nb })}</p>
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
        <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Kunde</h3>
        <p style="margin: 3px 0; color: #334155;"><strong>${quote.customer_name}</strong></p>
        ${quote.customer_email ? `<p style="margin: 3px 0; color: #64748b;">${quote.customer_email}</p>` : ''}
        ${quote.customer_phone ? `<p style="margin: 3px 0; color: #64748b;">${quote.customer_phone}</p>` : ''}
      </div>

      ${quote.project_description ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Prosjektbeskrivelse</h3>
          <p style="color: #334155; line-height: 1.6;">${quote.project_description}</p>
        </div>
      ` : ''}

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #10b981; color: white;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Linje</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Mengde</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Enhet</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Enhetspris</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Sum</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items?.map((item, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #334155;">${item.description}</td>
              <td style="padding: 12px; text-align: center; color: #334155;">${item.quantity}</td>
              <td style="padding: 12px; text-align: center; color: #334155;">${item.unit || 'stk'}</td>
              <td style="padding: 12px; text-align: right; color: #334155;">${item.unit_price.toLocaleString('nb-NO')} Kr.</td>
              <td style="padding: 12px; text-align: right; color: #334155; font-weight: 600;">${(item.quantity * item.unit_price).toLocaleString('nb-NO')} Kr.</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="text-align: right; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 8px 0; color: #334155; font-size: 14px;">
          <span style="display: inline-block; width: 150px;">Subtotal:</span>
          <strong>${(quote.total_amount || 0).toLocaleString('nb-NO')} Kr.</strong>
        </p>
        <p style="margin: 8px 0; color: #334155; font-size: 14px;">
          <span style="display: inline-block; width: 150px;">MVA (25%):</span>
          <strong>${(quote.vat_amount || 0).toLocaleString('nb-NO')} Kr.</strong>
        </p>
        <div style="border-top: 2px solid #10b981; margin-top: 10px; padding-top: 10px;">
          <p style="margin: 0; color: #1e293b; font-size: 20px;">
            <span style="display: inline-block; width: 150px;">Totalt:</span>
            <strong>${((quote.total_amount || 0) + (quote.vat_amount || 0)).toLocaleString('nb-NO')} Kr.</strong>
          </p>
        </div>
      </div>

      ${quote.valid_until ? `
        <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">
            Tilbudet er gyldig til ${format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: nb })}
          </p>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: center;">
        <p style="margin: 0;">Med vennlig hilsen,</p>
        <p style="margin: 5px 0; font-weight: 600; color: #1e293b;">${company?.name || 'En Plattform'}</p>
      </div>
    </div>
  `;
  
  // Create temporary container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm';
  container.innerHTML = element.innerHTML;
  document.body.appendChild(container);

  // Wait for fonts and styles to load
  await new Promise(resolve => setTimeout(resolve, 100));

  // Generate PDF using jsPDF's HTML method
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  await pdf.html(container, {
    callback: function(doc) {
      // Clean up
      document.body.removeChild(container);
      
      // Open PDF in new tab instead of downloading
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      // Clean up URL after 1 minute
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60000);
      
      toast.success('PDF åpnet i ny fane');
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 800
  });
};