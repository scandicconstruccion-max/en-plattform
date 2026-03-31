import React, { useState, useEffect, createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const AuthContext = createContext({})

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  return <AuthContext.Provider value={{ user, loading, supabase }}>{children}</AuthContext.Provider>
}

const useAuth = () => useContext(AuthContext)

function Login() {
  const { supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Feil e-post eller passord')
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', background: '#059669', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>EP</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>En Plattform</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>KS-system for bygg og anlegg</p>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1.5rem', color: '#0f172a', marginTop: 0 }}>Logg inn</h2>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#dc2626', marginBottom: '1rem', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>E-post</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="navn@bedrift.no"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Passord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', emoji: '🏠' },
  { id: 'prosjekter', label: 'Prosjekter', emoji: '🏗️' },
  { id: 'prosjektfiler', label: 'Prosjektfiler', emoji: '📁' },
  { id: 'sjekklister', label: 'Sjekklister', emoji: '✅' },
  { id: 'avvik', label: 'Avvik', emoji: '⚠️' },
  { id: 'hms', label: 'HMS & Risiko', emoji: '🛡️' },
  { id: 'maskiner', label: 'Maskiner', emoji: '🚜' },
  null,
  { id: 'tilbud', label: 'Tilbud', emoji: '📋' },
  { id: 'anbudsmodul', label: 'Anbudsmodul', emoji: '⚖️' },
  { id: 'ordre', label: 'Ordre', emoji: '📝' },
  { id: 'faktura', label: 'Faktura', emoji: '🧾' },
  null,
  { id: 'ansatte', label: 'Ansatte', emoji: '👷' },
  { id: 'timelister', label: 'Timelister', emoji: '⏱️' },
  { id: 'ressursplan', label: 'Ressursplan', emoji: '📅' },
  { id: 'kalender', label: 'Kalender', emoji: '📆' },
  { id: 'chat', label: 'Chat', emoji: '💬' },
  null,
  { id: 'crm', label: 'CRM', emoji: '📊' },
  { id: 'brukeradmin', label: 'Brukere', emoji: '👤' },
  { id: 'varsler', label: 'Varsler', emoji: '🔔' },
]

const moduleCards = [
  { id: 'prosjekter', name: 'Prosjekter', desc: 'Administrer prosjekter', emoji: '🏗️', color: '#ecfdf5' },
  { id: 'prosjektfiler', name: 'Prosjektfiler', desc: 'Filer og dokumenter', emoji: '📁', color: '#f0fdf4' },
  { id: 'sjekklister', name: 'Sjekklister', desc: 'Kvalitetskontroll', emoji: '✅', color: '#f0fdfa' },
  { id: 'avvik', name: 'Avvik', desc: 'Avvikshåndtering', emoji: '⚠️', color: '#fffbeb' },
  { id: 'hms', name: 'HMS & Risiko', desc: 'Helse, miljø og sikkerhet', emoji: '🛡️', color: '#fef2f2' },
  { id: 'maskiner', name: 'Maskiner', desc: 'Maskin- og utstyrsregister', emoji: '🚜', color: '#fff7ed' },
  { id: 'tilbud', name: 'Tilbud', desc: 'Tilbudsadministrasjon', emoji: '📋', color: '#ecfeff' },
  { id: 'anbudsmodul', name: 'Anbudsportal', desc: 'Leverandøranbud', emoji: '⚖️', color: '#fff7ed' },
  { id: 'ordre', name: 'Ordre', desc: 'Arbeidsordre', emoji: '📝', color: '#eef2ff' },
  { id: 'faktura', name: 'Faktura', desc: 'Fakturering', emoji: '🧾', color: '#f0fdf4' },
  { id: 'ansatte', name: 'Ansatte', desc: 'Personaladministrasjon', emoji: '👷', color: '#f8fafc' },
  { id: 'timelister', name: 'Timelister', desc: 'Timeføring', emoji: '⏱️', color: '#eef2ff' },
  { id: 'ressursplan', name: 'Ressursplan', desc: 'Bemanning', emoji: '📅', color: '#faf5ff' },
  { id: 'kalender', name: 'Kalender', desc: 'Hendelser og møter', emoji: '📆', color: '#eff6ff' },
  { id: 'chat', name: 'Chat', desc: 'Teamkommunikasjon', emoji: '💬', color: '#fdf4ff' },
  { id: 'crm', name: 'CRM', desc: 'Kundeadministrasjon', emoji: '📊', color: '#fff1f2' },
  { id: 'brukeradmin', name: 'Brukere', desc: 'Brukeradministrasjon', emoji: '👤', color: '#f8fafc' },
  { id: 'varsler', name: 'Varsler', desc: 'Notifikasjoner', emoji: '🔔', color: '#fffbeb' },
]

const moduleSections = [
  {
    title: '🔹 GRUNNPAKKE',
    modules: ['prosjekter', 'prosjektfiler', 'sjekklister', 'avvik', 'hms', 'maskiner'],
    singleRow: true,
  },
  {
    title: '💰 ØKONOMI & KONTRAKT',
    modules: ['tilbud', 'anbudsmodul', 'ordre', 'faktura'],
  },
  {
    title: '👷 PERSONELL & RESSURSER',
    modules: ['ansatte', 'timelister', 'ressursplan', 'kalender', 'chat'],
  },
  {
    title: '⚙️ SALG & ADMIN',
    modules: ['crm', 'brukeradmin', 'varsler'],
  },
]

function ModuleCard({ module, onNavigate }) {
  const m = moduleCards.find(x => x.id === module)
  if (!m) return null
  return (
    <button onClick={() => onNavigate(m.id)}
      style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '12px' }}>
        {m.emoji}
      </div>
      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>{m.name}</div>
      <div style={{ color: '#94a3b8', fontSize: '12px' }}>{m.desc}</div>
    </button>
  )
}

function Dashboard({ onNavigate, user }) {
  const days = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag']
  const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember']
  const d = new Date()
  const dateStr = `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`
  const firstName = user?.email?.split('@')[0] || 'Bruker'
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '24px 32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Velkommen tilbake, {firstName}</h1>
        <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px', marginBottom: 0 }}>{dateStr}</p>
      </div>
      <div style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '24px', marginTop: 0 }}>Moduler</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {moduleSections.map((section, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', letterSpacing: '0.05em' }}>{section.title}</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: section.singleRow
                  ? `repeat(${section.modules.length}, minmax(140px, 1fr))`
                  : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
              }}>
                {section.modules.map(id => <ModuleCard key={id} module={id} onNavigate={onNavigate} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ─── PROSJEKTER MODULE ────────────────────────────────────────────────────────

const statusConfig = {
  planlagt:  { label: 'Planlagt',  bg: '#eff6ff', color: '#2563eb' },
  aktiv:     { label: 'Aktiv',     bg: '#ecfdf5', color: '#059669' },
  pause:     { label: 'På pause',  bg: '#fffbeb', color: '#d97706' },
  fullfort:  { label: 'Fullført',  bg: '#f1f5f9', color: '#475569' },
  avbrutt:   { label: 'Avbrutt',   bg: '#fef2f2', color: '#dc2626' },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
      {cfg.label}
    </span>
  )
}

function Modal({ open, onClose, title, children, size }) {
  if (!open) return null
  const maxWidth = size === 'lg' ? '720px' : size === 'xl' ? '900px' : '480px'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '20px', width: '100%', maxWidth, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>x</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function Input2({ value, onChange, type, placeholder, required, readOnly }) {
  return (
    <input type={type || 'text'} value={value || ''} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: readOnly ? '#f8fafc' : 'white', color: '#0f172a' }} />
  )
}

function Select2({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', color: '#0f172a' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Textarea2({ value, onChange, placeholder, rows }) {
  return (
    <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows || 3}
      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }} />
  )
}

function ContactList({ title, items, onChange }) {
  const add = () => onChange([...items, { name: '', phone: '', email: '', company: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i, field, val) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{title}</h4>
        <button type="button" onClick={add} style={{ background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Legg til</button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <Input2 value={item.company} onChange={e => update(i, 'company', e.target.value)} placeholder="Firma" />
            <Input2 value={item.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Kontaktperson" />
            <Input2 value={item.phone} onChange={e => update(i, 'phone', e.target.value)} placeholder="Telefon" />
            <Input2 value={item.email} onChange={e => update(i, 'email', e.target.value)} placeholder="E-post" />
          </div>
          <button type="button" onClick={() => remove(i)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Fjern</button>
        </div>
      ))}
      {items.length === 0 && <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Ingen lagt til</p>}
    </div>
  )
}

const emptyForm = {
  name: '', project_number: '', description: '', status: 'planlagt',
  address_street: '', address_postal: '', address_city: '',
  start_date: '', end_date: '', budget: '',
  client_name: '', client_contact: '', client_email: '', client_phone: '',
  resident_name: '', resident_phone: '', resident_email: '',
  project_manager_name: '', project_manager_email: '', project_manager_phone: '',
  subcontractors: [], architects: [], consultants: [],
}

function ProsjektForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || emptyForm)
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Grunnleggende</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Prosjektnavn *"><Input2 value={form.name} onChange={e => set('name', e.target.value)} placeholder="Skriv inn prosjektnavn" required /></Field></div>
          <Field label="Prosjektnummer"><Input2 value={form.project_number} onChange={e => set('project_number', e.target.value)} placeholder="Tildeles automatisk" /></Field>
          <Field label="Status"><Select2 value={form.status} onChange={v => set('status', v)} options={[{value:'planlagt',label:'Planlagt'},{value:'aktiv',label:'Aktiv'},{value:'pause',label:'Pa pause'},{value:'fullfort',label:'Fullfort'},{value:'avbrutt',label:'Avbrutt'}]} /></Field>
          <Field label="Gateadresse"><Input2 value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="Gatenavn og nummer" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
            <Field label="Postnr"><Input2 value={form.address_postal} onChange={e => set('address_postal', e.target.value)} placeholder="0000" /></Field>
            <Field label="Poststed"><Input2 value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="By" /></Field>
          </div>
          <Field label="Startdato"><Input2 type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
          <Field label="Sluttdato"><Input2 type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Budsjett (NOK)"><Input2 type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Beskrivelse"><Textarea2 value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beskrivelse av prosjektet..." /></Field></div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Prosjektleder</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Navn"><Input2 value={form.project_manager_name} onChange={e => set('project_manager_name', e.target.value)} placeholder="Fullt navn" /></Field>
          <Field label="Telefon"><Input2 value={form.project_manager_phone} onChange={e => set('project_manager_phone', e.target.value)} placeholder="+47 000 00 000" /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="E-post"><Input2 type="email" value={form.project_manager_email} onChange={e => set('project_manager_email', e.target.value)} placeholder="prosjektleder@bedrift.no" /></Field></div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Kunde</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Kundenavn"><Input2 value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Navn pa kunde" /></Field></div>
          <Field label="Kontaktperson"><Input2 value={form.client_contact} onChange={e => set('client_contact', e.target.value)} placeholder="Navn" /></Field>
          <Field label="Telefon"><Input2 value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+47 000 00 000" /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="E-post"><Input2 type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="kunde@eksempel.no" /></Field></div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Beboer / Annen kontakt</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Navn"><Input2 value={form.resident_name} onChange={e => set('resident_name', e.target.value)} placeholder="Navn" /></Field>
          <Field label="Telefon"><Input2 value={form.resident_phone} onChange={e => set('resident_phone', e.target.value)} placeholder="+47 000 00 000" /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="E-post"><Input2 type="email" value={form.resident_email} onChange={e => set('resident_email', e.target.value)} placeholder="beboer@eksempel.no" /></Field></div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Underleverandorer</h3>
        <ContactList title="" items={form.subcontractors || []} onChange={v => set('subcontractors', v)} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Arkitekter</h3>
        <ContactList title="" items={form.architects || []} onChange={v => set('architects', v)} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Radgivere / Konsulenter</h3>
        <ContactList title="" items={form.consultants || []} onChange={v => set('consultants', v)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
        <button type="button" onClick={onCancel} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Avbryt</button>
        <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>{loading ? 'Lagrer...' : 'Lagre prosjekt'}</button>
      </div>
    </form>
  )
}

function ProsjekterPage({ onNavigateDetail }) {
  const { supabase } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const handleCreate = async (form) => {
    setSaving(true)
    const num = form.project_number || 'P-' + Date.now().toString().slice(-5)
    const address = [form.address_street, (form.address_postal + ' ' + form.address_city).trim()].filter(Boolean).join(', ')
    await supabase.from('projects').insert({ name: form.name, project_number: num, description: form.description, status: form.status, address, start_date: form.start_date || null, end_date: form.end_date || null, budget: form.budget ? parseFloat(form.budget) : null, client_name: form.client_name, client_contact: form.client_contact, client_email: form.client_email, client_phone: form.client_phone })
    await load()
    setSaving(false)
    setShowCreate(false)
  }
  const filtered = projects.filter(p => {
    const s = search.toLowerCase()
    return (!s || p.name?.toLowerCase().includes(s) || p.client_name?.toLowerCase().includes(s) || p.project_number?.toLowerCase().includes(s)) && (statusFilter === 'all' || p.status === statusFilter)
  })
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Prosjekter</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>{projects.length} prosjekter totalt</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Nytt prosjekt</button>
      </div>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>&#128269;</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sok etter prosjekt..." style={{ paddingLeft: '36px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', width: '240px' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white' }}>
            <option value="all">Alle statuser</option>
            <option value="planlagt">Planlagt</option>
            <option value="aktiv">Aktiv</option>
            <option value="pause">Pa pause</option>
            <option value="fullfort">Fullfort</option>
            <option value="avbrutt">Avbrutt</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            {['grid','list'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: viewMode === m ? '#ecfdf5' : 'transparent', color: viewMode === m ? '#059669' : '#94a3b8', fontSize: '16px' }}>
                {m === 'grid' ? String.fromCharCode(10004)+String.fromCharCode(10004) : String.fromCharCode(9776)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster prosjekter...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#127959;</div>
            <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Ingen prosjekter</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{search ? 'Ingen prosjekter matcher soket ditt' : 'Kom i gang ved a opprette ditt forste prosjekt'}</p>
            <button onClick={() => setShowCreate(true)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Nytt prosjekt</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => onNavigateDetail(p.id)} style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>&#127959;</div>
                  <StatusBadge status={p.status} />
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{p.name}</h3>
                {p.project_number && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>#{p.project_number}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {p.client_name && <span style={{ fontSize: '13px', color: '#64748b' }}>&#128100; {p.client_name}</span>}
                  {p.address && <span style={{ fontSize: '13px', color: '#64748b' }}>&#128205; {p.address}</span>}
                  {p.start_date && <span style={{ fontSize: '13px', color: '#64748b' }}>&#128197; {fmtDate(p.start_date)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => onNavigateDetail(p.id)} style={{ background: 'white', borderRadius: '12px', padding: '14px 20px', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }} onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'} onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>&#127959;</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{p.name}</span>
                    {p.project_number && <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{p.project_number}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '2px' }}>
                    {p.client_name && <span style={{ fontSize: '12px', color: '#64748b' }}>{p.client_name}</span>}
                    {p.address && <span style={{ fontSize: '12px', color: '#64748b' }}>{p.address}</span>}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <span style={{ color: '#94a3b8' }}>&#8250;</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nytt prosjekt" size="lg">
        <ProsjektForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
      </Modal>
    </div>
  )
}

function ProsjektDetaljerPage({ projectId, onBack }) {
  const { supabase } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [projectId])
  const handleUpdate = async (form) => {
    setSaving(true)
    const address = [form.address_street, (form.address_postal + ' ' + form.address_city).trim()].filter(Boolean).join(', ') || form.address
    await supabase.from('projects').update({ name: form.name, project_number: form.project_number, description: form.description, status: form.status, address, start_date: form.start_date || null, end_date: form.end_date || null, budget: form.budget ? parseFloat(form.budget) : null, client_name: form.client_name, client_contact: form.client_contact, client_email: form.client_email, client_phone: form.client_phone, updated_at: new Date().toISOString() }).eq('id', projectId)
    await load()
    setSaving(false)
    setShowEdit(false)
  }
  const handleDelete = async () => {
    await supabase.from('projects').delete().eq('id', projectId)
    onBack()
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Ikke satt'
  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>Laster prosjekt...</div>
  if (!project) return <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'system-ui, sans-serif' }}>Prosjekt ikke funnet</div>
  const initialForm = { ...project, address_street: project.address?.split(',')[0]?.trim() || '', address_postal: project.address?.split(',')[1]?.trim()?.split(' ')[0] || '', address_city: project.address?.split(',')[1]?.trim()?.split(' ').slice(1).join(' ') || '' }
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>&#8592; Tilbake til prosjekter</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>&#127959;</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.project_number && <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Prosjektnr: #{project.project_number}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowEdit(true)} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Rediger</button>
            <button onClick={() => setShowDelete(true)} style={{ padding: '9px 18px', border: '1px solid #fecaca', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>Slett</button>
          </div>
        </div>
      </div>
      <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Prosjektinformasjon</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {project.address && <div style={{ display: 'flex', gap: '10px' }}><span>&#128205;</span><span style={{ color: '#374151', fontSize: '14px' }}>{project.address}</span></div>}
            <div style={{ display: 'flex', gap: '10px' }}><span>&#128197;</span><span style={{ color: '#374151', fontSize: '14px' }}>{fmtDate(project.start_date)} - {fmtDate(project.end_date)}</span></div>
            {project.budget && <div style={{ display: 'flex', gap: '10px' }}><span>&#128176;</span><span style={{ color: '#374151', fontSize: '14px' }}>{Number(project.budget).toLocaleString('nb-NO')} kr</span></div>}
            {project.description && <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>{project.description}</div>}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Kundeinformasjon</h2>
          {project.client_name ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}><span>&#127970;</span><span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{project.client_name}</span></div>
              {project.client_contact && <div style={{ display: 'flex', gap: '10px' }}><span>&#128100;</span><span style={{ color: '#374151', fontSize: '14px' }}>{project.client_contact}</span></div>}
              {project.client_email && <div style={{ display: 'flex', gap: '10px' }}><span>&#9993;</span><a href={'mailto:'+project.client_email} style={{ color: '#059669', fontSize: '14px' }}>{project.client_email}</a></div>}
              {project.client_phone && <div style={{ display: 'flex', gap: '10px' }}><span>&#128222;</span><a href={'tel:'+project.client_phone} style={{ color: '#059669', fontSize: '14px' }}>{project.client_phone}</a></div>}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Ingen kundeinformasjon registrert</p>}
        </div>
        {(project.project_manager_name || project.project_manager_email) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Prosjektleder</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.project_manager_name && <div style={{ display: 'flex', gap: '10px' }}><span>&#128100;</span><span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{project.project_manager_name}</span></div>}
              {project.project_manager_email && <div style={{ display: 'flex', gap: '10px' }}><span>&#9993;</span><a href={'mailto:'+project.project_manager_email} style={{ color: '#059669', fontSize: '14px' }}>{project.project_manager_email}</a></div>}
              {project.project_manager_phone && <div style={{ display: 'flex', gap: '10px' }}><span>&#128222;</span><a href={'tel:'+project.project_manager_phone} style={{ color: '#059669', fontSize: '14px' }}>{project.project_manager_phone}</a></div>}
            </div>
          </div>
        )}
      </div>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Rediger prosjekt" size="lg">
        <ProsjektForm initial={initialForm} onSubmit={handleUpdate} onCancel={() => setShowEdit(false)} loading={saving} />
      </Modal>
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Slett prosjekt">
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#374151', marginBottom: '24px' }}>Er du sikker pa at du vil slette <strong>{project.name}</strong>? Dette kan ikke angres.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setShowDelete(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Avbryt</button>
            <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Slett prosjekt</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: '#64748b' }}>Denne modulen er under utvikling</p>
    </div>
  )
}

function AppContent() {
  const { user, loading, supabase } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [projectId, setProjectId] = useState(null)

  const navigate = (p) => { setPage(p); setProjectId(null) }
  const openProject = (id) => { setPage('prosjekt_detaljer'); setProjectId(id) }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #059669', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: '#64748b' }}>Laster...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  const sidebarWidth = collapsed ? 60 : 240
  const activePage = page === 'prosjekt_detaljer' ? 'prosjekter' : page

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: sidebarWidth, background: 'white', borderRight: '1px solid #e2e8f0', transition: 'width 0.3s', zIndex: 40, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '0' : '0 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          {collapsed ? <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '18px' }}>EP</span> : <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>En Plattform</span>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} style={{ position: 'absolute', top: '72px', right: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          {collapsed ? '›' : '‹'}
        </button>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {navItems.map((item, i) => {
            if (!item) return <div key={i} style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />
            const isActive = activePage === item.id
            return (
              <button key={item.id} onClick={() => navigate(item.id)} title={collapsed ? item.label : undefined}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '10px' : '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: isActive ? '#ecfdf5' : 'transparent', color: isActive ? '#059669' : '#475569', fontWeight: isActive ? '600' : '400', fontSize: '14px', justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: '2px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.emoji}</span>
                {!collapsed && item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }} title="Logg ut">⏻</button>
            </div>
          ) : (
            <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }} title="Logg ut">⏻</button>
          )}
        </div>
      </div>

      <main style={{ marginLeft: sidebarWidth, flex: 1, transition: 'margin-left 0.3s', minHeight: '100vh' }}>
        {page === 'dashboard' && <Dashboard onNavigate={navigate} user={user} />}
        {page === 'prosjekter' && <ProsjekterPage onNavigateDetail={openProject} />}
        {page === 'prosjekt_detaljer' && <ProsjektDetaljerPage projectId={projectId} onBack={() => navigate('prosjekter')} />}
        {page !== 'dashboard' && page !== 'prosjekter' && page !== 'prosjekt_detaljer' && (
          <ComingSoon title={navItems.find(n => n?.id === page)?.label || page} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────
const db = {
  async getProjects() {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getProject(id) {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async createProject(data) {
    const { data: result, error } = await supabase.from('projects').insert(data).select().single()
    if (error) throw error
    return result
  },
  async updateProject(id, data) {
    const { data: result, error } = await supabase.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return result
  },
  async deleteProject(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
  }
}

// ─── SHARED UI ────────────────────────────────────────────────────────────
const S = {
  card: { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '24px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' },
  badge: {
    planlagt:  { background: '#eff6ff', color: '#1d4ed8' },
    aktiv:     { background: '#ecfdf5', color: '#059669' },
    pause:     { background: '#fffbeb', color: '#d97706' },
    fullfort:  { background: '#f1f5f9', color: '#475569' },
    avbrutt:   { background: '#fef2f2', color: '#dc2626' },
  }
}

function Badge({ status }) {
  const labels = { planlagt: 'Planlagt', aktiv: 'Aktiv', pause: 'På pause', fullfort: 'Fullført', avbrutt: 'Avbrutt' }
  const style = S.badge[status] || { background: '#f1f5f9', color: '#475569' }
  return <span style={{ ...style, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500' }}>{labels[status] || status}</span>
}

function Inp({ label, ...props }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <input style={S.input} {...props} />
    </div>
  )
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...S.input, background: 'white' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Txt({ label, ...props }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <textarea style={{ ...S.input, resize: 'vertical' }} {...props} />
    </div>
  )
}

function Overlay({ onClose }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
}

function ModalBox({ title, onClose, children, size = '560px' }) {
  return (
    <>
      <Overlay onClose={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', borderRadius: '20px', width: `min(${size}, calc(100vw - 32px))`, maxHeight: '90vh', display: 'flex', flexDirection: 'column', zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </>
  )
}

function Btn({ children, variant = 'primary', onClick, disabled, type = 'button', style: extraStyle }) {
  const styles = {
    primary: { background: '#059669', color: 'white', border: 'none' },
    outline: { background: 'white', color: '#374151', border: '1px solid #e2e8f0' },
    danger:  { background: '#dc2626', color: 'white', border: 'none' },
    ghost:   { background: 'transparent', color: '#374151', border: 'none' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], padding: '9px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'system-ui, sans-serif', ...extraStyle }}>
      {children}
    </button>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
    </div>
  )
}

// ─── PROSJEKTER ───────────────────────────────────────────────────────────
const emptyProject = {
  name: '', project_number: '', description: '',
  client_name: '', client_contact: '', client_email: '', client_phone: '',
  address_street: '', address_postal: '', address_city: '',
  start_date: '', end_date: '', status: 'planlagt', budget: '',
  project_manager_name: '', project_manager_email: '', project_manager_phone: '',
  resident_name: '', resident_phone: '', resident_email: '',
  subcontractors: [], architects: [], consultants: []
}

const statusOpts = [
  { value: 'planlagt', label: 'Planlagt' }, { value: 'aktiv', label: 'Aktiv' },
  { value: 'pause', label: 'På pause' }, { value: 'fullfort', label: 'Fullført' },
  { value: 'avbrutt', label: 'Avbrutt' }
]

function ProjectForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || emptyProject)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addSub = () => set('subcontractors', [...form.subcontractors, { name: '', trade: '', contact_person: '', phone: '', email: '' }])
  const updateSub = (i, k, v) => set('subcontractors', form.subcontractors.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  const removeSub = (i) => set('subcontractors', form.subcontractors.filter((_, idx) => idx !== i))

  const addArch = () => set('architects', [...form.architects, { company: '', contact_person: '', phone: '', email: '' }])
  const updateArch = (i, k, v) => set('architects', form.architects.map((a, idx) => idx === i ? { ...a, [k]: v } : a))
  const removeArch = (i) => set('architects', form.architects.filter((_, idx) => idx !== i))

  const addCons = () => set('consultants', [...form.consultants, { company: '', discipline: '', contact_person: '', phone: '', email: '' }])
  const updateCons = (i, k, v) => set('consultants', form.consultants.map((c, idx) => idx === i ? { ...c, [k]: v } : c))
  const removeCons = (i) => set('consultants', form.consultants.filter((_, idx) => idx !== i))

  const handleSubmit = (e) => { e.preventDefault(); onSave(form) }

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const contactCard = { background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '10px' }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <SectionDivider label="Grunnleggende" />
        <div style={{ ...grid2 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="Prosjektnavn *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Skriv inn prosjektnavn" required />
          </div>
          <Sel label="Status" value={form.status} onChange={v => set('status', v)} options={statusOpts} />
          <Inp label="Prosjektnummer" value={form.project_number} onChange={e => set('project_number', e.target.value)} placeholder="Tildeles automatisk" />
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="Gateadresse" value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="Gatenavn og nummer" />
          </div>
          <Inp label="Postnummer" value={form.address_postal} onChange={e => set('address_postal', e.target.value)} placeholder="0000" />
          <Inp label="Poststed" value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="By" />
          <Inp label="Startdato" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <Inp label="Sluttdato" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="Budsjett (NOK)" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Txt label="Beskrivelse" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beskrivelse av prosjektet..." rows={2} />
          </div>
        </div>

        <SectionDivider label="Prosjektleder" />
        <div style={grid2}>
          <Inp label="Navn" value={form.project_manager_name} onChange={e => set('project_manager_name', e.target.value)} placeholder="Fullt navn" />
          <Inp label="Telefon" value={form.project_manager_phone} onChange={e => set('project_manager_phone', e.target.value)} placeholder="+47 000 00 000" />
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="E-post" type="email" value={form.project_manager_email} onChange={e => set('project_manager_email', e.target.value)} placeholder="prosjektleder@bedrift.no" />
          </div>
        </div>

        <SectionDivider label="Kunde" />
        <div style={grid2}>
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="Kundenavn" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Navn på kunde" />
          </div>
          <Inp label="Kontaktperson" value={form.client_contact} onChange={e => set('client_contact', e.target.value)} placeholder="Navn" />
          <Inp label="Telefon" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+47 000 00 000" />
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="E-post" type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="kunde@eksempel.no" />
          </div>
        </div>

        <SectionDivider label="Beboer / Annen kontakt" />
        <div style={grid2}>
          <Inp label="Navn" value={form.resident_name} onChange={e => set('resident_name', e.target.value)} placeholder="Navn" />
          <Inp label="Telefon" value={form.resident_phone} onChange={e => set('resident_phone', e.target.value)} placeholder="+47 000 00 000" />
          <div style={{ gridColumn: '1/-1' }}>
            <Inp label="E-post" type="email" value={form.resident_email} onChange={e => set('resident_email', e.target.value)} placeholder="beboer@eksempel.no" />
          </div>
        </div>

        <SectionDivider label={`Underentreprenører (${form.subcontractors.length})`} />
        {form.subcontractors.map((s, i) => (
          <div key={i} style={contactCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>UE #{i + 1}</span>
              <button type="button" onClick={() => removeSub(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}>×</button>
            </div>
            <div style={grid2}>
              <Inp placeholder="Firmanavn" value={s.name} onChange={e => updateSub(i, 'name', e.target.value)} />
              <Inp placeholder="Fag/disiplin" value={s.trade} onChange={e => updateSub(i, 'trade', e.target.value)} />
              <Inp placeholder="Kontaktperson" value={s.contact_person} onChange={e => updateSub(i, 'contact_person', e.target.value)} />
              <Inp placeholder="Telefon" value={s.phone} onChange={e => updateSub(i, 'phone', e.target.value)} />
              <div style={{ gridColumn: '1/-1' }}>
                <Inp placeholder="E-post" value={s.email} onChange={e => updateSub(i, 'email', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <Btn variant="outline" onClick={addSub}>+ Legg til underentreprenør</Btn>

        <SectionDivider label={`Arkitekter (${form.architects.length})`} />
        {form.architects.map((a, i) => (
          <div key={i} style={contactCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Arkitekt #{i + 1}</span>
              <button type="button" onClick={() => removeArch(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}>×</button>
            </div>
            <div style={grid2}>
              <Inp placeholder="Firma" value={a.company} onChange={e => updateArch(i, 'company', e.target.value)} />
              <Inp placeholder="Kontaktperson" value={a.contact_person} onChange={e => updateArch(i, 'contact_person', e.target.value)} />
              <Inp placeholder="Telefon" value={a.phone} onChange={e => updateArch(i, 'phone', e.target.value)} />
              <Inp placeholder="E-post" value={a.email} onChange={e => updateArch(i, 'email', e.target.value)} />
            </div>
          </div>
        ))}
        <Btn variant="outline" onClick={addArch}>+ Legg til arkitekt</Btn>

        <SectionDivider label={`Rådgivere (${form.consultants.length})`} />
        {form.consultants.map((c, i) => (
          <div key={i} style={contactCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Rådgiver #{i + 1}</span>
              <button type="button" onClick={() => removeCons(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}>×</button>
            </div>
            <div style={grid2}>
              <Inp placeholder="Firma" value={c.company} onChange={e => updateCons(i, 'company', e.target.value)} />
              <Inp placeholder="Disiplin" value={c.discipline} onChange={e => updateCons(i, 'discipline', e.target.value)} />
              <Inp placeholder="Kontaktperson" value={c.contact_person} onChange={e => updateCons(i, 'contact_person', e.target.value)} />
              <Inp placeholder="Telefon" value={c.phone} onChange={e => updateCons(i, 'phone', e.target.value)} />
              <div style={{ gridColumn: '1/-1' }}>
                <Inp placeholder="E-post" value={c.email} onChange={e => updateCons(i, 'email', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <Btn variant="outline" onClick={addCons}>+ Legg til rådgiver</Btn>

      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
        <Btn variant="outline" onClick={onClose}>Avbryt</Btn>
        <Btn type="submit" disabled={saving}>{saving ? 'Lagrer...' : 'Lagre prosjekt'}</Btn>
      </div>
    </form>
  )
}

function ProsjekterPage({ onNavigateDetail }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try { setProjects(await db.getProjects()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.project_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      const num = form.project_number || `P-${Date.now().toString().slice(-5)}`
      await db.createProject({
        ...form,
        project_number: num,
        address: [form.address_street, `${form.address_postal} ${form.address_city}`.trim()].filter(Boolean).join(', '),
        budget: form.budget ? parseFloat(form.budget) : null,
      })
      setShowCreate(false)
      load()
    } catch (e) { alert('Feil ved opprettelse: ' + e.message) }
    finally { setSaving(false) }
  }

  const f = { fontFamily: 'system-ui, sans-serif' }

  return (
    <div style={f}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>Prosjekter</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>{projects.length} prosjekter totalt</p>
          </div>
          <Btn onClick={() => setShowCreate(true)}>+ Nytt prosjekt</Btn>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk etter prosjekt..."
              style={{ ...S.input, paddingLeft: '36px' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ ...S.input, width: '160px', background: 'white' }}>
            <option value="all">Alle statuser</option>
            {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: viewMode === v ? '#ecfdf5' : 'transparent', color: viewMode === v ? '#059669' : '#94a3b8', fontSize: '16px' }}>
                {v === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster prosjekter...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏗️</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Ingen prosjekter</h3>
            <p style={{ color: '#64748b', margin: '0 0 20px' }}>{search ? 'Ingen prosjekter matcher søket' : 'Kom i gang ved å opprette ditt første prosjekt'}</p>
            {!search && <Btn onClick={() => setShowCreate(true)}>+ Nytt prosjekt</Btn>}
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => onNavigateDetail(p.id)}
                style={{ ...S.card, padding: '20px', cursor: 'pointer', textAlign: 'left', border: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏗️</div>
                  <Badge status={p.status} />
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{p.name}</h3>
                {p.project_number && <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>#{p.project_number}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', color: '#64748b' }}>
                  {p.client_name && <span>👥 {p.client_name}</span>}
                  {p.address && <span>📍 {p.address}</span>}
                  {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString('nb-NO')}</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => onNavigateDetail(p.id)}
                style={{ ...S.card, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏗️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{p.name}</span>
                    {p.project_number && <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{p.project_number}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    {p.client_name && <span>{p.client_name}</span>}
                    {p.address && <span>{p.address}</span>}
                  </div>
                </div>
                <Badge status={p.status} />
                <span style={{ color: '#cbd5e1' }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <ModalBox title="Nytt prosjekt" onClose={() => setShowCreate(false)} size="680px">
          <ProjectForm onSave={handleCreate} onClose={() => setShowCreate(false)} saving={saving} />
        </ModalBox>
      )}
    </div>
  )
}

function ProsjektDetaljerPage({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('ue')

  const load = async () => {
    try { setProject(await db.getProject(projectId)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [projectId])

  const handleUpdate = async (form) => {
    setSaving(true)
    try {
      await db.updateProject(projectId, {
        ...form,
        address: [form.address_street, `${form.address_postal} ${form.address_city}`.trim()].filter(Boolean).join(', ') || form.address,
        budget: form.budget ? parseFloat(form.budget) : null,
      })
      setShowEdit(false)
      load()
    } catch (e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await db.deleteProject(projectId)
      onBack()
    } catch (e) { alert('Feil: ' + e.message) }
  }

  const f = { fontFamily: 'system-ui, sans-serif' }

  if (loading) return <div style={{ ...f, textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster prosjekt...</div>
  if (!project) return (
    <div style={{ ...f, textAlign: 'center', padding: '60px' }}>
      <p style={{ color: '#64748b' }}>Prosjekt ikke funnet</p>
      <Btn variant="outline" onClick={onBack}>← Tilbake</Btn>
    </div>
  )

  const tabStyle = (active) => ({
    padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: active ? '600' : '400',
    background: 'transparent', color: active ? '#059669' : '#64748b',
    borderBottom: active ? '2px solid #059669' : '2px solid transparent',
    fontFamily: 'system-ui, sans-serif'
  })

  const tabs = [
    { id: 'ue', label: `Underentreprenører (${project.subcontractors?.length || 0})` },
    { id: 'ark', label: `Arkitekter (${project.architects?.length || 0})` },
    { id: 'rad', label: `Rådgivere (${project.consultants?.length || 0})` },
  ]

  const contactCard = (items, emptyMsg) => items?.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{item.name || item.company}</p>
            {(item.trade || item.discipline) && <p style={{ margin: '0 0 3px', fontSize: '13px', color: '#64748b' }}>{item.trade || item.discipline}</p>}
            {item.contact_person && <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>{item.contact_person}</p>}
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {item.phone && <a href={`tel:${item.phone}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>📞 {item.phone}</a>}
            {item.email && <a href={`mailto:${item.email}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>✉️ {item.email}</a>}
          </div>
        </div>
      ))}
    </div>
  ) : <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>{emptyMsg}</p>

  const initEdit = {
    ...project,
    address_street: project.address_street || '',
    address_postal: project.address_postal || '',
    address_city: project.address_city || '',
    budget: project.budget || '',
    subcontractors: project.subcontractors || [],
    architects: project.architects || [],
    consultants: project.consultants || [],
  }

  return (
    <div style={f}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0, fontFamily: 'system-ui, sans-serif' }}>
          ← Tilbake til prosjekter
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏗️</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{project.name}</h1>
                <Badge status={project.status} />
              </div>
              {project.project_number && <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94a3b8' }}>#{project.project_number}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Btn variant="outline" onClick={() => setShowEdit(true)}>✏️ Rediger</Btn>
            <Btn variant="outline" onClick={() => setShowDelete(true)} style={{ color: '#dc2626', borderColor: '#fecaca' }}>🗑️</Btn>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Info card */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Prosjektinformasjon</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {project.address && (
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Adresse</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{project.address}</p>
                </div>
              )}
              {(project.start_date || project.end_date) && (
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Periode</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>
                    {project.start_date && new Date(project.start_date).toLocaleDateString('nb-NO')}
                    {project.end_date && ` – ${new Date(project.end_date).toLocaleDateString('nb-NO')}`}
                  </p>
                </div>
              )}
              {project.budget && (
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Budsjett</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{Number(project.budget).toLocaleString('nb-NO')} kr</p>
                </div>
              )}
            </div>
            {project.description && (
              <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{project.description}</p>
            )}
          </div>

          {/* UE / Ark / Rådgivere tabs */}
          <div style={S.card}>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', marginBottom: '16px', marginLeft: '-24px', marginRight: '-24px', paddingLeft: '24px' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(activeTab === t.id)}>{t.label}</button>
              ))}
            </div>
            {activeTab === 'ue' && contactCard(project.subcontractors, 'Ingen underentreprenører registrert')}
            {activeTab === 'ark' && contactCard(project.architects, 'Ingen arkitekter registrert')}
            {activeTab === 'rad' && contactCard(project.consultants, 'Ingen rådgivere registrert')}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prosjektleder */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>👷 Prosjektleder</h3>
            {project.project_manager_name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{project.project_manager_name}</p>
                {project.project_manager_email && <a href={`mailto:${project.project_manager_email}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>✉️ {project.project_manager_email}</a>}
                {project.project_manager_phone && <a href={`tel:${project.project_manager_phone}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>📞 {project.project_manager_phone}</a>}
              </div>
            ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Ikke tildelt</p>}
          </div>

          {/* Kunde */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>🏢 Kunde</h3>
            {project.client_name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{project.client_name}</p>
                {project.client_contact && <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>👤 {project.client_contact}</p>}
                {project.client_email && <a href={`mailto:${project.client_email}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>✉️ {project.client_email}</a>}
                {project.client_phone && <a href={`tel:${project.client_phone}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>📞 {project.client_phone}</a>}
              </div>
            ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Ingen kundeinformasjon</p>}
          </div>

          {/* Beboer */}
          {(project.resident_name || project.resident_phone || project.resident_email) && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>🏠 Beboer / Kontakt</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {project.resident_name && <p style={{ margin: 0, fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{project.resident_name}</p>}
                {project.resident_phone && <a href={`tel:${project.resident_phone}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>📞 {project.resident_phone}</a>}
                {project.resident_email && <a href={`mailto:${project.resident_email}`} style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>✉️ {project.resident_email}</a>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <ModalBox title="Rediger prosjekt" onClose={() => setShowEdit(false)} size="680px">
          <ProjectForm initial={initEdit} onSave={handleUpdate} onClose={() => setShowEdit(false)} saving={saving} />
        </ModalBox>
      )}

      {showDelete && (
        <ModalBox title="Slett prosjekt" onClose={() => setShowDelete(false)} size="400px">
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#475569', fontSize: '15px', marginTop: 0 }}>Er du sikker på at du vil slette <strong>{project.name}</strong>? Dette kan ikke angres.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Btn variant="outline" onClick={() => setShowDelete(false)}>Avbryt</Btn>
              <Btn variant="danger" onClick={handleDelete}>Slett prosjekt</Btn>
            </div>
          </div>
        </ModalBox>
      )}
    </div>
  )
}
