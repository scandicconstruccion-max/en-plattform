import React from 'react';
import { format } from 'date-fns';
import { formatAmount } from '../../utils/formatNumber';

export default function InvoicePreview({ invoice, lines, totals }) {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">FAKTURA</h1>
          <p className="text-slate-600">Fakturanummer: {invoice.invoice_number}</p>
          <p className="text-slate-600">Fakturadato: {format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}</p>
          <p className="text-slate-600">Forfallsdato: {format(new Date(invoice.due_date), 'dd.MM.yyyy')}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">Faktura til:</p>
          <p className="text-slate-700">{invoice.customer_name}</p>
          {invoice.customer_email && <p className="text-slate-600">{invoice.customer_email}</p>}
        </div>
      </div>

      {/* Project Info */}
      {invoice.project_name && (
        <div className="mb-6">
          <p className="text-slate-600">
            <span className="font-semibold">Prosjekt:</span> {invoice.project_name}
          </p>
        </div>
      )}

      {/* Invoice Lines */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="text-left py-2 text-slate-900">Beskrivelse</th>
            <th className="text-right py-2 text-slate-900">Antall</th>
            <th className="text-right py-2 text-slate-900">Enhetspris</th>
            <th className="text-right py-2 text-slate-900">MVA %</th>
            <th className="text-right py-2 text-slate-900">Sum</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const lineTotal = line.quantity * line.unit_price;
            const lineTotalWithVat = lineTotal * (1 + line.vat_rate / 100);
            return (
              <tr key={index} className="border-b border-slate-200">
                <td className="py-3 text-slate-700">{line.description}</td>
                <td className="text-right py-3 text-slate-700">{line.quantity} {line.unit}</td>
                <td className="text-right py-3 text-slate-700">{formatAmount(line.unit_price)}</td>
                <td className="text-right py-3 text-slate-700">{line.vat_rate}%</td>
                <td className="text-right py-3 text-slate-700">{formatAmount(lineTotalWithVat)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 text-slate-700">
            <span>Sum eks. mva:</span>
            <span>{formatAmount(totals.amount_excluding_vat)}</span>
          </div>
          <div className="flex justify-between py-2 text-slate-700">
            <span>MVA:</span>
            <span>{formatAmount(totals.vat_amount)}</span>
          </div>
          <div className="flex justify-between py-3 text-lg font-bold text-slate-900 border-t-2 border-slate-300">
            <span>Totalt:</span>
            <span>{formatAmount(totals.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-slate-50 p-4 rounded-lg mb-6">
        <p className="font-semibold text-slate-900 mb-2">Betalingsinformasjon</p>
        <p className="text-slate-700">KID-nummer: {invoice.kid_number}</p>
        <p className="text-slate-700">Forfallsdato: {format(new Date(invoice.due_date), 'dd.MM.yyyy')}</p>
        <p className="text-slate-700 mt-2">Vennligst betal innen forfallsdato.</p>
      </div>

      {/* Comment */}
      {invoice.comment && (
        <div className="mt-6">
          <p className="font-semibold text-slate-900 mb-2">Kommentar:</p>
          <p className="text-slate-700 whitespace-pre-line">{invoice.comment}</p>
        </div>
      )}
    </div>
  );
}