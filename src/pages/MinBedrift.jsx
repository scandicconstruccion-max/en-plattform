import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import { Building2, CreditCard, Check, MapPin, Phone, Mail, FileText, User, Users2, DollarSign, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import OrderModuleDialog from '@/components/minbedrift/OrderModuleDialog';
import CancelModuleDialog from '@/components/minbedrift/CancelModuleDialog';

const grunnpakkeModules = ['dashboard', 'prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms'];
const grunnpakkePrice = 139;

const moduleInfo = {
  tilbud: {
    title: 'Tilbudsmodul',
    body: 'Prosjektlederen starter arbeidsdagen med å sende et profesjonelt tilbud direkte fra systemet – uten å åpne Word eller Excel. Tilbudet knyttes til kunden, og når kunden godkjenner digitalt, kan du starte prosjektet med ett klikk. Henger tett sammen med Ordre og Faktura, slik at hele flyten fra tilbud til betaling er sømløs.'
  },
  anbudsmodul: {
    title: 'Anbudsmodul',
    body: 'Send anbudsforespørsler til flere leverandører samtidig og motta tilbud digitalt på ett sted. Sammenlign priser, velg vinner og hold full oversikt over hele anbudsprosessen. Spar tid og få bedre kontroll over innkjøp og underentreprenører. Henger tett sammen med Prosjekter og Ordre.'
  },
  ordre: {
    title: 'Ordre',
    body: 'Når tilbudet er godkjent, opprettes en arbeidsordre automatisk. Håndverkerne ser hva som skal gjøres, og prosjektlederen følger fremdriften. Ordre henger direkte sammen med Tilbudsmodul og Faktura – slik at det aldri blir dobbeltarbeid eller glemte poster.'
  },
  endringsmeldinger: {
    title: 'Endringsmeldinger',
    body: 'I byggfaget dukker det alltid opp endringer underveis. Med denne modulen registrerer håndverkeren eller prosjektlederen endringen på stedet, sender den digitalt til kunden for godkjenning, og alt dokumenteres automatisk. Ingen krangler om hva som ble avtalt – alt er sporbart. Kobles mot Prosjekter og Faktura.'
  },
  faktura: {
    title: 'Faktura',
    body: 'Når jobben er ferdig, genereres fakturaen direkte fra ordren eller timene som er ført. Prosjektlederen bruker ikke tid på manuell regning – alt er allerede registrert. Kobles mot Ordre, Timelister og Tilbudsmodul for en komplett økonomiflyt.'
  },
  timelister: {
    title: 'Timelister',
    body: 'Håndverkeren fører timer på mobilen i slutten av dagen – med prosjekt, kategori og beskrivelse. Ingen papirslipp, ingen glemt timeføring. Prosjektlederen godkjenner med ett klikk. Timene kobles mot Faktura og Lønn, og gir deg full oversikt over lønnsomheten per prosjekt.'
  },
  ansatte: {
    title: 'Ansatte',
    body: 'Samle all personalinfo på ett sted: kontaktinfo, stillingstittel, kompetanser og ansettelseshistorikk. Prosjektlederen slipper å lete i e-poster og mapper. Henger sammen med Timelister og Ressursplanlegger slik at du alltid vet hvem som er tilgjengelig og hva de kan.'
  },
  ressursplan: {
    title: 'Ressursplanlegger',
    body: 'Se hvem av dine ansatte som er ledig og hvem som allerede er booket – i en enkel kalendervisning. Prosjektlederen kan planlegge hvem som skal på hvilken jobb i god tid, og unngår dobbeltbooking. Du kan også filtrere på kompetanser, slik at du alltid sender rett person med rett fagkunnskap til riktig oppdrag. Kobles mot Ansatte, Kompetanser, Kalender og Timelister.'
  },
  kalender: {
    title: 'Kalender',
    body: 'Samle alle møter, befaringer og frister i én felles kalender for hele teamet. Håndverkere og prosjektledere ser alltid hva som skjer i morgen – uten å måtte ringe rundt. Synkroniserer med Ressursplanlegger og Befaring.'
  },
  chat: {
    title: 'Intern Chat',
    body: 'Fortfortell slippe å bruke private SMS eller WhatsApp for jobbrelaterte beskjeder. Med intern chat holdes all kommunikasjon samlet i systemet, knyttet til riktig prosjekt. Håndverkerne kan sende bilder og meldinger direkte fra byggeplassen, og prosjektlederen svarer fra kontoret.'
  },
  befaring: {
    title: 'Befaring',
    body: 'På sluttkontroll eller overtakelse registrerer prosjektlederen mangler og feil direkte i appen, tar bilder og tilordner ansvar. Kunden signerer digitalt på stedet. Ingen papirprotokoller som forsvinner. Henger sammen med Avvik og Bildedokumentasjon.'
  },
  bildedok: {
    title: 'Bildedokumentasjon',
    body: 'Håndverkeren tar bilder før, under og etter arbeid – automatisk stemplet med tid, sted og prosjekt. Det beskytter bedriften ved reklamasjoner og dokumenterer kvaliteten. Bildene organiseres per prosjekt og rom, og kobles mot Befaring og FDV.'
  },
  fdv: {
    title: 'FDV',
    body: 'Når bygget er ferdig, leverer du en komplett FDV-dokumentasjon digitalt til kunden – med utstyrslister, serviceavtaler og vedlikeholdsplaner. Det gjør deg mer profesjonell og gir kunden trygghet. Kobles mot Prosjektfiler og Bildedokumentasjon.'
  },
  grunnpakke: {
    title: 'Grunnpakke',
    body: 'Grunnpakken er kjernen i plattformen og tilfredsstiller lovpålagte krav til kontroll, oppfølging og HMS for håndverksbedrifter. Med Dashboard, Prosjekter og Prosjektfiler får du full oversikt over alle pågående oppdrag. Sjekklister og Avvik sikrer systematisk kvalitetskontroll og sporbarhet, mens HMS & Risiko-modulen dekker myndighetskravene til helse, miljø og sikkerhet – inkludert SJA, RUH og risikoanalyser. Alt du trenger for å drifte trygt og lovlig er inkludert fra dag én.'
  },
  crm: {
    title: 'CRM',
    body: 'Hold oversikt over alle kunder, leads og oppfølgingsaktiviteter. Prosjektlederen ser hvem som skal følges opp, hvilke tilbud som er sendt og hva som er avtalt. Du kan sette opp varsler for oppfølging slik at ingen kunde eller lead glemmes, og full aktivitetshistorikk gir deg alltid oversikt over hva som har blitt gjort og sagt. Ingen kunder faller mellom stolene. Henger direkte mot Tilbudsmodul og Prosjekter.'
  },
  maskiner: {
    title: 'Maskiner',
    body: 'Hold full oversikt over bedriftens maskinpark og utstyr. Registrer maskiner med type, status og plassering. Se hvem som har utstyr ute, og planlegg vedlikehold og service. Henger direkte mot Ressursplanlegger slik at du kan knytte maskiner og operatører til prosjekter og arbeidsoppgaver.'
  }
};

const availableModules = [
{ key: 'tilbud', name: 'Tilbudsmodul', description: 'Tilbudsadministrasjon', price: 29 },
{ key: 'anbudsmodul', name: 'Anbudsmodul', description: 'Anbudsforespørsler og leverandørtilbud', price: 189 },
{ key: 'ordre', name: 'Ordre', description: 'Arbeidsordre', price: 39 },
{ key: 'endringsmeldinger', name: 'Endringsmeldinger', description: 'Endringshåndtering', price: 29 },
{ key: 'faktura', name: 'Faktura', description: 'Fakturering og betalinger', price: 49 },
{ key: 'timelister', name: 'Timelister', description: 'Timeføring og rapportering', price: 39 },
{ key: 'ansatte', name: 'Ansatte', description: 'Personaladministrasjon', price: 19 },
{ key: 'ressursplan', name: 'Ressursplanlegger', description: 'Bemanning og allokering', price: 89 },
{ key: 'kalender', name: 'Kalender', description: 'Hendelser og møter', price: 12 },
{ key: 'chat', name: 'Intern Chat', description: 'Teamkommunikasjon', price: 89 },
{ key: 'befaring', name: 'Befaring', description: 'Befaringer og oppfølging', price: 49 },
{ key: 'bildedok', name: 'Bildedokumentasjon', description: 'Foto og dokumentasjon', price: 79 },
{ key: 'fdv', name: 'FDV', description: 'Forvaltning, drift og vedlikehold', price: 109 },
{ key: 'crm', name: 'CRM', description: 'Kundeadministrasjon', price: 149 },
{ key: 'maskiner', name: 'Maskiner', description: 'Maskinpark og utstyrsregister', price: 59 }];


// Map frontend module keys to Stripe module codes
const moduleKeyToCode = {
  tilbud: 'TILBUD',
  anbudsmodul: 'ANBUDSMODUL',
  ordre: 'ORDRE',
  endringsmeldinger: 'ENDRINGSMELDINGER',
  faktura: 'FAKTURA',
  timelister: 'TIMELISTER',
  ansatte: 'ANSATTE',
  ressursplan: 'RESSURS',
  kalender: 'KALENDER',
  chat: 'CHAT',
  befaring: 'BEFARING',
  bildedok: 'BILDEDOK',
  fdv: 'FDV',
  crm: 'CRM',
};

export default function MinBedrift() {
  const queryClient = useQueryClient();
  const [infoPopup, setInfoPopup] = useState(null);
  const [orderDialog, setOrderDialog] = useState(null); // module object
  const [cancelDialog, setCancelDialog] = useState(null); // module object
  const [actionLoading, setActionLoading] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  const company = companies[0];

  const { data: moduleAccessList = [] } = useQuery({
    queryKey: ['companyModuleAccess', company?.id],
    queryFn: () => base44.entities.CompanyModuleAccess.filter({ companyId: company.id }),
    enabled: !!company?.id
  });

  const { data: subscriptionItems = [] } = useQuery({
    queryKey: ['companySubscriptionItems', company?.id],
    queryFn: async () => {
      const subs = await base44.entities.CompanySubscription.filter({ companyId: company.id });
      if (!subs[0]) return [];
      return base44.entities.CompanySubscriptionItem.filter({ companySubscriptionId: subs[0].id });
    },
    enabled: !!company?.id
  });

  const isTrial = company?.subscriptionStatus === 'trial';

  const isModuleActive = (moduleKey) => {
    if (isTrial) return true;
    const code = moduleKeyToCode[moduleKey];
    if (!code) return true;
    const access = moduleAccessList.find(a => a.moduleCode === code);
    return access?.active === true;
  };

  const updateCompanyMutation = useMutation({
    mutationFn: async (data) => {
      if (company) {
        return base44.entities.Company.update(company.id, data);
      } else {
        return base44.entities.Company.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });

  const handleOrderModule = async (module) => {
    setActionLoading(true);
    try {
      const code = moduleKeyToCode[module.key];
      const res = await base44.functions.invoke('createStripeSubscription', {
        companyId: company.id,
        moduleCodes: [code],
        priceIds: {},
        customerEmail: company.email,
        customerName: company.name
      });
      if (res.data?.clientSecret) {
        // redirect or handle Stripe checkout
        window.location.href = `/stripe-checkout?clientSecret=${res.data.clientSecret}`;
      } else {
        toast.success(`${module.name} er bestilt!`);
        queryClient.invalidateQueries({ queryKey: ['companyModuleAccess', company.id] });
        queryClient.invalidateQueries({ queryKey: ['companySubscriptionItems', company.id] });
      }
    } catch (e) {
      toast.error('Bestilling feilet: ' + (e.message || 'Ukjent feil'));
    } finally {
      setActionLoading(false);
      setOrderDialog(null);
    }
  };

  const handleCancelModule = async (module) => {
    setActionLoading(true);
    try {
      const code = moduleKeyToCode[module.key];
      await base44.functions.invoke('updateStripeSubscriptionModules', {
        companyId: company.id,
        addModules: [],
        removeModuleCodes: [code]
      });
      toast.success(`${module.name} er avbestilt og tilgang er fjernet.`);
      queryClient.invalidateQueries({ queryKey: ['companyModuleAccess', company.id] });
      queryClient.invalidateQueries({ queryKey: ['companySubscriptionItems', company.id] });
    } catch (e) {
      toast.error('Avbestilling feilet: ' + (e.message || 'Ukjent feil'));
    } finally {
      setActionLoading(false);
      setCancelDialog(null);
    }
  };

  const calculateMonthlyPrice = () => {
    const addons = availableModules
      .filter((m) => isModuleActive(m.key))
      .reduce((sum, m) => sum + m.price, 0);
    return grunnpakkePrice + addons;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Min bedrift"
        subtitle="Administrer bedriftsinformasjon og moduler" />


      <div className="px-6 lg:px-8 py-6">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
              <Building2 className="h-4 w-4 mr-2" />
              Bedriftsinformasjon
            </TabsTrigger>
            <TabsTrigger value="modules" className="rounded-lg data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
              <CreditCard className="h-4 w-4 mr-2" />
              Moduler og priser
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0">
            <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Bedriftsinformasjon</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div>
                  <Label className="dark:text-slate-300">Bedriftsnavn</Label>
                  <Input
                    value={company?.name || ''}
                    placeholder="Ditt firma AS"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ name: e.target.value })} />

                </div>
                <div>
                  <Label className="dark:text-slate-300">Organisasjonsnummer</Label>
                  <Input
                    value={company?.org_number || ''}
                    placeholder="123 456 789"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ org_number: e.target.value })} />

                </div>
                <div className="md:col-span-2">
                  <Label className="dark:text-slate-300">Adresse</Label>
                  <Input
                    value={company?.address || ''}
                    placeholder="Gate 1, 0000 Sted"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ address: e.target.value })} />

                </div>
                <div>
                  <Label className="dark:text-slate-300">Telefon</Label>
                  <Input
                    value={company?.phone || ''}
                    placeholder="+47 123 45 678"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ phone: e.target.value })} />

                </div>
                <div>
                  <Label className="dark:text-slate-300">E-post</Label>
                  <Input
                    value={company?.email || ''}
                    placeholder="post@firma.no"
                    className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    onChange={(e) => updateCompanyMutation.mutate({ email: e.target.value })} />

                </div>
              </div>

              {/* Kontaktpersoner */}
              <div className="mt-8 pt-8 border-t dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Nøkkelpersoner
                </h3>
                
                {/* Daglig leder */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Daglig leder
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.ceo_name || ''}
                        placeholder="Ola Nordmann"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_name: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.ceo_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_phone: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.ceo_email || ''}
                        placeholder="daglig.leder@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ ceo_email: e.target.value })} />

                    </div>
                  </div>
                </div>

                {/* Styreformann */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Styreformann
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.chairman_name || ''}
                        placeholder="Kari Hansen"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_name: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.chairman_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_phone: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.chairman_email || ''}
                        placeholder="styreformann@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ chairman_email: e.target.value })} />

                    </div>
                  </div>
                </div>

                {/* Økonomiansvarlig */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Økonomiansvarlig
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="dark:text-slate-300">Navn</Label>
                      <Input
                        value={company?.finance_contact_name || ''}
                        placeholder="Per Jensen"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_name: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">Telefon</Label>
                      <Input
                        value={company?.finance_contact_phone || ''}
                        placeholder="+47 123 45 678"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_phone: e.target.value })} />

                    </div>
                    <div>
                      <Label className="dark:text-slate-300">E-post</Label>
                      <Input
                        value={company?.finance_contact_email || ''}
                        placeholder="okonomi@firma.no"
                        className="mt-1.5 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                        onChange={(e) => updateCompanyMutation.mutate({ finance_contact_email: e.target.value })} />

                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {company?.name &&
              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-4">Sammendrag</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {company.name &&
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Building2 className="h-4 w-4" />
                        {company.name}
                      </div>
                  }
                    {company.org_number &&
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <FileText className="h-4 w-4" />
                        Org.nr: {company.org_number}
                      </div>
                  }
                    {company.address &&
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4" />
                        {company.address}
                      </div>
                  }
                    {company.phone &&
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="h-4 w-4" />
                        {company.phone}
                      </div>
                  }
                    {company.email &&
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4" />
                        {company.email}
                      </div>
                  }
                  </div>
                </div>
              }
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="mt-0 space-y-6">
            {/* Grunnpakke */}
            <Card className="border-0 shadow-sm p-6 dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Grunnpakke</h2>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Alltid inkludert</span>
                    <button
                      onClick={() => setInfoPopup('grunnpakke')}
                      className="flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Mer info">
                      <Info className="text-emerald-600 h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Dashboard, Prosjekter, Prosjektfiler, Sjekklister, Avvik og HMS & Risiko</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{grunnpakkePrice} kr/mnd</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Dashboard', 'Prosjekter', 'Prosjektfiler', 'Sjekklister', 'Avvik', 'HMS & Risiko'].map((name) =>
                <span key={name} className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                    <Check className="h-3 w-3" /> {name}
                  </span>
                )}
              </div>
            </Card>

            {/* Tilleggsmoduler */}
            <Card className="border-0 shadow-sm p-6 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tilleggsmoduler</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Legg til moduler etter behov. Alle priser per måned, eks. mva.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total månedlig kostnad</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {calculateMonthlyPrice().toLocaleString('nb-NO')} kr
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableModules.map((module) => {
                  const active = isModuleActive(module.key);
                  return (
                    <div
                      key={module.key}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all select-none",
                        active
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-medium text-slate-900 dark:text-white">{module.name}</h3>
                            <button
                              onClick={() => setInfoPopup(module.key)}
                              className="flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Mer info">
                              <Info className="text-emerald-600 h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
                            {module.price} kr/mnd
                          </p>
                        </div>
                        {active && (
                          <span className="flex-shrink-0 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">
                            Aktiv
                          </span>
                        )}
                      </div>
                      {active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setCancelDialog(module)}
                        >
                          Avbestill
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setOrderDialog(module)}
                        >
                          Bestill modul
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Info popup */}
              {infoPopup && moduleInfo[infoPopup] &&
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setInfoPopup(null)}>
                  <div
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
                  onClick={(e) => e.stopPropagation()}>

                    <button
                    onClick={() => setInfoPopup(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">

                      <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{moduleInfo[infoPopup].title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{moduleInfo[infoPopup].body}</p>
                    <div className="mt-5 flex justify-end">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={() => setInfoPopup(null)}>
                        Lukk
                      </Button>
                    </div>
                  </div>
                </div>
              }
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OrderModuleDialog
        module={orderDialog}
        open={!!orderDialog}
        onCancel={() => setOrderDialog(null)}
        onConfirm={() => handleOrderModule(orderDialog)}
        loading={actionLoading}
      />

      <CancelModuleDialog
        module={cancelDialog}
        open={!!cancelDialog}
        onCancel={() => setCancelDialog(null)}
        onConfirm={() => handleCancelModule(cancelDialog)}
        loading={actionLoading}
      />
    </div>);

}