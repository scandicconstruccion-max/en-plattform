import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

/**
 * Standardisert PDF-generator for hele systemet
 * Åpner PDF i nettleserens innebygde visning (ikke direkte nedlasting)
 * 
 * @param {string} elementId - ID til HTML-elementet som skal konverteres
 * @param {string} fileName - Navn på PDF-filen
 * @returns {Promise<void>}
 */
export async function generatePDF(elementId, fileName = 'dokument.pdf') {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      throw new Error(`Element med ID "${elementId}" ble ikke funnet`);
    }

    // Lag canvas fra HTML-innhold
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true
    });

    // Konverter canvas til PDF
    const imgData = canvas.toDataURL('image/png');
    
    if (!imgData || !imgData.startsWith('data:image/png;base64,')) {
      throw new Error('Kunne ikke generere gyldig bilde fra innholdet');
    }
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Legg til første side
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Legg til flere sider hvis nødvendig
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Åpne PDF i ny fane (nettleserens innebygde visning)
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

    // Rydd opp URL etter 1 minutt
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);

    toast.success('PDF åpnet i ny fane');
  } catch (error) {
    console.error('PDF-generering feilet:', error);
    toast.error('Kunne ikke generere PDF');
    throw error;
  }
}

/**
 * Genererer PDF fra flere elementer (for komplekse dokumenter)
 * 
 * @param {Array<{elementId: string, title?: string}>} elements - Array av elementer
 * @param {string} fileName - Navn på PDF-filen
 * @returns {Promise<void>}
 */
export async function generateMultiElementPDF(elements, fileName = 'dokument.pdf') {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    let isFirstPage = true;

    for (const { elementId, title } of elements) {
      const element = document.getElementById(elementId);
      
      if (!element) {
        console.warn(`Element med ID "${elementId}" ble ikke funnet, hopper over`);
        continue;
      }

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      // Legg til tittel hvis angitt
      if (title) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, 15, 15);
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Validate image data before adding to PDF
      if (imgData && imgData.startsWith('data:image/png;base64,')) {
        const imgWidth = pageWidth - 20; // margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const yOffset = title ? 25 : 10;

        pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
      } else {
        console.warn('Invalid image data for element:', elementId);
      }
    }

    // Åpne PDF i ny fane
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);

    toast.success('PDF åpnet i ny fane');
  } catch (error) {
    console.error('PDF-generering feilet:', error);
    toast.error('Kunne ikke generere PDF');
    throw error;
  }
}