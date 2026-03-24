import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TEMPLATES = [
  // ============ TØMRER ============
  { name: "Tømrer - Etasjeskiller - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Etasjeskiller", fokusomrade: "Grunnkontroll", description: "Kontrollere at etasjeskiller er korrekt oppbygd og avstivet.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Bjelker er korrekt dimensjonert iht. tegninger", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Bjelker er korrekt plassert og avstivet", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Opplagring på murvegg/søyler er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Avstivning på siden er montert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Avstivning på undersiden er montert", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Bjelkeender er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Fuktskader eller råteskader er ikke synlig", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Alle bjelker er merket med nummer/identifikasjon", required: false, allow_image: false, allow_comment: true },
    { order: 8, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Etasjeskiller - Isolasjon", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Etasjeskiller", fokusomrade: "Isolasjon", description: "Kontrollere at isolasjon er korrekt montert mellom etasjer.", sections: [{ title: "Isolasjonskontroll", order: 0, items: [
    { order: 0, title: "Isolasjonsmateriale er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Isolasjonstykkelse er korrekt (f.eks. 100 mm, 150 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Isolasjon dekker hele etasjeskilleren", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Isolasjon er tett og uten hull/spalter", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Isolasjon er ikke fuktig eller skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Isolasjon er montert på riktig side (varmt rom)", required: true, allow_image: false, allow_comment: true },
    { order: 6, title: "Eventuelle gjennomføringer for rør/ledninger er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Isolasjonen er ikke komprimert eller deformert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Etasjeskiller - Lyddemping", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Etasjeskiller", fokusomrade: "Lyddemping", description: "Kontrollere at lyddemping er korrekt montert.", sections: [{ title: "Lyddemping", order: 0, items: [
    { order: 0, title: "Lyddemping er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Lyddemping er montert under bjelker", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Lyddemping dekker hele etasjeskilleren", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Lyddemping er tett og uten hull", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Lyddemping er ikke skadet eller fuktig", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Eventuelle gjennomføringer er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Lyddemping er ikke komprimert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Yttervegger - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Yttervegger", fokusomrade: "Grunnkontroll", description: "Kontrollere at yttervegg er korrekt oppbygd og avstivet.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Stendere er korrekt dimensjonert iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Stendere er korrekt plassert (f.eks. 600 mm senteravstand)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Stendere er loddrett (kontroll med vater)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Topplekt er montert og festet", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Bunnskinnene er montert og festet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Diagonale avstivninger er montert", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Alle fuger og skjøter er tette", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Stendere er ikke skadet eller fuktig", required: true, allow_image: true, allow_comment: true },
    { order: 8, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Yttervegger - Isolasjon", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Yttervegger", fokusomrade: "Isolasjon", description: "Kontrollere at isolasjon er korrekt montert i yttervegg.", sections: [{ title: "Isolasjonskontroll", order: 0, items: [
    { order: 0, title: "Isolasjonsmateriale er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Isolasjonstykkelse er korrekt (f.eks. 150 mm, 200 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Isolasjon fyller hele veggrummet", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Isolasjon er tett og uten hull/spalter", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Isolasjon er ikke fuktig eller skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Isolasjon er montert på varmt side", required: true, allow_image: false, allow_comment: true },
    { order: 6, title: "Eventuelle gjennomføringer er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Isolasjonen er ikke komprimert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Yttervegger - Tetting (Vindsperre & Dampsperre)", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Yttervegger", fokusomrade: "Tetting", description: "Kontrollere at vindsperre og dampsperre er korrekt montert.", sections: [{ title: "Sperre-kontroll", order: 0, items: [
    { order: 0, title: "Vindsperre er montert på utsiden av isolasjonen", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Vindsperre overlapper minst 100 mm", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Vindsperre er festet til stendere", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Dampsperre er montert på innsiden av isolasjonen", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Dampsperre overlapper minst 100 mm", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Dampsperre er festet til stendere", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Alle overlapper er tettet med tape", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Eventuelle gjennomføringer er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 8, title: "Ingen hull eller skader på sperre", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Innvendige Vegger - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Innvendige Vegger", fokusomrade: "Grunnkontroll", description: "Kontrollere at innvendige vegger er korrekt oppbygd.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Stendere er korrekt dimensjonert", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Stendere er korrekt plassert (f.eks. 600 mm senteravstand)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Stendere er loddrett", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Topplekt er montert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Bunnskinnene er montert", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Alle fuger og skjøter er tette", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Stendere er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Innvendige Vegger - Lyddemping", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Innvendige Vegger", fokusomrade: "Lyddemping", description: "Kontrollere at lyddemping er korrekt montert.", sections: [{ title: "Lyddemping", order: 0, items: [
    { order: 0, title: "Lyddemping er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Lyddemping er montert mellom stendere", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Lyddemping dekker hele vegghøyden", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Lyddemping er tett og uten hull", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Lyddemping er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Lyddemping er ikke komprimert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Innvendige Vegger - Brannsikring", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Innvendige Vegger", fokusomrade: "Brannsikring", description: "Kontrollere at brannsikring er korrekt montert.", sections: [{ title: "Brannsikring", order: 0, items: [
    { order: 0, title: "Brannsikringsmateriale er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Brannsikring er montert på riktig side", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Brannsikring dekker hele veggen", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Brannsikring er tett og uten hull", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Brannsikring er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Eventuelle gjennomføringer er tettet med brannsikringsmateriale", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Brannsikring er merket med brannsikringsklasse", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Tak - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Tak", fokusomrade: "Grunnkontroll", description: "Kontrollere at takkonstruksjon er korrekt oppbygd.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Sperrer er korrekt dimensjonert iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Sperrer er korrekt plassert", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Sperrer er i riktig vinkel", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Opplagring på murvegg/søyler er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Avstivninger er montert", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Alle fuger og skjøter er tette", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Sperrer er ikke skadet eller fuktig", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Tak - Isolasjon", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Tak", fokusomrade: "Isolasjon", description: "Kontrollere at isolasjon er korrekt montert i tak.", sections: [{ title: "Isolasjonskontroll", order: 0, items: [
    { order: 0, title: "Isolasjonsmateriale er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Isolasjonstykkelse er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Isolasjon fyller hele takrummet", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Isolasjon er tett og uten hull/spalter", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Isolasjon er ikke fuktig eller skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Isolasjon er montert på varmt side", required: true, allow_image: false, allow_comment: true },
    { order: 6, title: "Eventuelle gjennomføringer er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Isolasjonen er ikke komprimert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Tak - Dampsperre", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Tak", fokusomrade: "Dampsperre", description: "Kontrollere at dampsperre er korrekt montert.", sections: [{ title: "Dampsperre", order: 0, items: [
    { order: 0, title: "Dampsperre er montert på varmt side av isolasjonen", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Dampsperre overlapper minst 100 mm", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Dampsperre er festet til sperrer", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Alle overlapper er tettet med tape", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Eventuelle gjennomføringer er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Ingen hull eller skader på dampsperre", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Dører & Vinduer - Montering", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Dører & Vinduer", fokusomrade: "Montering", description: "Kontrollere at dører og vinduer er korrekt montert.", sections: [{ title: "Montering", order: 0, items: [
    { order: 0, title: "Karmer er korrekt montert i åpningen", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Karmer er loddrett og vannrett (kontroll med vater)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Karmer er festet til stendere/murvegg", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Dør/vindu er montert i karm", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Dør/vindu åpner og lukker lett", required: true, allow_image: false, allow_comment: true },
    { order: 5, title: "Dør/vindu er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Dører & Vinduer - Tetting", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Dører & Vinduer", fokusomrade: "Tetting", description: "Kontrollere at dører og vinduer er korrekt tettet.", sections: [{ title: "Tetting", order: 0, items: [
    { order: 0, title: "Tetningsmasse er montert rundt karm", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Tetningsmasse er tett og uten hull", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Tetningsmasse er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Tetningsmasse er ikke fuktig eller muggen", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Eventuelle spalter er tettet", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Gulv - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Gulv", fokusomrade: "Grunnkontroll", description: "Kontrollere at gulvkonstruksjon er korrekt oppbygd.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Bjelker er korrekt dimensjonert", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Bjelker er korrekt plassert", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Opplagring på murvegg/søyler er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Avstivninger er montert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Alle fuger og skjøter er tette", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Bjelker er ikke skadet eller fuktig", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Gulv - Isolasjon", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Gulv", fokusomrade: "Isolasjon", description: "Kontrollere at isolasjon er korrekt montert under gulv.", sections: [{ title: "Isolasjonskontroll", order: 0, items: [
    { order: 0, title: "Isolasjonsmateriale er valgt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Isolasjonstykkelse er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Isolasjon fyller hele gulvrummet", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Isolasjon er tett og uten hull", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Isolasjon er ikke fuktig eller skadet", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Isolasjonen er ikke komprimert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Trapper - Grunnkontroll", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Trapper", fokusomrade: "Grunnkontroll", description: "Kontrollere at trappestrukturen er korrekt oppbygd.", sections: [{ title: "Grunnkontroll", order: 0, items: [
    { order: 0, title: "Stringere er korrekt dimensjonert", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Stringere er korrekt plassert", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Stringere er i riktig vinkel", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Trinn er montert på stringere", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Alle fuger og skjøter er tette", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Stringere og trinn er ikke skadet", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Eventuelle reparasjoner er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Tømrer - Trapper - Sikkerhet", category: "tømrer", faggruppe: "Tømrer", bygningsdel: "Trapper", fokusomrade: "Sikkerhet", description: "Kontrollere at trappers sikkerhetsutstyr er korrekt montert.", sections: [{ title: "Sikkerhet", order: 0, items: [
    { order: 0, title: "Rekkverk er montert på begge sider", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Rekkverk er festet til stringere", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Rekkverk er stabilt og ikke løst", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Håndlister er montert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Håndlister er glatt og ikke splintret", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Trinn har anti-glid overflate", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Trinnhøyde er lik (ikke variabel)", required: true, allow_image: true, allow_comment: true },
    { order: 7, title: "Trinnbredde er lik (ikke variabel)", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ ELEKTRIKKER ============
  { name: "Elektrikker - Hovedfordeling - Innkobling", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Hovedfordeling", fokusomrade: "Innkobling", description: "Kontrollere at hovedfordeling er korrekt innkoblet.", sections: [{ title: "Innkobling", order: 0, items: [
    { order: 0, title: "Kursfortegnelse er oppdatert og lesbar", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Alle kabelinnføringer er forsvarlig tettet", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Alle sikringer er korrekt merket", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Jordlegging av skap er utført", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Kurssikringer har korrekt størrelse iht. dimensjonering", required: true, allow_image: false, allow_comment: true },
    { order: 5, title: "Jordfeilbryter er montert der påkrevd", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Overspenningsvern er montert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Hovedfordeling - Sikkerhet", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Hovedfordeling", fokusomrade: "Sikkerhet", description: "Sikkerhetskontroll av hovedfordeling.", sections: [{ title: "Sikkerhet", order: 0, items: [
    { order: 0, title: "Alle deksler er montert", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Ingen bar spenningsførende deler er eksponert", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Advarselsskilt er montert", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "HMS-datablad for utstyr er tilgjengelig", required: false, allow_image: false, allow_comment: true },
    { order: 4, title: "Brannslokker er i nærheten", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Strømkretser - Dimensjonering", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Strømkretser", fokusomrade: "Dimensjonering", description: "Kontrollere at strømkretser er korrekt dimensjonert.", sections: [{ title: "Dimensjonering", order: 0, items: [
    { order: 0, title: "Kabeltykkelse er korrekt iht. strømlast", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Sikringsstørrelse matcher kabelens kapasitet", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Maksimalt antall stikkontakter per kurs er overholdt", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Spesialkurser (komfyr, vaskemaskin) er etablert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Kabler er lagt i rør/kanaler der påkrevd", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Belysning - Montering", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Belysning", fokusomrade: "Montering", description: "Kontrollere at belysning er korrekt montert.", sections: [{ title: "Montering", order: 0, items: [
    { order: 0, title: "Armaturer er montert iht. tegninger", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Alle tilkoblinger er forsvarlig utført", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Armaturer er jordet der påkrevd", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Dimmer er korrekt montert og konfigurert", required: false, allow_image: true, allow_comment: true },
    { order: 4, title: "Nødlysarmaturer er montert og testet", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Stikkontakter - Montering", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Stikkontakter", fokusomrade: "Montering", description: "Kontrollere at stikkontakter er korrekt montert.", sections: [{ title: "Montering og test", order: 0, items: [
    { order: 0, title: "Stikkontakter er montert i korrekt høyde", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Fase, nøytral og jord er korrekt tilkoblet", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Jordfeilbryter beskytter stikkontaktene i våtrom", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Stikkontakter i våtrom har IP44 eller høyere beskyttelse", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Barnesikrering er montert der påkrevd", required: false, allow_image: true, allow_comment: true },
    { order: 5, title: "Alle stikkontakter er testet og fungerer", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Jordlegging - Kontroll", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Jordlegging", fokusomrade: "Kontroll", description: "Kontrollere at jordlegging er korrekt utført.", sections: [{ title: "Jordlegging", order: 0, items: [
    { order: 0, title: "Jordingssystem er etablert iht. forskrift", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Alle metalliske deler er jordet", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Utjevningsforbindelser er utført", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Jordmotstand er målt og dokumentert", required: true, allow_image: false, allow_comment: true },
    { order: 4, title: "Jordleder har korrekt tverrsnitt", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Elektrikker - Sikkerhetssystemer - Montering og Test", category: "annet", faggruppe: "Elektrikker", bygningsdel: "Sikkerhetssystemer", fokusomrade: "Montering og Test", description: "Kontrollere at sikkerhetssystemer er korrekt montert og testet.", sections: [{ title: "Sikkerhetssystemer", order: 0, items: [
    { order: 0, title: "Røykvarslere er montert iht. TEK", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Røykvarslere er testet og fungerer", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Brannalarm er montert og konfigurert", required: false, allow_image: true, allow_comment: true },
    { order: 3, title: "Innbruddsalarm er montert og testet", required: false, allow_image: true, allow_comment: true },
    { order: 4, title: "Nødlys er montert og testet", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ RØRLEGGER ============
  { name: "Rørlegger - Varmeanlegg - Røroppsett", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Varmeanlegg", fokusomrade: "Røroppsett", description: "Kontrollere at varmeanleggets røroppsett er korrekt.", sections: [{ title: "Røroppsett", order: 0, items: [
    { order: 0, title: "Rør er korrekt dimensjonert iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Rørføringer er korrekte og ryddige", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Festemateriell er korrekt og tilstrekkelig", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Ekspansjonsrør er montert der påkrevd", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Stoppekraner er montert på alle apparater", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Avluftingsventiler er montert på høyeste punkt", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Rørlegger - Varmeanlegg - Trykktest", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Varmeanlegg", fokusomrade: "Trykktest", description: "Trykktest av varmeanlegg.", sections: [{ title: "Trykktest", order: 0, items: [
    { order: 0, title: "Anlegget er fylt med vann og luftet", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Trykket er satt til testtrykk (1,5 × driftstrykk)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Trykket holdes stabilt i minst 30 minutter", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Ingen lekkasjer observert", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Trykktestprotokoll er fylt ut og signert", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Rørlegger - Kaltvannssystem - Røroppsett", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Kaltvannssystem", fokusomrade: "Røroppsett", description: "Kontrollere at kaltvannssystemet er korrekt installert.", sections: [{ title: "Røroppsett", order: 0, items: [
    { order: 0, title: "Rørdiameter er korrekt iht. dimensjonering", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Vannmåler er montert og avlest", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Tilbakeslagsventil er montert", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Rør i kald sone er isolert mot frost", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Stoppekraner er tilgjengelige og fungerer", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Rørlegger - Avløp & Kloakk - Røroppsett", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Avløp & Kloakk", fokusomrade: "Røroppsett", description: "Kontrollere at avløps- og kloakksystemet er korrekt installert.", sections: [{ title: "Røroppsett og fall", order: 0, items: [
    { order: 0, title: "Fall på avløpsrør er korrekt (min 1:100)", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Inspeksjonsluker er tilgjengelige", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Lukkelister er montert", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Ventilasjonspipe er montert korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Sandfang er montert der påkrevd", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Rørlegger - Sanitærutstyr - Montering", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Sanitærutstyr", fokusomrade: "Montering", description: "Kontrollere at sanitærutstyr er korrekt montert.", sections: [{ title: "Montering", order: 0, items: [
    { order: 0, title: "WC er montert og festet til gulv", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Servant er montert og festet", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Badekar/dusj er montert iht. tegninger", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Blandebatteri er montert og fungerer", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Sluk er montert med korrekt fall", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Alle tilkoblinger er tettet og lekkasjefrie", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Rørlegger - Sprinkleranlegg - Trykktest", category: "annet", faggruppe: "Rørlegger", bygningsdel: "Sprinkleranlegg", fokusomrade: "Trykktest", description: "Trykktest av sprinkleranlegg.", sections: [{ title: "Trykktest", order: 0, items: [
    { order: 0, title: "Anlegget er fylt og luftet", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Testtrykk er satt korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Trykket holdes i 2 timer uten fall", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Alle hoder er kontrollert for lekkasje", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Protokoll er utfylt og signert", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  // ============ MALER ============
  { name: "Maler - Innvendige Flater - Forberedelse", category: "annet", faggruppe: "Maler", bygningsdel: "Innvendige Flater", fokusomrade: "Forberedelse", description: "Kontrollere at flater er korrekt forberedt for maling.", sections: [{ title: "Forberedelse", order: 0, items: [
    { order: 0, title: "Overflater er rengjort for smuss og fett", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Sprekker og hull er spartlet og slipt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Overflater er slipt til jevn finish", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Støv er fjernet etter sliping", required: true, allow_image: false, allow_comment: true },
    { order: 4, title: "Maskeringstape er påsatt der nødvendig", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Temperatur og fuktighet er kontrollert", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Maler - Innvendige Flater - Grunding", category: "annet", faggruppe: "Maler", bygningsdel: "Innvendige Flater", fokusomrade: "Grunding", description: "Kontrollere at grunding er korrekt utført.", sections: [{ title: "Grunding", order: 0, items: [
    { order: 0, title: "Grunning er valgt iht. underlag og toppmaling", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Grunning er påført jevnt over hele flaten", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Grunning er ikke for tykk eller tynn", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Grunning er tørr før neste strøk", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Maler - Innvendige Flater - Malingslag og Finish", category: "annet", faggruppe: "Maler", bygningsdel: "Innvendige Flater", fokusomrade: "Malingslag og Finish", description: "Kontrollere at maling er korrekt påført.", sections: [{ title: "Maling og finish", order: 0, items: [
    { order: 0, title: "Farge er korrekt iht. fargeplan", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Strøkantall er iht. spesifikasjon", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overflaten er jevn uten striper eller klatter", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Kanter og hjørner er rene", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Maskeringstape er fjernet mens maling er fuktig", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Maler - Yttervegger - Forberedelse og Grunding", category: "annet", faggruppe: "Maler", bygningsdel: "Yttervegger", fokusomrade: "Forberedelse og Grunding", description: "Forberedelse og grunding av yttervegger.", sections: [{ title: "Forberedelse", order: 0, items: [
    { order: 0, title: "Alle sprekker er reparert", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Overflaten er rengjort med høytrykkspyler", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Sopp og alger er behandlet", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Grunning er påført og tørket", required: true, allow_image: false, allow_comment: true },
    { order: 4, title: "Vær- og temperaturforhold er godkjent (>5°C, ikke regn)", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  // ============ MURERER ============
  { name: "Murerer - Grunnmur - Steinlegging og Fuging", category: "annet", faggruppe: "Murerer", bygningsdel: "Grunnmur", fokusomrade: "Steinlegging og Fuging", description: "Kontrollere at grunnmur er korrekt murt og fuget.", sections: [{ title: "Muring", order: 0, items: [
    { order: 0, title: "Betongfundament er kontrollert og godkjent", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Murstein er korrekt type iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Vertikale fuger er forskyvet (ikke stablet)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Fugetykkelse er jevn (ca. 12 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Veggen er loddrett (kontroll med vater)", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Veggen er vannrett (kontroll med vater)", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Murerer - Grunnmur - Tetting og Drenering", category: "annet", faggruppe: "Murerer", bygningsdel: "Grunnmur", fokusomrade: "Tetting og Drenering", description: "Kontrollere tetting og drenering av grunnmur.", sections: [{ title: "Tetting og drenering", order: 0, items: [
    { order: 0, title: "Fuktsperre er påført utsiden av grunnmur", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Dreneringsplate er montert mot grunn", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Dreneringsrør er montert ved fot av grunnmur", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Grunnmur er isolert på utsiden", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Murerer - Yttervegger - Steinlegging og Fuging", category: "annet", faggruppe: "Murerer", bygningsdel: "Yttervegger", fokusomrade: "Steinlegging og Fuging", description: "Kontrollere at yttervegger er korrekt murt.", sections: [{ title: "Muring og fuging", order: 0, items: [
    { order: 0, title: "Forankring til bærende konstruksjon er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Fuging er utført med korrekt fugmasse", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Ekspansjonsfuger er plassert korrekt (maks 6 m)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Overdekning av armering er korrekt", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Murerer - Skorsteiner - Muring og Tetning", category: "annet", faggruppe: "Murerer", bygningsdel: "Skorsteiner", fokusomrade: "Muring og Tetning", description: "Kontrollere at skorstein er korrekt murt.", sections: [{ title: "Skorstein", order: 0, items: [
    { order: 0, title: "Indre mål er korrekt iht. fyringsutstyr", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Murstein er syrfast/ildfast der påkrevd", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Sotluke er montert og fungerer", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Avstand til brennbart materiale er overholdt", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Tetning mot tak er korrekt utført", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Høyde over møne er korrekt (min 0,8 m)", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ BLIKKENSLAGER ============
  { name: "Blikkenslager - Takbelegg - Montering og Tetting", category: "annet", faggruppe: "Blikkenslager", bygningsdel: "Takbelegg", fokusomrade: "Montering og Tetting", description: "Kontrollere at takbelegg er korrekt montert.", sections: [{ title: "Montering", order: 0, items: [
    { order: 0, title: "Undertak er kontrollert og godkjent", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Belegg er montert iht. produsentens anvisning", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Overlapping er korrekt (iht. takvinkel og produsentanvisning)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Ekspansjonsfuger er montert der påkrevd", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Gjennomføringer er tettet med godkjent materiale", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Beslag rundt pipe/ventilasjon er korrekt utført", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Blikkenslager - Takrenner & Nedløp - Montering", category: "annet", faggruppe: "Blikkenslager", bygningsdel: "Takrenner & Nedløp", fokusomrade: "Montering", description: "Kontrollere at takrenner og nedløp er korrekt montert.", sections: [{ title: "Takrenner og nedløp", order: 0, items: [
    { order: 0, title: "Fall på takrenner er korrekt (min 3-5 mm/m)", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Takrenner er festet med korrekt avstand (max 800 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Nedløp er plassert og dimensjonert korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Alle skjøter er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Dreneringsfot leder vann bort fra fundament", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Blikkenslager - Ventilasjon - Montering og Tetting", category: "annet", faggruppe: "Blikkenslager", bygningsdel: "Ventilasjon", fokusomrade: "Montering og Tetting", description: "Kontrollere at ventilasjonskanaler er korrekt montert.", sections: [{ title: "Ventilasjon", order: 0, items: [
    { order: 0, title: "Kanaler er dimensjonert iht. prosjektering", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Kanaler er tettet ved alle skjøter", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Kanaler i kald sone er isolert", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Gjennomføringer i tak/vegg er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Avtrekksventiler er montert korrekt", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ TAKTEKKER ============
  { name: "Taktekker - Takbelegg Teglstein - Legging", category: "tak", faggruppe: "Taktekker", bygningsdel: "Takbelegg (Teglstein)", fokusomrade: "Legging", description: "Kontrollere at teglstein er korrekt lagt.", sections: [{ title: "Steglegging", order: 0, items: [
    { order: 0, title: "Undertak er kontrollert og tett", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Lekteruavstand er korrekt iht. takstein", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overlapping er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Stein er festet med klemmer/skruer der påkrevd", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Møne og skjørt er tett", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Ingen knekte eller skadde stein", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Taktekker - Takbelegg Takpapp - Legging og Tetting", category: "tak", faggruppe: "Taktekker", bygningsdel: "Takbelegg (Takpapp)", fokusomrade: "Legging og Tetting", description: "Kontrollere at takpapp er korrekt lagt.", sections: [{ title: "Takpapp", order: 0, items: [
    { order: 0, title: "Underlag er rent og jevnt", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Overlapping er korrekt (min 100 mm sideoverlap)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Papp er smeltet ned korrekt (ved bruk av gassbrenner)", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Oppkant ved vegger og gjennomføringer er minst 150 mm", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Ekspansjonsfuger er montert der påkrevd", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Taktekker - Takbelegg Skifer - Legging", category: "tak", faggruppe: "Taktekker", bygningsdel: "Takbelegg (Skifer)", fokusomrade: "Legging", description: "Kontrollere at skifer er korrekt lagt.", sections: [{ title: "Skiferlegging", order: 0, items: [
    { order: 0, title: "Skifer er jevn og uten store sprekker", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Overlapping er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Spikring er korrekt (kobberspiker anbefalt)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Beslag er montert ved møne og grater", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Taktekker - Takbelegg Metalltak - Legging og Tetting", category: "tak", faggruppe: "Taktekker", bygningsdel: "Takbelegg (Metalltak)", fokusomrade: "Legging og Tetting", description: "Kontrollere at metalltak er korrekt montert.", sections: [{ title: "Metalltak", order: 0, items: [
    { order: 0, title: "Undertak er kontrollert og tett", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Metallplater er montert med korrekt overlapping", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Ekspansjonsfuger er ivaretatt (glidskruer)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Skruetetthet er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Beslag ved gjennomføringer er tett", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ MEMBRANLEGGER ============
  { name: "Membranlegger - Flate Tak - Membranlegging", category: "tak", faggruppe: "Membranlegger", bygningsdel: "Flate Tak", fokusomrade: "Membranlegging", description: "Kontrollere at membran er korrekt lagt på flatt tak.", sections: [{ title: "Membranlegging", order: 0, items: [
    { order: 0, title: "Underlag er rent, tørt og jevnt", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Fall fra midten mot takrenner er korrekt (min 1:40)", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Membran er valgt korrekt type", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Overlapping er korrekt (min 80-100 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Membran er tettet ved alle overlapper", required: true, allow_image: true, allow_comment: true },
    { order: 5, title: "Oppkanter er minst 150 mm over ferdig tak", required: true, allow_image: true, allow_comment: true },
    { order: 6, title: "Gjennomføringer er tettet med korrekt beslag", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Membranlegger - Kjellergulv - Fuktskjerming", category: "annet", faggruppe: "Membranlegger", bygningsdel: "Kjellergulv", fokusomrade: "Fuktskjerming", description: "Kontrollere at fuktskjerming i kjellergulv er korrekt utført.", sections: [{ title: "Fuktskjerming", order: 0, items: [
    { order: 0, title: "Kapillærbrytende lag er kontrollert (pukk/grus)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Membran er lagt ut på kapillærbrytende lag", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Membran er ført opp langs vegg (min 150 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Overlapper er tettet", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Ingen skader på membranen", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Membranlegger - Skråtak - Membranlegging", category: "tak", faggruppe: "Membranlegger", bygningsdel: "Skråtak", fokusomrade: "Membranlegging", description: "Kontrollere at membran er korrekt lagt på skråtak.", sections: [{ title: "Membranlegging skråtak", order: 0, items: [
    { order: 0, title: "Bærende konstruksjon er kontrollert og godkjent", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Underlag er jevnt og uten fremspring", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Membran starter fra nedre kant", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Overlapping er korrekt (nedre over øvre)", required: true, allow_image: true, allow_comment: true },
    { order: 4, title: "Membran er festet mot vind", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ SVEISER ============
  { name: "Sveiser - Stålkonstruksjoner - Forberedelse og Sveiseteknikk", category: "annet", faggruppe: "Sveiser", bygningsdel: "Stålkonstruksjoner", fokusomrade: "Forberedelse og Sveiseteknikk", description: "Kontrollere at sveising av stålkonstruksjoner er korrekt utført.", sections: [{ title: "Forberedelse", order: 0, items: [
    { order: 0, title: "Sveisemetode er valgt iht. materiale og krav", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Sveiser har gyldig sertifisering", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Sveisemateriale er kontrollert og godkjent", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Overflater er renset for rust, lakk og fett", required: true, allow_image: true, allow_comment: true }
  ]}, { title: "Sveiseteknikk", order: 1, items: [
    { order: 0, title: "Rotsveis er utført korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Antall sveistrenger er korrekt", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Sveisesøm er jevn og uten porer/sprekker", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "NDT (NDE) kontroll er utført der påkrevd", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Sveiser - Rørsveising - Sveiseteknikk og Trykktest", category: "annet", faggruppe: "Sveiser", bygningsdel: "Rørsveising", fokusomrade: "Sveiseteknikk og Trykktest", description: "Kontrollere at rørsveising er korrekt utført.", sections: [{ title: "Rørsveising", order: 0, items: [
    { order: 0, title: "Rørender er korrekt forberedt (avgradet og renset)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Tilpasning av rørende er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Sveisesøm er røntgenkontrollert der påkrevd", required: false, allow_image: false, allow_comment: true },
    { order: 3, title: "Trykktesting er utført og dokumentert", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Sveiser - Platekonstruksjoner - Kvalitetskontroll", category: "annet", faggruppe: "Sveiser", bygningsdel: "Platekonstruksjoner", fokusomrade: "Kvalitetskontroll", description: "Kvalitetskontroll av sveiste platekonstruksjoner.", sections: [{ title: "Kvalitetskontroll", order: 0, items: [
    { order: 0, title: "Dimensjoner er iht. tegninger (±2 mm)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Sveisesøm er visuelt kontrollert", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Overflatebehandling er utført korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Konstruksjonen er merket med materialsertifikat", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  // ============ BETONGARBEIDER ============
  { name: "Betong - Fundamenter - Forarbeid og Armering", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Fundamenter", fokusomrade: "Forarbeid og Armering", description: "Kontrollere at fundamenter er korrekt forberedt og armert.", sections: [{ title: "Forarbeid", order: 0, items: [
    { order: 0, title: "Grøft er gravd til korrekt dybde (under frostgrense)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Bunnfall er stabilt og jevnt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Pukklaget er jevnt og korrekt tykkelse", required: true, allow_image: true, allow_comment: true }
  ]}, { title: "Armering", order: 1, items: [
    { order: 0, title: "Armeringstykkelse er korrekt iht. tegninger", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Overdekning (betongen over armering) er korrekt (min 50 mm mot grunn)", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Skjøting av armering er korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Armering er festet og stabil", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Betong - Fundamenter - Støping og Etterbehandling", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Fundamenter", fokusomrade: "Støping og Etterbehandling", description: "Kontrollere at støping av fundamenter er korrekt utført.", sections: [{ title: "Støping", order: 0, items: [
    { order: 0, title: "Betongkvalitet er korrekt iht. prosjektering", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Betong er vibrert korrekt uten segregering", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Utfylling er jevn uten luftlommer", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Terningprøver er tatt og merket", required: true, allow_image: true, allow_comment: true }
  ]}, { title: "Etterbehandling", order: 1, items: [
    { order: 0, title: "Betong er herdet korrekt (vanningeller dekket)", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Forskaling er fjernet etter tilstrekkelig herdetid", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overflate er kontrollert for sprekker", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Betong - Søyler & Bjelker - Armering og Støping", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Søyler & Bjelker", fokusomrade: "Armering og Støping", description: "Kontrollere armering og støping av søyler og bjelker.", sections: [{ title: "Armering", order: 0, items: [
    { order: 0, title: "Lengdearmering er korrekt diameter og antall", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Bøyler er korrekt dimensjon og avstand", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Overdekning er korrekt (min 25 mm innvendig)", required: true, allow_image: true, allow_comment: true }
  ]}, { title: "Støping", order: 1, items: [
    { order: 0, title: "Forskalingen er tett og stabil", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Betong er fylt i lag (max 500 mm) og vibrert", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overflaten er jevn etter utskaling", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Betong - Dekker - Armering og Støping", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Dekker", fokusomrade: "Armering og Støping", description: "Kontrollere armering og støping av betongdekker.", sections: [{ title: "Armering", order: 0, items: [
    { order: 0, title: "Bunnarmering er korrekt plassert", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Topparmering er korrekt plassert over opplegg", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Armeringsavstand er korrekt iht. tegning", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Overdekning er korrekt (min 20 mm)", required: true, allow_image: true, allow_comment: true }
  ]}, { title: "Støping", order: 1, items: [
    { order: 0, title: "Forskalingsstøtter er dimensjonert for full last", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Betong er vibrert jevnt", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overflaten er avrettet og jevn", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Herding er iverksatt umiddelbart", required: true, allow_image: false, allow_comment: true }
  ]}], version: 1 },

  { name: "Betong - Vegger - Armering og Støping", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Vegger", fokusomrade: "Armering og Støping", description: "Kontrollere armering og støping av betongvegger.", sections: [{ title: "Armering og forskling", order: 0, items: [
    { order: 0, title: "Armering er korrekt plassert (tosidig)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Forskalingsbånd er plassert korrekt", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Forskalingsanker er dimensjonert for betongtrykk", required: true, allow_image: false, allow_comment: true }
  ]}, { title: "Støping", order: 1, items: [
    { order: 0, title: "Betong er fylt i lag og vibrert fra topp", required: true, allow_image: false, allow_comment: true },
    { order: 1, title: "Støpehastighet er kontrollert (maks 1-2 m/time)", required: true, allow_image: false, allow_comment: true },
    { order: 2, title: "Overflate er jevn etter utskaling", required: true, allow_image: true, allow_comment: true },
    { order: 3, title: "Reparasjon av honningkaker er dokumentert", required: false, allow_image: true, allow_comment: true }
  ]}], version: 1 },

  { name: "Betong - Gulv - Støping og Etterbehandling", category: "betong", faggruppe: "Betongarbeider", bygningsdel: "Gulv", fokusomrade: "Støping og Etterbehandling", description: "Kontrollere støping og etterbehandling av betonggulv.", sections: [{ title: "Støping", order: 0, items: [
    { order: 0, title: "Underlag er stabilt og jevnt (kapillærbrytende lag)", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Radonsikring/membran er lagt ut", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Gulvvarmerør er fastmontert (ved gulvvarme)", required: false, allow_image: true, allow_comment: true },
    { order: 3, title: "Betong er vibrert og avrettet", required: true, allow_image: false, allow_comment: true }
  ]}, { title: "Etterbehandling", order: 1, items: [
    { order: 0, title: "Overflaten er glattet til korrekt finish", required: true, allow_image: true, allow_comment: true },
    { order: 1, title: "Ekspansjonsfuger er støpt inn der påkrevd", required: true, allow_image: true, allow_comment: true },
    { order: 2, title: "Herdebehandling er utført (herdemiddel eller dekke)", required: true, allow_image: false, allow_comment: true },
    { order: 3, title: "Flathet er kontrollert (max 5 mm per 3 m)", required: true, allow_image: true, allow_comment: true }
  ]}], version: 1 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { overwrite } = await req.json().catch(() => ({ overwrite: false }));

    const existing = await base44.asServiceRole.entities.ChecklistTemplate.list('-created_date', 200);
    const existingNames = new Set(existing.map(t => t.name));

    let created = 0;
    let skipped = 0;

    for (const tpl of TEMPLATES) {
      if (!overwrite && existingNames.has(tpl.name)) {
        skipped++;
        continue;
      }
      if (overwrite && existingNames.has(tpl.name)) {
        const match = existing.find(e => e.name === tpl.name);
        if (match) await base44.asServiceRole.entities.ChecklistTemplate.delete(match.id);
      }
      await base44.asServiceRole.entities.ChecklistTemplate.create(tpl);
      created++;
    }

    return Response.json({
      success: true,
      created,
      skipped,
      total: TEMPLATES.length,
      message: `${created} maler opprettet, ${skipped} allerede eksisterende hoppet over.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});