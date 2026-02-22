import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export async function generateFDVPDF({
  project,
  company,
  images,
  documents,
  deviations,
  changes,
  currentUser,
  version = 1
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  
  let currentPage = 1;
  let yPosition = margin;

  // Color scheme
  const primaryColor = company?.primary_color || '#10b981';
  const secondaryColor = company?.secondary_color || '#059669';
  const primaryRGB = hexToRgb(primaryColor);
  const secondaryRGB = hexToRgb(secondaryColor);

  // Helper function to add header and footer
  const addHeaderFooter = (pageNum) => {
    // Header
    pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(company?.name || 'KS-System', margin, 10);
    pdf.text(project.name, pageWidth - margin, 10, { align: 'right' });

    // Footer
    pdf.setFillColor(245, 245, 245);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Av håndverkeren, for håndverkeren', pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    const footerInfo = [
      company?.org_number ? `Org.nr: ${company.org_number}` : '',
      company?.phone || '',
      company?.email || '',
      company?.website || ''
    ].filter(Boolean).join(' • ');
    
    pdf.text(footerInfo, pageWidth / 2, pageHeight - 8, { align: 'center' });
    pdf.text(`Side ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  // ========== FORSIDE ==========
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logo (if available)
  if (company?.logo_url) {
    try {
      const logoImg = await loadImage(company.logo_url);
      pdf.addImage(logoImg, 'PNG', pageWidth / 2 - 30, 40, 60, 30, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  // Title
  pdf.setFontSize(36);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont(undefined, 'bold');
  pdf.text('FDV-Dokumentasjon', pageWidth / 2, 100, { align: 'center' });

  // Project info
  pdf.setFontSize(16);
  pdf.setFont(undefined, 'normal');
  pdf.text(project.name, pageWidth / 2, 120, { align: 'center' });

  pdf.setFontSize(12);
  if (project.client_name) {
    pdf.text(`Kunde: ${project.client_name}`, pageWidth / 2, 135, { align: 'center' });
  }
  if (project.address) {
    pdf.text(project.address, pageWidth / 2, 145, { align: 'center' });
  }
  if (project.end_date) {
    const endDate = format(new Date(project.end_date), 'dd.MM.yyyy', { locale: nb });
    pdf.text(`Ferdigstilt: ${endDate}`, pageWidth / 2, 155, { align: 'center' });
  }

  // Version info
  pdf.setFontSize(10);
  pdf.text(`Versjon: ${version}`, pageWidth / 2, 170, { align: 'center' });
  pdf.text(`Generert: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: nb })}`, pageWidth / 2, 177, { align: 'center' });
  pdf.text(`Av: ${currentUser.full_name || currentUser.email}`, pageWidth / 2, 184, { align: 'center' });

  // Slogan
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'italic');
  pdf.text('Av håndverkeren, for håndverkeren', pageWidth / 2, pageHeight - 40, { align: 'center' });

  // Company info
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  pdf.text(company?.name || '', pageWidth / 2, pageHeight - 25, { align: 'center' });
  if (company?.org_number) {
    pdf.text(`Org.nr: ${company.org_number}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  // ========== INNHOLDSFORTEGNELSE ==========
  pdf.addPage();
  currentPage++;
  yPosition = 30;
  addHeaderFooter(currentPage);

  pdf.setFontSize(24);
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont(undefined, 'bold');
  pdf.text('Innhold', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');

  const sections = [
    '1. Prosjektinformasjon',
    '2. Bildedokumentasjon',
    '3. Avvik og endringsmeldinger',
    '4. Produktdokumentasjon',
    '5. Vedlegg'
  ];

  sections.forEach((section) => {
    pdf.text(section, margin + 5, yPosition);
    yPosition += 10;
  });

  // ========== PROSJEKTINFORMASJON ==========
  pdf.addPage();
  currentPage++;
  yPosition = 30;
  addHeaderFooter(currentPage);

  pdf.setFontSize(20);
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont(undefined, 'bold');
  pdf.text('Prosjektinformasjon', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');

  const projectInfo = [
    ['Prosjektnavn:', project.name],
    ['Prosjektnummer:', project.project_number || 'N/A'],
    ['Kunde:', project.client_name || 'N/A'],
    ['Adresse:', project.address || 'N/A'],
    ['Startdato:', project.start_date ? format(new Date(project.start_date), 'dd.MM.yyyy', { locale: nb }) : 'N/A'],
    ['Sluttdato:', project.end_date ? format(new Date(project.end_date), 'dd.MM.yyyy', { locale: nb }) : 'N/A'],
    ['Prosjektleder:', project.project_manager_name || 'N/A'],
    ['Status:', getStatusLabel(project.status)]
  ];

  projectInfo.forEach(([label, value]) => {
    pdf.setFont(undefined, 'bold');
    pdf.text(label, margin, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(value, margin + 50, yPosition);
    yPosition += 8;
  });

  if (project.description) {
    yPosition += 5;
    pdf.setFont(undefined, 'bold');
    pdf.text('Beskrivelse:', margin, yPosition);
    yPosition += 7;
    pdf.setFont(undefined, 'normal');
    const descLines = pdf.splitTextToSize(project.description, contentWidth);
    pdf.text(descLines, margin, yPosition);
    yPosition += descLines.length * 6;
  }

  // ========== BILDEDOKUMENTASJON ==========
  if (images && images.length > 0) {
    pdf.addPage();
    currentPage++;
    yPosition = 30;
    addHeaderFooter(currentPage);

    pdf.setFontSize(20);
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFont(undefined, 'bold');
    pdf.text('Bildedokumentasjon', margin, yPosition);
    yPosition += 12;

    for (const img of images) {
      // Check if we need a new page
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        currentPage++;
        yPosition = 30;
        addHeaderFooter(currentPage);
      }

      // Add image
      try {
        const imageData = await loadImage(img.image_url);
        const imgWidth = contentWidth - 20;
        const imgHeight = 60;
        pdf.addImage(imageData, 'JPEG', margin + 10, yPosition, imgWidth, imgHeight, undefined, 'FAST');
        yPosition += imgHeight + 5;

        // Image info
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text(img.title || 'Uten tittel', margin + 10, yPosition);
        yPosition += 5;

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        
        const imageInfo = [];
        if (img.created_date) {
          imageInfo.push(`Dato: ${format(new Date(img.created_date), 'dd.MM.yyyy HH:mm', { locale: nb })}`);
        }
        if (img.uploaded_by_name) {
          imageInfo.push(`Bruker: ${img.uploaded_by_name}`);
        }
        if (img.category) {
          imageInfo.push(`Kategori: ${getCategoryLabel(img.category)}`);
        }
        if (img.module_type) {
          imageInfo.push(`Modul: ${getModuleLabel(img.module_type)}`);
        }

        pdf.text(imageInfo.join(' • '), margin + 10, yPosition);
        yPosition += 5;

        if (img.description) {
          const descLines = pdf.splitTextToSize(img.description, contentWidth - 20);
          pdf.text(descLines, margin + 10, yPosition);
          yPosition += descLines.length * 4;
        }

        yPosition += 10;
      } catch (error) {
        console.error('Failed to add image:', error);
        pdf.setFontSize(10);
        pdf.text(`Kunne ikke laste bilde: ${img.title}`, margin + 10, yPosition);
        yPosition += 10;
      }
    }
  }

  // ========== AVVIK OG ENDRINGSMELDINGER ==========
  if ((deviations && deviations.length > 0) || (changes && changes.length > 0)) {
    pdf.addPage();
    currentPage++;
    yPosition = 30;
    addHeaderFooter(currentPage);

    pdf.setFontSize(20);
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFont(undefined, 'bold');
    pdf.text('Avvik og endringsmeldinger', margin, yPosition);
    yPosition += 12;

    if (deviations && deviations.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Avvik', margin, yPosition);
      yPosition += 8;

      deviations.forEach((dev, idx) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          currentPage++;
          yPosition = 30;
          addHeaderFooter(currentPage);
        }

        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${idx + 1}. ${dev.title}`, margin + 5, yPosition);
        yPosition += 6;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Status: ${getStatusLabel(dev.status)} • Alvorlighetsgrad: ${dev.severity || 'N/A'}`, margin + 5, yPosition);
        yPosition += 5;

        if (dev.description) {
          const descLines = pdf.splitTextToSize(dev.description, contentWidth - 10);
          pdf.text(descLines, margin + 5, yPosition);
          yPosition += descLines.length * 5;
        }

        yPosition += 8;
      });
    }

    if (changes && changes.length > 0) {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        currentPage++;
        yPosition = 30;
        addHeaderFooter(currentPage);
      }

      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Endringsmeldinger', margin, yPosition);
      yPosition += 8;

      changes.forEach((change, idx) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          currentPage++;
          yPosition = 30;
          addHeaderFooter(currentPage);
        }

        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${idx + 1}. ${change.title}`, margin + 5, yPosition);
        yPosition += 6;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Status: ${getStatusLabel(change.status)} • Type: ${change.change_type}`, margin + 5, yPosition);
        yPosition += 5;

        if (change.description) {
          const descLines = pdf.splitTextToSize(change.description, contentWidth - 10);
          pdf.text(descLines, margin + 5, yPosition);
          yPosition += descLines.length * 5;
        }

        yPosition += 8;
      });
    }
  }

  // ========== TAKK FOR OPPDRAGET ==========
  pdf.addPage();
  currentPage++;
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.setFontSize(32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont(undefined, 'bold');
  pdf.text('Takk for oppdraget!', pageWidth / 2, pageHeight / 2 - 40, { align: 'center' });

  // Logo
  if (company?.logo_url) {
    try {
      const logoImg = await loadImage(company.logo_url);
      pdf.addImage(logoImg, 'PNG', pageWidth / 2 - 25, pageHeight / 2 - 20, 50, 25, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  pdf.setFontSize(16);
  pdf.setFont(undefined, 'italic');
  pdf.text('Av håndverkeren, for håndverkeren', pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

  // Contact info
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  yPosition = pageHeight / 2 + 40;

  if (company?.name) {
    pdf.text(company.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  }
  if (company?.phone) {
    pdf.text(`Tlf: ${company.phone}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  }
  if (company?.email) {
    pdf.text(`E-post: ${company.email}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  }
  if (company?.website) {
    pdf.text(company.website, pageWidth / 2, yPosition, { align: 'center' });
  }

  // Åpne PDF i ny fane i stedet for å returnere
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  
  // Rydd opp URL etter 1 minutt
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 60000);
  
  return pdf;
}

// Helper functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 16, g: 185, h: 129 }; // Default green
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getStatusLabel(status) {
  const labels = {
    'planlagt': 'Planlagt',
    'aktiv': 'Aktiv',
    'pause': 'Pause',
    'fullfort': 'Fullført',
    'ny': 'Ny',
    'under_behandling': 'Under behandling',
    'lukket': 'Lukket',
    'utkast': 'Utkast',
    'sendt': 'Sendt',
    'godkjent': 'Godkjent',
    'avvist': 'Avvist'
  };
  return labels[status] || status;
}

function getCategoryLabel(category) {
  const labels = {
    'for_arbeid': 'Før arbeid',
    'under_arbeid': 'Under arbeid',
    'ferdigstilt': 'Ferdigstilt',
    'avvik': 'Avvik',
    'endringsarbeid': 'Endringsarbeid',
    'dokumentasjon': 'Dokumentasjon'
  };
  return labels[category] || category;
}

function getModuleLabel(moduleType) {
  const labels = {
    'quote': 'Tilbud',
    'invoice': 'Faktura',
    'deviation': 'Avvik',
    'change': 'Endringsmelding',
    'manual': 'Manuell',
    'fdv': 'FDV'
  };
  return labels[moduleType] || moduleType;
}