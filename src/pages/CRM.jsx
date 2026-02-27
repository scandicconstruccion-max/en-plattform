import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CustomerDialog from '@/components/crm/CustomerDialog';
import QuoteFollowUpDialog from '@/components/crm/QuoteFollowUpDialog';
import QuoteFollowUpDetail from '@/components/crm/QuoteFollowUpDetail';
import FetchQuoteDialog from '@/components/crm/FetchQuoteDialog';
import UploadQuoteDialog from '@/components/crm/UploadQuoteDialog';
import { 
  Users, 
  Search, 
  FileText, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function CRM() {
  const [activeTab, setActiveTab] = useState('quotes');
  const [search, setSearch] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showFetchQuoteDialog, setShowFetchQuoteDialog] = useState(false);
  const [showUploadQuoteDialog, setShowUploadQuoteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [customerView, setCustomerView] = useState('grid');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quoteFollowUps'],
    queryFn: () => base44.entities.QuoteFollowUp.list('-next_followup_date'),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['followUpActivities'],
    queryFn: () => base44.entities.FollowUpActivity.list('-activity_date'),
  });

  const { data: existingQuotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const getFollowUpIndicator = (quote) => {
    if (quote.phase === 'godkjent' || quote.phase === 'avslatt') {
      return null;
    }
    if (!quote.next_followup_date) {
      return { color: 'bg-gray-400', text: 'Ikke planlagt' };
    }
    const followUpDate = parseISO(quote.next_followup_date);
    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (isBefore(followUpDate, today)) {
      return { color: 'bg-red-500', text: 'Forfalt', urgent: true };
    } else if (isBefore(followUpDate, tomorrow)) {
      return { color: 'bg-amber-500', text: 'I dag', urgent: true };
    } else if (isBefore(followUpDate, addDays(today, 3))) {
      return { color: 'bg-yellow-500', text: 'Denne uken' };
    } else {
      return { color: 'bg-green-500', text: 'Planlagt' };
    }
  };

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'godkjent': return <CheckCircle2 className="h-4 w-4" />;
      case 'avslatt': return <XCircle className="h-4 w-4" />;
      case 'under_vurdering': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'godkjent': return 'bg-green-100 text-green-700';
      case 'avslatt': return 'bg-red-100 text-red-700';
      case 'under_vurdering': return 'bg-blue-100 text-blue-700';
      case 'sendt': return 'bg-amber-100 text-amber-700';
      case 'utarbeidet': return 'bg-slate-100 text-slate-700';
      case 'utlopt': return 'bg-gray-100 text-gray-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      utarbeidet: 'Utarbeidet',
      sendt: 'Sendt',
      under_vurdering: 'Under vurdering',
      godkjent: 'Godkjent',
      avslatt: 'Avslått',
      utlopt: 'Utløpt'
    };
    return labels[phase] || phase;
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
                         q.quote_reference?.toLowerCase().includes(search.toLowerCase());
    const matchesPhase = phaseFilter === 'all' || q.phase === phaseFilter;
    return matchesSearch && matchesPhase;
  });

  const filteredCustomers = customers.filter(c => {
    return c.name?.toLowerCase().includes(search.toLowerCase()) ||
           c.contact_person?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: quotes.length,
    active: quotes.filter(q => !['godkjent', 'avslatt', 'utlopt'].includes(q.phase)).length,
    won: quotes.filter(q => q.phase === 'godkjent').length,
    overdue: quotes.filter(q => {
      if (!q.next_followup_date || ['godkjent', 'avslatt'].includes(q.phase)) return false;
      return isBefore(parseISO(q.next_followup_date), new Date());
    }).length
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="CRM & Tilbudsoppfølging"
        subtitle={`${stats.total} tilbud totalt • ${stats.active} aktive • ${stats.won} vunnet`}
      />

      {/* Stats */}
      <div className="px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Totalt tilbud</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-sm text-slate-500">Aktive tilbud</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.won}</p>
                <p className="text-sm text-slate-500">Vunnet</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.overdue}</p>
                <p className="text-sm text-slate-500">Forfalt oppfølging</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="quotes">Tilbudsoppfølging</TabsTrigger>
              <TabsTrigger value="customers">Kunder</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-3">
              {activeTab === 'quotes' && (
                <>
                  <Button 
                    onClick={() => setShowFetchQuoteDialog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Hent tilbud
                  </Button>
                  <Button 
                    onClick={() => setShowUploadQuoteDialog(true)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Last opp tilbud
                  </Button>
                </>
              )}
              {activeTab === 'customers' && (
                <div className="flex items-center gap-2">
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCustomerView('grid')}
                      className={`p-2 transition-colors ${customerView === 'grid' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                      title="Rubrikker"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCustomerView('list')}
                      className={`p-2 transition-colors ${customerView === 'list' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                      title="Linjer"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  <Button 
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerDialog(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Ny kunde
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={activeTab === 'quotes' ? 'Søk etter tilbud...' : 'Søk etter kunde...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-slate-200"
              />
            </div>
            {activeTab === 'quotes' && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={phaseFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhaseFilter('all')}
                  className="rounded-xl"
                >
                  Alle
                </Button>
                <Button
                  variant={phaseFilter === 'sendt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhaseFilter('sendt')}
                  className="rounded-xl"
                >
                  Sendt
                </Button>
                <Button
                  variant={phaseFilter === 'under_vurdering' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhaseFilter('under_vurdering')}
                  className="rounded-xl"
                >
                  Under vurdering
                </Button>
                <Button
                  variant={phaseFilter === 'godkjent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhaseFilter('godkjent')}
                  className="rounded-xl"
                >
                  Godkjent
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="quotes" className="mt-0">
            {filteredQuotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Ingen tilbud"
                description="Start med å registrere ditt første tilbud"
                actionLabel="Nytt tilbud"
                onAction={() => setShowQuoteDialog(true)}
              />
            ) : (
              <div className="space-y-3">
                {filteredQuotes.map((quote) => {
                  const indicator = getFollowUpIndicator(quote);
                  return (
                    <Card
                      key={quote.id}
                      className="p-5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedQuote(quote)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900 truncate">
                                  {quote.customer_name}
                                </h3>
                                <Badge className={`${getPhaseColor(quote.phase)} flex items-center gap-1`}>
                                  {getPhaseIcon(quote.phase)}
                                  {getPhaseLabel(quote.phase)}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500 mb-2">
                                Ref: {quote.quote_reference} • {quote.quote_amount?.toLocaleString('nb-NO')} kr
                              </p>
                              {quote.description && (
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                  {quote.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Sendt: {format(parseISO(quote.sent_date), 'dd.MM.yyyy', { locale: nb })}</span>
                                <span>•</span>
                                <span>Ansvarlig: {quote.responsible_name || quote.responsible_user}</span>
                              </div>
                            </div>
                            {indicator && (
                              <div className="flex flex-col items-end gap-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${indicator.color} flex items-center gap-1.5`}>
                                  <Clock className="h-3 w-3" />
                                  {indicator.text}
                                </div>
                                {quote.next_followup_date && (
                                  <span className="text-xs text-slate-500">
                                    {format(parseISO(quote.next_followup_date), 'dd.MM.yyyy', { locale: nb })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers" className="mt-0">
            {filteredCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Ingen kunder"
                description="Bygg opp kunderegisteret ditt"
                actionLabel="Ny kunde"
                onAction={() => {
                  setSelectedCustomer(null);
                  setShowCustomerDialog(true);
                }}
              />
            ) : customerView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="p-5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDialog(true);
                    }}
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">{customer.name}</h3>
                    {customer.contact_person && (
                      <p className="text-sm text-slate-500 mb-2">{customer.contact_person}</p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-slate-600">{customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="text-sm text-slate-600">{customer.phone}</p>
                    )}
                    {customer.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="px-5 py-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDialog(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-700 text-sm font-semibold">
                          {customer.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                        <span className="font-semibold text-slate-900 truncate">{customer.name}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.contact_person || '—'}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.email || '—'}</span>
                        <span className="text-sm text-slate-500 truncate">{customer.phone || '—'}</span>
                      </div>
                      {customer.tags?.length > 0 && (
                        <div className="hidden md:flex gap-1">
                          {customer.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CustomerDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        customer={selectedCustomer}
        onCustomerChange={setSelectedCustomer}
      />

      <QuoteFollowUpDialog
        open={showQuoteDialog}
        onOpenChange={setShowQuoteDialog}
        customers={customers}
      />

      <FetchQuoteDialog
        open={showFetchQuoteDialog}
        onOpenChange={setShowFetchQuoteDialog}
        existingQuotes={existingQuotes}
        customers={customers}
      />

      <UploadQuoteDialog
        open={showUploadQuoteDialog}
        onOpenChange={setShowUploadQuoteDialog}
        customers={customers}
      />

      {selectedQuote && (
        <QuoteFollowUpDetail
          open={!!selectedQuote}
          onOpenChange={(open) => !open && setSelectedQuote(null)}
          quote={selectedQuote}
          activities={activities.filter(a => a.quote_followup_id === selectedQuote.id)}
        />
      )}
    </div>
  );
}