import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CustomerDialog from '@/components/crm/CustomerDialog';
import QuoteFollowUpDetail from '@/components/crm/QuoteFollowUpDetail';
import FetchQuoteDialog from '@/components/crm/FetchQuoteDialog';
import UploadQuoteDialog from '@/components/crm/UploadQuoteDialog';
import ActionCards from '@/components/crm/ActionCards';
import QuoteWorkList from '@/components/crm/QuoteWorkList';
import {
  Users, Search, FileText, LayoutGrid, List, Archive, X, ArrowDownAZ, Hash
} from 'lucide-react';
import { isBefore, isToday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function CRM() {
  const [activeTab, setActiveTab] = useState('quotes');
  const [search, setSearch] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showFetchQuoteDialog, setShowFetchQuoteDialog] = useState(false);
  const [showUploadQuoteDialog, setShowUploadQuoteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [customerView, setCustomerView] = useState('grid');
  const [customerSort, setCustomerSort] = useState('alpha'); // 'alpha' | 'number'
  const [actionFilter, setActionFilter] = useState(null); // 'overdue' | 'today' | 'missing' | null
  const [showArchive, setShowArchive] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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

  // Filter quotes based on action card and search
  const getFilteredQuotes = () => {
    let result = quotes;

    if (search) {
      result = result.filter(q =>
        q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.quote_reference?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (actionFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (actionFilter === 'overdue') {
        result = result.filter(q => {
          if (!q.next_followup_date || ['godkjent', 'avslatt'].includes(q.phase)) return false;
          const d = parseISO(q.next_followup_date);
          d.setHours(0, 0, 0, 0);
          return isBefore(d, today);
        });
      } else if (actionFilter === 'today') {
        result = result.filter(q => {
          if (!q.next_followup_date || ['godkjent', 'avslatt'].includes(q.phase)) return false;
          return isToday(parseISO(q.next_followup_date));
        });
      } else if (actionFilter === 'missing') {
        result = result.filter(q => q.phase === 'sendt' && !q.next_followup_date);
      }
    }

    return result;
  };

  const filteredQuotes = getFilteredQuotes();

  const filteredCustomers = customers
    .filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_person?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (customerSort === 'number') {
        const na = parseInt(a.org_number || '999999999');
        const nb2 = parseInt(b.org_number || '999999999');
        return na - nb2;
      }
      return (a.name || '').localeCompare(b.name || '', 'nb');
    });

  const handleActionFilter = (filter) => {
    setActionFilter(filter);
    setShowArchive(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="CRM & Tilbudsoppfølging"
        subtitle="Operativ oppfølging av utsendte tilbud"
      />

      <div className="px-6 lg:px-8 py-6">
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
                    variant={showArchive ? 'default' : 'outline'}
                    className="rounded-xl"
                    onClick={() => { setShowArchive(!showArchive); setActionFilter(null); }}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {showArchive ? 'Skjul arkiv' : 'Vis arkiv'}
                  </Button>
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
                <Button
                  onClick={() => { setSelectedCustomer(null); setShowCustomerDialog(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Ny kunde
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="quotes" className="mt-0">
            {/* Action cards - only in active view */}
            {!showArchive && (
              <ActionCards
                quotes={quotes}
                activeFilter={actionFilter}
                onFilterChange={handleActionFilter}
              />
            )}

            {/* Active filter badge */}
            {actionFilter && (
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="text-xs px-3 py-1">
                  Filtrert: {actionFilter === 'overdue' ? 'Forfalt' : actionFilter === 'today' ? 'I dag' : 'Mangler oppfølging'}
                </Badge>
                <button onClick={() => setActionFilter(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Archive label */}
            {showArchive && (
              <div className="flex items-center gap-2 mb-4">
                <Archive className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Arkiv – Vunnede og tapte tilbud</span>
              </div>
            )}

            {/* Search */}
            <div className="relative max-w-md mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Søk etter kunde eller referanse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-slate-200"
              />
            </div>

            <QuoteWorkList
              quotes={filteredQuotes}
              onOpen={setSelectedQuote}
              showArchive={showArchive}
              currentUser={user}
            />
          </TabsContent>

          <TabsContent value="customers" className="mt-0">
            <div className="flex gap-4 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Søk etter kunde..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCustomerSort('alpha')}
                  title="Sorter alfabetisk"
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerSort === 'alpha' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <ArrowDownAZ className="h-4 w-4" /> A–Å
                </button>
                <button
                  onClick={() => setCustomerSort('number')}
                  title="Sorter etter kundenummer"
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerSort === 'number' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <Hash className="h-4 w-4" /> Nr.
                </button>
              </div>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCustomerView('grid')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerView === 'grid' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="h-4 w-4" /> Rubrikker
                </button>
                <button
                  onClick={() => setCustomerView('list')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${customerView === 'list' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="h-4 w-4" /> Linjer
                </button>
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Ingen kunder"
                description="Bygg opp kunderegisteret ditt"
                actionLabel="Ny kunde"
                onAction={() => { setSelectedCustomer(null); setShowCustomerDialog(true); }}
              />
            ) : customerView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="p-5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                      {customer.customer_number && <span className="text-xs text-slate-400 font-mono">#{customer.customer_number}</span>}
                    </div>
                    {customer.contact_person && <p className="text-sm text-slate-500 mb-2">{customer.contact_person}</p>}
                    {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
                    {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}

                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="px-5 py-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}
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