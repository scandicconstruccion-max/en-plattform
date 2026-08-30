// supabase/functions/anbud-uttrekk/index.ts
//
// Leser ren tekst fra et anbudsdokument (hentet klient-side med pdf.js) og
// returnerer prisbærende poster + forslag til faggruppe. Skiller poster fra
// prosa/krav/kontraktstekst.
//
// Secret som må settes:  ANTHROPIC_API_KEY
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Deploy:  supabase functions deploy anbud-uttrekk
// NB: "Verify JWT" kan stå PÅ – kallet gjøres med brukerens økt via
//     supabase.functions.invoke fra appen.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Bytt til 'claude-sonnet-5' for høyere nøyaktighet på rotete/prosa-tunge
// dokumenter. Haiku er raskere og billigere, og holder for de fleste anbud.
const AI_MODELL = "claude-haiku-4-5-20251001"
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Gyldige faggruppe-ID-er (må matche FAGGRUPPER i App.jsx)
const FAG = ["tomrer","murer","betong","kjerneboring","maler","rorleger","elektriker","blikkenslager","grunnarbeid","flislegger","membran","ventilasjon","riving","taktekker","anleggsgartner","feier","rigg","annet"]

const SYSTEM = `Du er ekspert på norske anbudsdokumenter for bygg (NS 3420 / NS 8407 / NS 3459). Du får rå tekst fra ett dokument og skal trekke ut KUN de prisbærende postene i mengdebeskrivelsen.

REGLER:
- Ta MED: poster som har et postnummer (f.eks. 2.1.1.13, B21.110) ELLER en tydelig mengde+enhet, og som beskriver en konkret arbeids-/leveranse-ytelse som skal prises.
- IKKE ta med: tilbudsinnbydelse, kontraktsbestemmelser, tilbudsregler, SHA-plan, FDV-krav, skjemaer, timesatser, adresselister, kapitteloverskrifter og annen ren prosa/krav. Tall som står i setninger (datoer, paragrafer, "ca. 4 m²", "kr 1.500 i dagbot", "2 stk. avløpsstammer" i en beskrivende setning) er IKKE poster.
- En post kan ha en flerlinjet beskrivelse over flere avsnitt, med mengde+enhet på egen linje (f.eks. "Antall (regulerbar post) 41 Stk."). Koble hele arbeidsbeskrivelsen til riktig mengde/enhet.
- Behold postnummeret hvis det finnes. Hold beskrivelsen KORT — maks 1–2 setninger som fanger hva som skal prises. Ikke gjengi hele avsnittet; det fulle dokumentet ligger uansett som vedlegg. (Korte beskrivelser gjør at alle postene får plass i svaret.)
- "regulerbar": true hvis posten er merket "regulerbar post". "ikkeSummer": true hvis merket "Ikke summér" (kun enhetspris/opsjon).
- enhet: normaliser til små bokstaver (stk, m2, m3, lm, rs, punkt, bad, m). Bruk "rs" for rundsum/RS.
- mengde: tall. Hvis ingen mengde er oppgitt (kun enhetspris), sett 1.
- faggruppe: foreslå ETT fag basert på arbeidets art. Gyldige verdier: ${FAG.join(", ")}. Sanitær/rør/vann/avløp/bereder = rorleger. El/kurs/varmekabel/stikk = elektriker. Flislegging/fliser = flislegger. Membran/smøremembran/tetting/vanntest = membran. Mur/påstøp/puss/betongvegg = murer. Kjerneboring/kjernebor/pigging/hulltaking/boring gjennom dekke eller vegg = kjerneboring. Riving/asbest/miljøsanering/demontering av overflater = riving. Ventilasjon/avtrekk/kanaler/vifte = ventilasjon. Rens av ventilasjonskanaler = feier. Taktekking/takhatt/tekking = taktekker. Gulv/himling/dør/innkassing/tømrerarbeid = tomrer. Utomhus/grønt/veier = anleggsgartner. Rigg/drift/nedrigg/kapitalytelser = rigg. Uklart = annet. Sett tom streng "" hvis du er usikker.

Svar KUN med gyldig JSON, uten markdown, uten forklaring:
{"poster":[{"postnr":"2.1.1.1","beskrivelse":"...","mengde":12,"enhet":"stk","regulerbar":true,"ikkeSummer":false,"faggruppe":"rorleger"}]}`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY")
    if (!key) return json({ error: "ANTHROPIC_API_KEY mangler" }, 500)

    const { tekst, filnavn } = await req.json().catch(() => ({}))
    if (!tekst || typeof tekst !== "string" || tekst.trim().length < 40) {
      return json({ error: "Ingen brukbar tekst mottatt" }, 400)
    }

    // Vern mot ekstremt store dokumenter (ca. 180k tegn ≈ ~50k tokens)
    const bruktTekst = tekst.length > 180000 ? tekst.slice(0, 180000) : tekst

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODELL,
        max_tokens: 16000,
        temperature: 0,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `Dokument${filnavn ? ` (${filnavn})` : ""}:\n\n${bruktTekst}`,
        }],
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => "")
      return json({ error: `AI-tjenesten svarte ${res.status}`, detalj: t.slice(0, 300) }, 502)
    }

    const data = await res.json()
    const stop = data?.stop_reason
    let ut = (data?.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim()
    console.log(`[anbud-uttrekk] stop=${stop} tegn=${ut.length}`)
    // Fjern ev. ```json ... ``` gjerder
    ut = ut.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()

    let parsed: any
    try { parsed = JSON.parse(ut) } catch (_) {
      const m = ut.match(/\{[\s\S]*\}/)
      if (m) { try { parsed = JSON.parse(m[0]) } catch (_) {} }
    }

    // Kunne ikke tolke svaret. Oftest fordi det ble avkuttet (stop=max_tokens).
    if (!parsed) {
      const grunn = stop === "max_tokens"
        ? "Dokumentet var for stort for ett uttrekk. Prøv igjen, eller del opp dokumentet."
        : "Kunne ikke lese dokumentet denne gangen. Prøv igjen."
      return json({ error: grunn, _stop: stop, _snippet: ut.slice(0, 200) }, 200)
    }

    const poster = Array.isArray(parsed?.poster) ? parsed.poster : []

    // Rens/valider hver post
    const rene = poster.map((p: any) => ({
      postnr: (p.postnr ?? "").toString().trim(),
      beskrivelse: (p.beskrivelse ?? "").toString().trim(),
      mengde: Number.isFinite(Number(p.mengde)) ? Number(p.mengde) : 1,
      enhet: (p.enhet ?? "stk").toString().trim().toLowerCase() || "stk",
      regulerbar: !!p.regulerbar,
      ikkeSummer: !!p.ikkeSummer,
      faggruppe: FAG.includes((p.faggruppe ?? "").toString()) ? p.faggruppe : "",
    })).filter((p: any) => p.beskrivelse.length > 1)

    return json({ poster: rene, antall: rene.length, _stop: stop })
  } catch (e) {
    return json({ error: (e as Error).message || "Ukjent feil" }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  })
}
