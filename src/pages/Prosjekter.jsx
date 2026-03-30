import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks'
import { PageHeader, EmptyState, StatusBadge, Modal, Input, Select, Textarea, Button, Card, Spinner } from '@/components/shared'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Building2, Search, MapPin, Calendar, Users,
  LayoutGrid, List, Plus, Trash2, ChevronRight
} from 'lucide-react'

const statusOptions = [
  { value: 'planlagt', label: 'Planlagt' },
  { value: 'aktiv',    label: 'Aktiv' },
  { value: 'pause',    label: 'På pause' },
  { value: 'fullfort', label: 'Fullført' },
  { value: 'avbrutt',  label: 'Avbrutt' },
]

const emptyForm = {
  name: '',
  project_number: '',
  description: '',
  client_name: '',
  client_contact: '',
  client_email: '',
  client_phone: '',
  address_street: '',
  address_postal: '',
  address_city: '',
  start_date: '',
  end_date: '',
  status: 'planlagt',
  budget: '',
}

export default function Prosjekter() {
  const { profile } = useAuth()
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()

  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [formData, setFormData] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState(null)

  const filtered = projects.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.project_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const num = `P-${Date.now().toString().slice(-5)}`
    await createProject.mutateAsync({
      ...formData,
      address: [formData.address_street, `${formData.address_postal} ${formData.address_city}`.trim()].filter(Boolean).join(', '),
      project_number: formData.project_number || num,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      created_by: profile?.id,
    })
    setShowDialog(false)
    setFormData(emptyForm)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteProject.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Prosjekter"
        subtitle={`${projects.length} prosjekter totalt`}
        onAdd={() => setShowDialog(true)}
        addLabel="Nytt prosjekt"
      />

      <div className="px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Søk etter prosjekt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Alle statuser</option>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Ingen prosjekter"
            description={search ? 'Ingen prosjekter matcher søket ditt' : 'Kom i gang ved å opprette ditt første prosjekt'}
            actionLabel="Nytt prosjekt"
            onAction={() => setShowDialog(true)}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div key={project.id} className="relative group">
                <Link to={`/prosjekter/${project.id}`}>
                  <Card className="p-6 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Building2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                      {project.name}
                    </h3>
                    {project.project_number && (
                      <p className="text-xs text-slate-400 mb-3">#{project.project_number}</p>
                    )}
                    <div className="space-y-1.5 text-sm text-slate-500">
                      {project.client_name && (
                        <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{project.client_name}</div>
                      )}
                      {project.address && (
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{project.address}</div>
                      )}
                      {project.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(project.start_date), 'd. MMM yyyy', { locale: nb })}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
                {profile?.role === 'admin' && (
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteId(project.id) }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(project => (
              <Link key={project.id} to={`/prosjekter/${project.id}`}>
                <Card className="px-4 py-3 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                          {project.name}
                        </span>
                        {project.project_number && (
                          <span className="text-xs text-slate-400">#{project.project_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                        {project.client_name && <span>{project.client_name}</span>}
                        {project.address && <span>{project.address}</span>}
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Modal open={showDialog} onClose={() => setShowDialog(false)} title="Nytt prosjekt" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Prosjektnavn *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Skriv inn prosjektnavn" required />
            </div>
            <div>
              <Input label="Prosjektnummer" value={formData.project_number} onChange={(e) => setFormData({...formData, project_number: e.target.value})} placeholder="Tildeles automatisk" />
            </div>
            <div>
              <Select label="Status" value={formData.status} onChange={(v) => setFormData({...formData, status: v})} options={statusOptions} />
            </div>
            <div className="col-span-2">
              <Input label="Gateadresse" value={formData.address_street} onChange={(e) => setFormData({...formData, address_street: e.target.value})} placeholder="Gatenavn og nummer" />
            </div>
            <div>
              <Input label="Postnummer" value={formData.address_postal} onChange={(e) => setFormData({...formData, address_postal: e.target.value})} placeholder="0000" />
            </div>
            <div>
              <Input label="Poststed" value={formData.address_city} onChange={(e) => setFormData({...formData, address_city: e.target.value})} placeholder="By" />
            </div>
            <div>
              <Input label="Startdato" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div>
              <Input label="Sluttdato" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Input label="Budsjett (NOK)" type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} placeholder="0" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-medium text-slate-900 mb-3">Kunde</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Kundenavn" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} placeholder="Navn på kunde" />
              </div>
              <div>
                <Input label="Kontaktperson" value={formData.client_contact} onChange={(e) => setFormData({...formData, client_contact: e.target.value})} placeholder="Navn" />
              </div>
              <div>
                <Input label="Telefon" value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} placeholder="+47 000 00 000" />
              </div>
              <div className="col-span-2">
                <Input label="E-post" type="email" value={formData.client_email} onChange={(e) => setFormData({...formData, client_email: e.target.value})} placeholder="kunde@eksempel.no" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <Textarea label="Beskrivelse" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Beskrivelse av prosjektet..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Oppretter...' : 'Opprett prosjekt'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Slett prosjekt" size="sm">
        <div className="p-6">
          <p className="text-slate-600 mb-6">Er du sikker på at du vil slette dette prosjektet? Dette kan ikke angres.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Avbryt</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Sletter...' : 'Slett prosjekt'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
