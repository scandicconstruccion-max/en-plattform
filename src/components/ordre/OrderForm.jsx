import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Send, X } from 'lucide-react';

export default function OrderForm({ open, onOpenChange, onSubmit, onSubmitAndSend }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    project_id: '',
    our_reference: '',
    description: '',
    due_date: '',
    items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0, total: 0 }]
  });
  const [additionalEmails, setAdditionalEmails] = useState([]);
  const [customEmail, setCustomEmail] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    setFormData({...formData, items: newItems});
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit: 'stk', unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({...formData, items: newItems});
  };

  const handleSubmit = (e, andSend = false) => {
    e.preventDefault();
    const totalAmount = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const vatAmount = totalAmount * 0.25;
    
    const data = {
      ...formData,
      order_number: `ORD-${Date.now()}`,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      source_type: 'manual',
      approval_token: crypto.randomUUID()
    };

    if (andSend && onSubmitAndSend) {
      onSubmitAndSend(data);
    } else {
      onSubmit(data);
    }
  };

  const selectCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Ny ordre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Velg kunde (valgfritt)</Label>
              <Select onValueChange={selectCustomer}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Velg eksisterende kunde" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kundenavn *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>E-post</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <Label>Prosjekt</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData({...formData, project_id: v})}>
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Velg prosjekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Our Reference */}
          <div>
            <Label>Vår referanse</Label>
            <Select value={formData.our_reference} onValueChange={(v) => setFormData({...formData, our_reference: v})}>
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Velg ansatt" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.email}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>Beskrivelse</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Poster</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="rounded-lg gap-1">
                <Plus className="h-4 w-4" /> Legg til post
              </Button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Beskrivelse"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="rounded-xl flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Ant."
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="rounded-xl w-20"
                  />
                  <Input
                    placeholder="Enhet"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    className="rounded-xl w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Pris"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="rounded-xl w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label>Forfallsdato</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex justify-between text-sm mb-1">
              <span>Subtotal:</span>
              <span>kr {formData.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>MVA (25%):</span>
              <span>kr {(formData.items.reduce((sum, item) => sum + (item.total || 0), 0) * 0.25).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>kr {(formData.items.reduce((sum, item) => sum + (item.total || 0), 0) * 1.25).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 flex-wrap">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Avbryt
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              Opprett ordre
            </Button>
            {onSubmitAndSend && (
              <Button
                type="button"
                disabled={!formData.customer_email}
                onClick={(e) => handleSubmit(e, true)}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2"
              >
                <Send className="h-4 w-4" />
                Opprett og send
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}