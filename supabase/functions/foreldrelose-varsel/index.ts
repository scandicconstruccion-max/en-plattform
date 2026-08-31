// supabase/functions/foreldrelose-varsel/index.ts
//
// Varsler support@enplattform.no når en auth-bruker har stått uten rad i
// public.user_profiles i mer enn fem minutter.
//
// Bakgrunn: 12.08.2026 falt to selvregistrerte brukere gjennom uten at noe
// system sa fra. Den ene var en ekte kunde som satt i tre uker med en konto
// som ikke virket. Triggeren on_auth_user_created skal gjøre dette umulig —
// denne funksjonen er beltet til de buksesele.
//
// Kjøres på plan (Supabase Dashboard → Edge Functions → Schedules), hvert
// 5. minutt: */5 * * * *
//
// Kilde: RPC public.foreldrelose_auth_brukere(p_minutter, p_maks_alder_timer).
// Deduping: public.signup_varsel_sendt — uten den ville samme bruker utløst
// et varsel hvert femte minutt til noen ryddet opp.
//
// Krever secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
// Valgfritt: FROM_EMAIL (default tilbud@enplattform.no),
//            VARSEL_TIL (default support@enplattform.no).
//
// Denne funksjonen SKAL IKKE reparere noe selv. Å gjette på hvilken bedrift
// en foreldreløs bruker hører til er verre enn å la et menneske se på det.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MINUTTER = 5        // hvor lenge en bruker får stå uten profil før vi roper
const MAKS_ALDER_TIMER = 48  // eldre enn dette er ikke lenger en hendelse, men en oppgave

// Alt som kommer fra raw_user_meta_data er skrevet av brukeren selv og skal
// aldri treffe e-posten som rå HTML.
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // Planleggeren kaller med service-role-nøkkelen. Ingen andre skal inn her —
  // svaret inneholder e-postadresser til nyregistrerte.
  const auth = req.headers.get('Authorization') ?? ''
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)

    // 1) Hvem mangler profil?
    const { data: foreldrelose, error: rpcErr } = await supabase
      .rpc('foreldrelose_auth_brukere', {
        p_minutter: MINUTTER,
        p_maks_alder_timer: MAKS_ALDER_TIMER,
      })

    if (rpcErr) {
      console.error('[foreldrelose-varsel] RPC feilet:', rpcErr)
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const alle = (foreldrelose ?? []) as Array<{
      id: string; email: string | null; created_at: string; meta: Record<string, unknown> | null
    }>

    if (alle.length === 0) {
      return new Response(JSON.stringify({ ok: true, funnet: 0, varslet: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Luk ut dem vi allerede har varslet om.
    const { data: alleredeSendt } = await supabase
      .from('signup_varsel_sendt')
      .select('user_id')
      .in('user_id', alle.map(u => u.id))

    const sendtSet = new Set((alleredeSendt ?? []).map((r: { user_id: string }) => r.user_id))
    const nye = alle.filter(u => !sendtSet.has(u.id))

    if (nye.length === 0) {
      return new Response(JSON.stringify({ ok: true, funnet: alle.length, varslet: 0, grunn: 'alle allerede varslet' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Har triggeren logget en feil for noen av dem? Da skal den stå i mailen —
    //    det er forskjellen på «noe gikk galt» og «her er hva som gikk galt».
    const { data: feil } = await supabase
      .from('signup_feil')
      .select('user_id, feilmelding, sqlstate_kode, kontekst, created_at')
      .in('user_id', nye.map(u => u.id))
      .order('created_at', { ascending: false })

    const feilPerBruker = new Map<string, { feilmelding: string; sqlstate_kode: string; kontekst: string }>()
    for (const f of (feil ?? []) as Array<{ user_id: string; feilmelding: string; sqlstate_kode: string; kontekst: string }>) {
      if (!feilPerBruker.has(f.user_id)) feilPerBruker.set(f.user_id, f)
    }

    // 4) Bygg én samlet e-post. Én mail med fem brukere slår fem mailer.
    const rader = nye.map(u => {
      const meta = (u.meta ?? {}) as Record<string, unknown>
      const minutter = Math.round((Date.now() - new Date(u.created_at).getTime()) / 60000)
      const f = feilPerBruker.get(u.id)
      const bedrift = meta.company_name ? esc(meta.company_name) : '<em style="color:#94a3b8">ingen bedrift i metadata</em>'
      const feilLinje = f
        ? `<div style="margin-top:6px;color:#b91c1c;font-size:12px"><strong>Feil (${esc(f.kontekst)}${f.sqlstate_kode ? ' / ' + esc(f.sqlstate_kode) : ''}):</strong> ${esc(f.feilmelding)}</div>`
        : `<div style="margin-top:6px;color:#94a3b8;font-size:12px">Ingen feil logget — triggeren opprettet trolig ingenting fordi metadata mangler bedriftsnavn og det ikke finnes gyldig invitasjon.</div>`
      return `
        <tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
          <div style="font-size:14px;font-weight:600;color:#0f172a">${esc(u.email) || '(uten e-post)'}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">Bedrift i metadata: ${bedrift}</div>
          <div style="font-size:12px;color:#64748b">Opprettet: ${esc(u.created_at)} · ${minutter} min siden</div>
          <div style="font-size:11px;color:#94a3b8;font-family:ui-monospace,monospace;margin-top:2px">${esc(u.id)}</div>
          ${feilLinje}
        </td></tr>`
    }).join('')

    const emne = nye.length === 1
      ? `Auth-bruker uten profil: ${nye[0].email ?? nye[0].id}`
      : `${nye.length} auth-brukere uten profil`

    const html = `
<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a">${nye.length === 1 ? 'En bruker' : nye.length + ' brukere'} står uten profil</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.5">
    Kontoen finnes i <code>auth.users</code>, men det er ingen rad i
    <code>public.user_profiles</code> etter mer enn ${MINUTTER} minutter.
    Brukeren kan logge inn, men får et system uten bedrift og uten rettigheter.
  </p>
  <table style="width:100%;border-collapse:collapse">${rader}</table>
  <p style="margin:20px 0 0;font-size:13px;color:#0f172a;line-height:1.6">
    <strong>Slik ser du hele bildet:</strong> Kontrollpanelet → eller kjør
    månedsspørringen for foreldreløse brukere i SQL Editor.
  </p>
  <p style="margin:16px 0 0;text-align:center;color:#94a3b8;font-size:11px">Sendt fra En Plattform · foreldrelose-varsel</p>
</div>`

    // 5) Send via Resend — samme leverandør som resten av funksjonene.
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'tilbud@enplattform.no'
    const tilEmail = Deno.env.get('VARSEL_TIL') ?? 'support@enplattform.no'

    if (!resendApiKey) {
      console.error('[foreldrelose-varsel] RESEND_API_KEY mangler — varsel IKKE sendt')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY mangler', funnet: alle.length, varslet: 0 }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [tilEmail], subject: emne, html }),
    })
    const resData = await res.json().catch(() => ({}))

    if (!res.ok) {
      // Ikke marker som sendt — da prøver vi igjen om fem minutter.
      console.error('[foreldrelose-varsel] Resend', res.status, resData)
      return new Response(JSON.stringify({ error: `Resend ${res.status}`, detalj: resData, funnet: alle.length, varslet: 0 }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6) Først NÅ merker vi dem som varslet.
    const { error: merkErr } = await supabase
      .from('signup_varsel_sendt')
      .upsert(nye.map(u => ({ user_id: u.id, email: u.email })), { onConflict: 'user_id' })

    if (merkErr) {
      // Varselet er sendt. Feiler merkingen, får du det på nytt om fem minutter —
      // irriterende, men aldri tapt informasjon. Verdt å vite om i loggen.
      console.warn('[foreldrelose-varsel] Kunne ikke merke som varslet:', merkErr)
    }

    console.log(`[foreldrelose-varsel] Varslet om ${nye.length} bruker(e) — Resend ID: ${resData?.id ?? '(ingen)'}`)

    return new Response(JSON.stringify({
      ok: true, funnet: alle.length, varslet: nye.length, resend_id: resData?.id ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e) {
    console.error('[foreldrelose-varsel] Uventet feil:', e)
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
