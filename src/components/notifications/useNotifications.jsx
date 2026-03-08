import { base44 } from '@/api/base44Client';

/**
 * Central notification utility – call this from any module to create a notification.
 *
 * Usage:
 *   import { createNotification } from '@/components/notifications/useNotifications';
 *   await createNotification({
 *     userEmail: user.email,
 *     module: 'Avvik',
 *     type: 'critical',
 *     title: 'Nytt avvik',
 *     message: 'Nytt avvik opprettet: Taklekkasje',
 *     link: '/Avvik?id=123',
 *     entityId: '123',
 *   });
 */
export async function createNotification({
  userEmail,
  module,
  type = 'info',
  title,
  message,
  link = null,
  entityId = null,
}) {
  try {
    await base44.entities.Notification.create({
      userEmail: userEmail || null,
      module,
      type,
      title,
      message,
      link,
      entityId,
      status: 'unread',
      eventTime: new Date().toISOString(),
    });
  } catch (e) {
    // Never block the main action if notification fails
    console.warn('Notification creation failed:', e);
  }
}

/**
 * Module-specific helpers
 */
export const NotificationHelpers = {
  // Anbud
  anbudTilbudMottatt: (userEmail, supplierName, projectTitle, projectId) =>
    createNotification({
      userEmail,
      module: 'Anbud',
      type: 'info',
      title: 'Tilbud mottatt',
      message: `${supplierName} har levert tilbud på «${projectTitle}»`,
      link: `/Anbudsportal?projectId=${projectId}`,
      entityId: projectId,
    }),

  anbudLavSvarprosent: (userEmail, projectTitle, projectId, percent) =>
    createNotification({
      userEmail,
      module: 'Anbud',
      type: 'warning',
      title: 'Lav svarprosent',
      message: `Kun ${percent}% svar på «${projectTitle}» – vurder å sende påminnelse`,
      link: `/Anbudsportal?projectId=${projectId}`,
      entityId: projectId,
    }),

  anbudDeadlineNaer: (userEmail, projectTitle, projectId, daysLeft) =>
    createNotification({
      userEmail,
      module: 'Anbud',
      type: 'warning',
      title: 'Svarfrist nærmer seg',
      message: `«${projectTitle}» har frist om ${daysLeft} dag${daysLeft !== 1 ? 'er' : ''}`,
      link: `/Anbudsportal?projectId=${projectId}`,
      entityId: projectId,
    }),

  // Avvik
  avvikNytt: (userEmail, title, avvikId) =>
    createNotification({
      userEmail,
      module: 'Avvik',
      type: 'critical',
      title: 'Nytt avvik',
      message: `Avvik opprettet: ${title}`,
      link: `/AvvikDetaljer?id=${avvikId}`,
      entityId: avvikId,
    }),

  avvikStatusEndret: (userEmail, title, newStatus, avvikId) =>
    createNotification({
      userEmail,
      module: 'Avvik',
      type: 'info',
      title: 'Avvik oppdatert',
      message: `«${title}» har ny status: ${newStatus}`,
      link: `/AvvikDetaljer?id=${avvikId}`,
      entityId: avvikId,
    }),

  // CRM
  crmTilbudAksteptert: (userEmail, customerName, quoteId) =>
    createNotification({
      userEmail,
      module: 'CRM',
      type: 'info',
      title: 'Tilbud akseptert',
      message: `${customerName} har akseptert tilbudet`,
      link: `/Tilbud?id=${quoteId}`,
      entityId: quoteId,
    }),

  crmOppfolgingPaakreves: (userEmail, customerName, quoteId) =>
    createNotification({
      userEmail,
      module: 'CRM',
      type: 'warning',
      title: 'Oppfølging påkrevd',
      message: `Tilbud til ${customerName} nærmer seg oppfølgingstidspunkt`,
      link: `/CRM`,
      entityId: quoteId,
    }),

  // Sjekklister
  sjekklisteSignaturPaakreves: (userEmail, checklistTitle, checklistId) =>
    createNotification({
      userEmail,
      module: 'Sjekklister',
      type: 'warning',
      title: 'Signatur påkrevd',
      message: `«${checklistTitle}» venter på signatur`,
      link: `/SjekklisteDetaljer?id=${checklistId}`,
      entityId: checklistId,
    }),

  // Ressursplan
  ressursKonflikt: (userEmail, employeeName, date) =>
    createNotification({
      userEmail,
      module: 'Ressursplan',
      type: 'critical',
      title: 'Ressurskonflikt',
      message: `${employeeName} er dobbeltbooket ${date}`,
      link: `/Ressursplan`,
    }),

  // Faktura
  fakturaForfall: (userEmail, customerName, invoiceId, daysLeft) =>
    createNotification({
      userEmail,
      module: 'Faktura',
      type: daysLeft <= 0 ? 'critical' : 'warning',
      title: daysLeft <= 0 ? 'Faktura forfalt' : 'Faktura forfaller snart',
      message: `Faktura til ${customerName} ${daysLeft <= 0 ? 'er forfalt' : `forfaller om ${daysLeft} dager`}`,
      link: `/FakturaDetaljer?id=${invoiceId}`,
      entityId: invoiceId,
    }),
};