import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useProject, useUpdateProject, useDeleteProject, useDeviations, useChecklists } from '@/lib/hooks'
import { StatusBadge, Modal, Input, Select, Textarea, Button, Card, Spinner } from '@/components/shared'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Building2, MapPin, Calendar, Users, Clock, AlertTriangle,
  FileText, CheckSquare, Edit, Mail, Phone, ArrowLeft,
  Trash2, TrendingUp
} from 'lucide-react'

const statusOptions = [
  { value: 'planlagt', label: 'Planlagt' },
  { value: 'aktiv',    label: 'Aktiv' },
  { value: 'pause',    label: 'På pause' },
  { value: 'fullfort', label: 'Fullført' },
  { value: 'avbrutt',  label: 'Avbrutt' },
]

export default function ProsjektDetaljer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: project, isLoading } = useProject(id)
  const { data: deviations = [] } = useDeviations(id)
  const { data: checklists = [] } = useChecklists(id)
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [formData, setFormData] = useState(null)

  const openEdit = () => {
    setFormData({
      name: project.name || '',
      status: project.status || 'planlagt',
      description: project.description || '',
      client_name: project.client_name || '',
      client_contact: project.client_contact || '',
      client_email: project.client_email || '',
      client_phone: project.client_phone || '',
      address: project.address || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget || '',
    })
    setShowEdit(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    await updateProject.mutateAsync({ id, ...formData, budget: formData.budget ? parseFloat(formData.budget) : null })
    setShowEdit(false)
  }

  const handleDelete = async () => {
    await deleteProject.mutateAsync(id)
    navigate('/prosjekter')
  }

  if (isLoading) return <Spinner />
  if (!project) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Prosjekt ikke funnet</h2>
        <Link to="/prosjekter" className="text-emerald-600 hover:underline">← Tilbake til prosjekter</Link>
      </div>
    </div>
  )

  const openDeviations = deviations.filter(d => d.status !== 'lukket').length
  const completedChecklists = checklists.filter(c => c.status === 'fullfort').length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/prosjekter')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-slate-400 text-sm">Prosjekter</span>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  <StatusBadge status={project.status} />
                </div>
                {project.project_number && (
                  <p className="text-slate-500 text-sm">Prosjektnr: #{project.project_number}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openEdit}>
                <Edit className="h-4 w-4" /> Rediger
              </Button>
              <Button variant="outline" onClick={() => setShowDelete(true)} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Åpne avvik', value: openDeviations, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', link: '/avvik' },
            { label: 'Sjekklister', value: `${completedChecklists}/${checklists.length}`, icon: CheckSquare, color: 'text-teal-600', bg: 'bg-teal-50', link: '/sjekklister' },
            { label: 'Budsjett', value: project.budget ? `${Number(project.budget).toLocaleString('nb-NO')} kr` : '–', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Sluttdato', value: project.end_date ? format(new Date(project.end_date), 'd. MMM yyyy', { locale: nb }) : '–', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((stat, i) => (
            <Card key={i} className="p-5">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Info */}
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Prosjektinformasjon</h2>
            <div className="space-y-3 text-sm">
              {project.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{project.address}</span>
                </div>
              )}
              {project.start_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">
                    {format(new Date(project.start_date), 'd. MMM yyyy', { locale: nb })}
                    {project.end_date && ` – ${format(new Date(project.end_date), 'd. MMM yyyy', { locale: nb })}`}
                  </span>
                </div>
              )}
              {project.description && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-slate-600">{project.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Kundeinformasjon</h2>
            {project.client_name ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{project.client_name}</span>
                </div>
                {project.client_contact && (
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{project.client_contact}</span>
                  </div>
                )}
                {project.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${project.client_email}`} className="text-emerald-600 hover:underline">{project.client_email}</a>
                  </div>
                )}
                {project.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${project.client_phone}`} className="text-emerald-600 hover:underline">{project.client_phone}</a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Ingen kundeinformasjon registrert</p>
            )}
          </Card>

          {/* Recent Deviations */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Siste avvik</h2>
              <Link to="/avvik" className="text-sm text-emerald-600 hover:underline">Se alle</Link>
            </div>
            {deviations.length === 0 ? (
              <p className="text-slate-400 text-sm">Ingen avvik registrert</p>
            ) : (
              <div className="space-y-2">
                {deviations.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700 truncate">{d.title}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Checklists */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Sjekklister</h2>
              <Link to="/sjekklister" className="text-sm text-emerald-600 hover:underline">Se alle</Link>
            </div>
            {checklists.length === 0 ? (
              <p className="text-slate-400 text-sm">Ingen sjekklister opprettet</p>
            ) : (
              <div className="space-y-2">
                {checklists.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700 truncate">{c.title}</span>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {formData && (
        <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Rediger prosjekt" size="lg">
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Prosjektnavn *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <Select label="Status" value={formData.status} onChange={(v) => setFormData({...formData, status: v})} options={statusOptions} />
              </div>
              <div>
                <Input label="Budsjett (NOK)" type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Input label="Adresse" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <Input label="Startdato" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div>
                <Input label="Sluttdato" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Input label="Kundenavn" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
              </div>
              <div>
                <Input label="Kontaktperson" value={formData.client_contact} onChange={(e) => setFormData({...formData, client_contact: e.target.value})} />
              </div>
              <div>
                <Input label="Kundetelefon" value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Input label="Kunde e-post" type="email" value={formData.client_email} onChange={(e) => setFormData({...formData, client_email: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Textarea label="Beskrivelse" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Avbryt</Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? 'Lagrer...' : 'Lagre endringer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Slett prosjekt" size="sm">
        <div className="p-6">
          <p className="text-slate-600 mb-6">Er du sikker på at du vil slette <strong>{project.name}</strong>? Dette kan ikke angres.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Avbryt</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Sletter...' : 'Slett prosjekt'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
