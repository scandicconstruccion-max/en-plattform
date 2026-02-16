import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSelector from '@/components/shared/ProjectSelector';
import { ShoppingCart, Search, Plus, Trash2, Truck, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Bestillinger() {
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    order_number: '',
    project_id: '',
    supplier: '',
    items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0 }],
    delivery_date: '',
    delivery_address: ''
  });

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const resetForm = () => {
    setFormData({
      order_number: `B-${Date.now().toString().slice(-6)}`,
      project_id: '',
      supplier: '',
      items: [{ description: '', quantity: 1, unit: 'stk', unit_price: 0 }],
      delivery_date: '',
      delivery_address: ''
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit: 'stk', unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = calculateTotal(formData.items);
    createMutation.mutate({
      ...formData,
      total_amount: total,
      status: 'utkast'
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Ukjent prosjekt';
  };

  const filteredOrders = orders.filter(o => {
    return o.supplier?.toLowerCase().includes(search.toLowerCase()) ||
           o.order_number?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Bestillinger"
        subtitle={`${orders.length} bestillinger totalt`}
        onAdd={() => {
          resetForm();
          setShowDialog(true);
        }}
        addLabel="Ny bestilling"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk etter bestillinger..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Ingen bestillinger"
            description="Opprett bestillinger til leverandører"
            actionLabel="Ny bestilling"
            onAction={() => {
              resetForm();
              setShowDialog(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      order.status === 'levert' ? 'bg-emerald-100' :
                      order.status === 'bestilt' ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      {order.status === 'levert' ? (
                        <Truck className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <ShoppingCart className={`h-6 w-6 ${
                          order.status === 'bestilt' ? 'text-blue-600' : 'text-slate-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">#{order.order_number}</h3>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-slate-600 mt-1">{order.supplier}</p>
                      <p className="text-sm text-slate-500 mt-1">{getProjectName(order.project_id)}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {order.created_date && format(new Date(order.created_date), 'd. MMM yyyy', { locale: nb })}
                        </span>
                        {order.delivery_date && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            Levering: {format(new Date(order.delivery_date), 'd. MMM', { locale: nb })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      {(order.total_amount || 0).toLocaleString('nb-NO')} kr
                    </p>
                    <p className="text-sm text-slate-500">{order.items?.length || 0} varer</p>
                  </div>
                </div>
                
                {/* Status Actions */}
                {order.status === 'utkast' && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: order.id, data: { status: 'bestilt' } })}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      Send bestilling
                    </Button>
                  </div>
                )}
                {order.status === 'bestilt' && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: order.id, data: { status: 'kansellert' } })}
                      className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Kanseller
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: order.id, data: { status: 'levert' } })}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      Merk som levert
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ny bestilling</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bestillingsnummer</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Prosjekt *</Label>
                <ProjectSelector
                  value={formData.project_id}
                  onChange={(v) => setFormData({...formData, project_id: v})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label>Leverandør *</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="Leverandørnavn"
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Leveringsdato</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Leveringsadresse</Label>
                <Input
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                  placeholder="Adresse"
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Varer</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-1" />
                  Legg til vare
                </Button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[40%]">Beskrivelse</TableHead>
                      <TableHead className="w-[15%]">Antall</TableHead>
                      <TableHead className="w-[15%]">Enhet</TableHead>
                      <TableHead className="w-[15%]">Pris</TableHead>
                      <TableHead className="w-[15%] text-right">Sum</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Varenavn"
                            className="border-0 p-0 h-8 focus-visible:ring-0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(item.quantity * item.unit_price).toLocaleString('nb-NO')}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={formData.items.length === 1}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="flex gap-8">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{calculateTotal(formData.items).toLocaleString('nb-NO')} kr</span>
                </div>
              </div>
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
                {createMutation.isPending ? 'Lagrer...' : 'Opprett bestilling'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}