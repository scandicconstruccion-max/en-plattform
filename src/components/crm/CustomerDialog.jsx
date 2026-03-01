import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Mail, Phone, MapPin, Building2 } from 'lucide-react';

export default function CustomerDialog({ open, onOpenChange, customer, onCustomerChange }) {
  const [editMode, setEditMode] = useState(!customer);
  const [formData, setFormData] = useState({
    name: '',
    org_number: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        org_number: customer.org_number || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        website: customer.website || '',
        notes: customer.notes || '',
        tags: customer.tags || []
      });
      setEditMode(false);
    } else {
      resetForm();
    }
  }, [customer, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      setEditMode(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
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
      website: '',
      notes: '',
      tags: []
    });
    setTagInput('');
    setEditMode(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (customer) {
      updateMutation.mutate({ id: customer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {!customer ? 'Ny kunde' : editMode ? 'Rediger kunde' : customer.name}
          </DialogTitle>
        </DialogHeader>

        {customer && !editMode ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {customer.contact_person && (
                <div className="flex items-center gap-3">
                  <span className="font-medium">{customer.contact_person}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${customer.email}`} className="text-emerald-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${customer.phone}`} className="text-emerald-600 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-3">
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    {customer.website}
                  </a>
                </div>
              )}
              {customer.org_number && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>Org.nr: {customer.org_number}</span>
                </div>
              )}
            </div>

            {customer.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {customer.notes && (
              <div>
                <Label className="text-slate-500">Notater</Label>
                <p className="mt-1 text-slate-600">{customer.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate(customer.id)}
                disabled={deleteMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Slett
              </Button>
              <Button
                size="sm"
                onClick={() => setEditMode(true)}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                <Edit className="h-4 w-4 mr-2" />
                Rediger
              </Button>
            </div>
          </div>
        ) : (
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
              <Label>Hjemmeside</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://www.eksempel.no"
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
                      className="cursor-pointer"
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (customer) {
                    setEditMode(false);
                  } else {
                    onOpenChange(false);
                  }
                }} 
                className="rounded-xl"
              >
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Lagrer...' : customer ? 'Lagre endringer' : 'Opprett kunde'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}