import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Users, Search, Mail, Phone, MapPin, Building2, Tag, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function CRM() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    org_number: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowDetailDialog(false);
      setEditMode(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowDetailDialog(false);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      org_number: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      tags: []
    });
    setTagInput('');
    setEditMode(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editMode && selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = () => {
    setFormData({
      name: selectedCustomer.name || '',
      org_number: selectedCustomer.org_number || '',
      contact_person: selectedCustomer.contact_person || '',
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
      notes: selectedCustomer.notes || '',
      tags: selectedCustomer.tags || []
    });
    setEditMode(true);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const filteredCustomers = customers.filter(c => {
    return c.name?.toLowerCase().includes(search.toLowerCase()) ||
           c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
           c.email?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="CRM"
        subtitle={`${customers.length} kunder totalt`}
        onAdd={() => {
          resetForm();
          setShowDialog(true);
        }}
        addLabel="Ny kunde"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk etter kunde..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Customers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ingen kunder"
            description="Bygg opp kunderegisteret ditt"
            actionLabel="Ny kunde"
            onAction={() => {
              resetForm();
              setShowDialog(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="p-6 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedCustomer(customer);
                  setShowDetailDialog(true);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{customer.name}</h3>
                    {customer.contact_person && (
                      <p className="text-sm text-slate-500 mt-1">{customer.contact_person}</p>
                    )}
                    <div className="mt-3 space-y-1.5">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                    {customer.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                            +{customer.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ny kunde</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Firmanavn *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Navn på firma eller person"
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Org.nummer</Label>
                <Input
                  value={formData.org_number}
                  onChange={(e) => setFormData({...formData, org_number: e.target.value})}
                  placeholder="123 456 789"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Kontaktperson</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  placeholder="Navn"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="kunde@firma.no"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+47 123 45 678"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Gate, postnummer, sted"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Trykk Enter for å legge til"
                className="mt-1.5 rounded-xl"
              />
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="bg-emerald-100 text-emerald-700 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Notater</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Tilleggsinformasjon..."
                rows={2}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending ? 'Lagrer...' : 'Opprett kunde'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        setShowDetailDialog(open);
        if (!open) {
          setEditMode(false);
          setSelectedCustomer(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Rediger kunde' : selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            editMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Same form fields as create */}
                <div>
                  <Label>Firmanavn *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Org.nummer</Label>
                    <Input
                      value={formData.org_number}
                      onChange={(e) => setFormData({...formData, org_number: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Kontaktperson</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>E-post</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Notater</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="rounded-xl">
                    Avbryt
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    {updateMutation.isPending ? 'Lagrer...' : 'Lagre endringer'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {selectedCustomer.contact_person && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{selectedCustomer.contact_person}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${selectedCustomer.email}`} className="text-emerald-600 hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${selectedCustomer.phone}`} className="text-emerald-600 hover:underline">
                        {selectedCustomer.phone}
                      </a>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.org_number && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>Org.nr: {selectedCustomer.org_number}</span>
                    </div>
                  )}
                </div>

                {selectedCustomer.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedCustomer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-emerald-100 text-emerald-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedCustomer.notes && (
                  <div>
                    <Label className="text-slate-500">Notater</Label>
                    <p className="mt-1 text-slate-600">{selectedCustomer.notes}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedCustomer.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Slett
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}