import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all quote follow-ups that need reminders
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get all active quote follow-ups
    const allQuotes = await base44.asServiceRole.entities.QuoteFollowUp.list();
    
    // Filter for quotes that need reminders
    const remindersNeeded = allQuotes.filter(quote => {
      if (!quote.next_followup_date) return false;
      if (quote.follow_up_completed) return false;
      if (['godkjent', 'avslatt', 'utlopt'].includes(quote.phase)) return false;
      
      return quote.next_followup_date === todayStr || quote.next_followup_date === tomorrowStr;
    });
    
    console.log(`Found ${remindersNeeded.length} quotes needing reminders`);
    
    // Send reminders for each quote
    for (const quote of remindersNeeded) {
      try {
        const isTomorrow = quote.next_followup_date === tomorrowStr;
        const reminderText = isTomorrow 
          ? `Oppfølging planlagt for i morgen (${quote.next_followup_date})`
          : `Oppfølging planlagt for i dag (${quote.next_followup_date})`;
        
        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: quote.responsible_user,
          subject: `Tilbudsoppfølging: ${quote.customer_name} - ${quote.quote_reference}`,
          body: `
Hei,

${reminderText}

Kunde: ${quote.customer_name}
Tilbudsnummer: ${quote.quote_reference}
Beløp: ${quote.quote_amount?.toLocaleString('nb-NO')} kr
Fase: ${quote.phase}

Logg inn og oppdater oppfølgingen i CRM-modulen.

Hilsen,
En Plattform
          `
        });
        
        console.log(`Sent reminder to ${quote.responsible_user} for quote ${quote.quote_reference}`);
      } catch (emailError) {
        console.error(`Failed to send email for quote ${quote.id}:`, emailError);
      }
    }
    
    return Response.json({
      success: true,
      reminders_sent: remindersNeeded.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking follow-up reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});