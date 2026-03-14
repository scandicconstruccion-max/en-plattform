import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';

export default function CreateGroupDialog({ open, onOpenChange, projects, allUsers, employees, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: '',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleClose = () => {
    setFormData({ name: '', description: '', project_id: '' });
    setSelectedMembers([]);
    onOpenChange(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const project = projects.find(p => p.id === formData.project_id);
    onSubmit({
      ...formData,
      project_name: project?.name || '',
      members: selectedMembers,
    });
    handleClose();
  };

  const toggleMember = (email) => {
    setSelectedMembers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // Merge users and employees into one list (deduplicated by email)
  const memberOptions = [];
  const seen = new Set();

  allUsers.forEach(u => {
    if (u.email && !seen.has(u.email)) {
      seen.add(u.email);
      memberOptions.push({ email: u.email, name: u.full_name, role: u.role });
    }
  });

  employees.forEach(e => {
    if (e.email && !seen.has(e.email)) {
      seen.add(e.email);
      memberOptions.push({ email: e.email, name: `${e.first_name} ${e.last_name}`, role: e.position || 'Ansatt' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Opprett chatgruppe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Prosjekt *</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Velg prosjekt..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Gruppenavn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="F.eks. Tømrerlag, Prosjektledelse..."
              required
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label>Beskrivelse</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Valgfri beskrivelse av gruppen..."
              rows={2}
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Legg til medlemmer ({selectedMembers.length} valgt)
            </Label>
            <ScrollArea className="h-48 border rounded-xl p-3 bg-slate-50">
              <div className="space-y-2">
                {memberOptions.map(member => (
                  <div key={member.email} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedMembers.includes(member.email)}
                      onCheckedChange={() => toggleMember(member.email)}
                    />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {member.name ? member.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      className="text-sm cursor-pointer flex-1"
                      onClick={() => toggleMember(member.email)}
                    >
                      <span className="font-medium">{member.name || member.email}</span>
                      <span className="text-slate-500 text-xs ml-2">{member.role}</span>
                    </label>
                  </div>
                ))}
                {memberOptions.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Ingen brukere tilgjengelig</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.project_id}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opprett gruppe
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}