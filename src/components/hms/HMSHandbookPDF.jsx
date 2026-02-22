import React from 'react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export async function generateHMSHandbookPDF(handbook, companyData) {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;
    let pageNumber = 1;

    // Helper function to add footer
    const addFooter = (page) => {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont(undefined, 'italic');
      const footerText = 'En Plattform. Av håndverkeren, for håndverkeren.';
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      
      // Page number
      pdf.setFontSize(9);
      pdf.text(`${page}`, pageWidth - margin - 10, pageHeight - 10);
    };

    // Helper function to check if new page is needed
    const checkNewPage = (neededSpace = 20) => {
      if (yPos + neededSpace > pageHeight - 30) {
        addFooter(pageNumber);
        pdf.addPage();
        pageNumber++;
        yPos = margin;
        return true;
      }
      return false;
    };

    // Helper function to add wrapped text
    const addWrappedText = (text, fontSize = 10, bold = false) => {
      if (!text) return;
      pdf.setFontSize(fontSize);
      pdf.setFont(undefined, bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        checkNewPage();
        pdf.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    // --- FORSIDE ---
    pdf.setFillColor(16, 185, 129); // emerald-600
    pdf.rect(0, 0, pageWidth, 80, 'F');

    // Company logo
    if (companyData?.logo_url) {
      try {
        pdf.addImage(companyData.logo_url, 'PNG', margin, 20, 40, 40);
      } catch (e) {
        console.warn('Could not add logo:', e);
      }
    }

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(32);
    pdf.setFont(undefined, 'bold');
    yPos = 100;
    pdf.text('HMS-HÅNDBOK', margin, yPos);

    // Company info
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    yPos = 130;
    if (companyData?.name) {
      pdf.text(companyData.name, margin, yPos);
      yPos += 7;
    }
    if (companyData?.address) {
      pdf.setFontSize(11);
      pdf.text(companyData.address, margin, yPos);
      yPos += 6;
    }
    if (companyData?.phone) {
      pdf.text(`Tlf: ${companyData.phone}`, margin, yPos);
      yPos += 6;
    }
    if (companyData?.email) {
      pdf.text(`E-post: ${companyData.email}`, margin, yPos);
      yPos += 6;
    }

    // Version info
    yPos = 200;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Versjon ${handbook.version || 1}`, margin, yPos);
    yPos += 5;
    if (handbook.sist_endret_dato) {
      const date = new Date(handbook.sist_endret_dato);
      pdf.text(`Sist oppdatert: ${date.toLocaleDateString('nb-NO')}`, margin, yPos);
    }

    addFooter(pageNumber);
    
    // --- INNHOLDSFORTEGNELSE ---
    pdf.addPage();
    pageNumber++;
    yPos = margin;

    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Innholdsfortegnelse', margin, yPos);
    yPos += 15;

    const sections = [
      { title: 'Mål for HMS', key: 'maal_for_hms', page: 3 },
      { title: 'Organisasjon og ansvar', key: 'organisasjon_ansvar' },
      { title: 'Rutine for avvik', key: 'rutine_avvik' },
      { title: 'Rutine for RUH', key: 'rutine_ruh' },
      { title: 'Rutine for SJA', key: 'rutine_sja' },
      { title: 'Rutine for risikovurdering', key: 'rutine_risikovurdering' },
      { title: 'Rutine for vernerunde', key: 'rutine_vernerunde' },
      { title: 'Rutine for opplæring', key: 'rutine_opplaring' },
      { title: 'Varslingsrutiner', key: 'varslingsrutiner' },
      { title: 'Beredskapsrutiner', key: 'beredskapsrutiner' }
    ];

    // Add custom chapters to TOC
    if (handbook.egne_kapitler?.length > 0) {
      handbook.egne_kapitler.forEach(chapter => {
        sections.push({ title: chapter.title, key: `custom_${chapter.title}` });
      });
    }

    // Add attachments to TOC
    if (handbook.vedlegg?.length > 0) {
      sections.push({ title: 'Vedlegg', key: 'vedlegg' });
    }

    let currentTocPage = 3;
    pdf.setFontSize(11);
    sections.forEach(section => {
      checkNewPage(10);
      pdf.setFont(undefined, 'normal');
      
      // Dotted line
      const dots = '.'.repeat(Math.floor((contentWidth - pdf.getTextWidth(section.title) - 15) / 2));
      pdf.text(`${section.title} ${dots} ${currentTocPage}`, margin, yPos);
      yPos += 7;
      currentTocPage++;
    });

    addFooter(pageNumber);

    // --- CONTENT SECTIONS ---
    sections.forEach(section => {
      pdf.addPage();
      pageNumber++;
      yPos = margin;

      // Section title
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(16, 185, 129);
      pdf.text(section.title, margin, yPos);
      yPos += 12;

      pdf.setTextColor(0, 0, 0);

      // Content
      if (section.key === 'vedlegg') {
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'normal');
        if (handbook.vedlegg?.length > 0) {
          handbook.vedlegg.forEach((url, idx) => {
            checkNewPage();
            pdf.text(`${idx + 1}. ${url}`, margin + 5, yPos);
            yPos += 7;
          });
        } else {
          pdf.text('Ingen vedlegg', margin, yPos);
        }
      } else if (section.key.startsWith('custom_')) {
        const chapter = handbook.egne_kapitler?.find(ch => ch.title === section.title);
        if (chapter) {
          addWrappedText(chapter.content, 11, false);
        }
      } else {
        const content = handbook[section.key];
        if (content) {
          addWrappedText(content, 11, false);
        } else {
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'italic');
          pdf.setTextColor(150, 150, 150);
          pdf.text('Ingen innhold', margin, yPos);
          pdf.setTextColor(0, 0, 0);
        }
      }

      addFooter(pageNumber);
    });

    // Open PDF in browser
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);

    toast.success('HMS-håndbok åpnet i ny fane');
  } catch (error) {
    console.error('PDF-generering feilet:', error);
    toast.error('Kunne ikke generere PDF');
    throw error;
  }
}