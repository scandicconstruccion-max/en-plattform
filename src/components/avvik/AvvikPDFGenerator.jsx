import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const categoryLabels = {
  sikkerhet: 'Sikkerhet', kvalitet: 'Kvalitet', miljo: 'Miljø',
  fremdrift: 'Fremdrift', prosjektering: 'Prosjektering',
  dokumentasjon: 'Dokumentasjon', hms: 'HMS', annet: 'Annet'
};
const severityLabels = { lav: 'Lav', middels: 'Middels', hoy: 'Høy', kritisk: 'Kritisk' };
const statusLabels = {
  opprettet: 'Opprettet', sendt_kunde: 'Sendt kunde',
  godkjent_kunde: 'Godkjent av kunde', utfort: 'Utført', fakturert: 'Fakturert'
};
const costResponsibleLabels = {
  byggherre: 'Byggherre', entreprenor: 'Entreprenør',
  underentreprenor: 'Underentreprenør', annet: 'Annet'
};

export default function AvvikPDFGenerator({ deviation, projectName }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Header bar
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AVVIKSRAPPORT', margin, 9);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(), 'd. MMM yyyy', { locale: nb }), pageWidth - margin, 9, { align: 'right' });

      y = 25;

      // Avviksnummer og tittel
      if (deviation.deviation_number) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(deviation.deviation_number, margin, y);
        y += 5;
      }

      doc.setTextColor(20, 20, 20);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(deviation.title || '', contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Prosjekt: ${projectName || 'Ukjent'}`, margin, y);
      y += 10;

      // Separator
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Status-grid
      const gridItems = [
        ['Status', statusLabels[deviation.status] || deviation.status],
        ['Alvorlighet', severityLabels[deviation.severity] || deviation.severity],
        ['Kategori', categoryLabels[deviation.category] || deviation.category],
        ['Registrert', deviation.created_date ? format(new Date(deviation.created_date), 'd. MMM yyyy', { locale: nb }) : '-'],
      ];
      if (deviation.due_date) gridItems.push(['Frist', format(new Date(deviation.due_date), 'd. MMM yyyy', { locale: nb })]);
      if (deviation.assigned_to) gridItems.push(['Tildelt', deviation.assigned_to]);

      const colW = contentWidth / 2;
      gridItems.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + col * colW;
        const rowY = y + row * 14;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, rowY - 5, colW - 3, 12, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(item[0], x + 4, rowY);
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.text(item[1] || '-', x + 4, rowY + 5);
        doc.setFont('helvetica', 'normal');
      });

      y += Math.ceil(gridItems.length / 2) * 14 + 8;

      const addSection = (title, text) => {
        if (!text) return;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFillColor(239, 246, 255);
        doc.rect(margin, y - 1, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(title, margin + 2, y + 5);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach(line => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 6;
        });
        y += 4;
      };

      addSection('Beskrivelse', deviation.description);
      addSection('Korrigerende tiltak', deviation.corrective_action);

      if (deviation.has_cost_consequence) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFillColor(255, 247, 237);
        doc.rect(margin, y - 1, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(194, 65, 12);
        doc.text('Kostnadskonsekvens', margin + 2, y + 5);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        if (deviation.cost_amount) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`${deviation.cost_amount.toLocaleString('nb-NO')} kr`, margin, y);
          y += 8;
        }
        if (deviation.cost_responsible) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Ansvar: ${costResponsibleLabels[deviation.cost_responsible] || deviation.cost_responsible}`, margin, y);
          y += 6;
        }
        if (deviation.cost_description) {
          const lines = doc.splitTextToSize(deviation.cost_description, contentWidth);
          lines.forEach(line => { doc.text(line, margin, y); y += 6; });
        }
        y += 4;
      }

      if (deviation.location_label) {
        addSection('Lokasjon', deviation.location_label);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, 285, pageWidth - margin, 285);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('En Plattform – Avviksrapport', margin, 290);
        doc.text(`Side ${i} av ${pageCount}`, pageWidth - margin, 290, { align: 'right' });
      }

      const fileName = `avvik-${deviation.deviation_number || deviation.id?.slice(0, 8)}.pdf`;
      doc.save(fileName);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      variant="outline"
      className="rounded-xl gap-2"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Last ned PDF
    </Button>
  );
}