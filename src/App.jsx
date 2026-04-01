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

// ─── DB HELPERS ───────────────────────────────────────────────────────────
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
// ─── PROSJEKTER PAGE ──────────────────────────────────────────────────────
const statusOpts = [{value:'planlagt',label:'Planlagt'},{value:'aktiv',label:'Aktiv'},{value:'pause',label:'På pause'},{value:'fullfort',label:'Fullført'},{value:'avbrutt',label:'Avbrutt'}]

const emptyProsjekt = {
  name:'', project_number:'', description:'', status:'planlagt',
  address_street:'', address_postal:'', address_city:'',
  start_date:'', end_date:'', budget:'',
  client_name:'', client_contact:'', client_email:'', client_phone:'',
  resident_name:'', resident_phone:'', resident_email:'',
  project_manager_name:'', project_manager_email:'', project_manager_phone:'',
  subcontractors:[], architects:[], consultants:[],
}

function FLabel({ label, children }) {
  return <div><label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#374151', marginBottom:'4px' }}>{label}</label>{children}</div>
}

function FInput({ ...props }) {
  return <input {...props} style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
}

function FSelect({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', background:'white' }}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
}

function FTextarea({ ...props }) {
  return <textarea {...props} style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'system-ui, sans-serif' }} />
}

function ContactSection({ title, items, onChange }) {
  const add = () => onChange([...items, { company:'', name:'', phone:'', email:'', trade:'', discipline:'' }])
  const remove = (i) => onChange(items.filter((_,idx) => idx !== i))
  const update = (i, k, v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a) }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <h3 style={{ margin:0, fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>{title}</h3>
        <button type="button" onClick={add} style={{ background:'#ecfdf5', color:'#059669', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', cursor:'pointer', fontWeight:'600' }}>+ Legg til</button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', marginBottom:'10px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
            <FInput value={item.company || item.name || ''} onChange={e => update(i, 'company', e.target.value)} placeholder="Firma" />
            <FInput value={item.trade || item.discipline || ''} onChange={e => update(i, 'trade', e.target.value)} placeholder="Fag/disiplin" />
            <FInput value={item.contact_person || ''} onChange={e => update(i, 'contact_person', e.target.value)} placeholder="Kontaktperson" />
            <FInput value={item.phone || ''} onChange={e => update(i, 'phone', e.target.value)} placeholder="Telefon" />
            <div style={{ gridColumn:'1/-1' }}>
              <FInput value={item.email || ''} onChange={e => update(i, 'email', e.target.value)} placeholder="E-post" />
            </div>
          </div>
          <button type="button" onClick={() => remove(i)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Fjern</button>
        </div>
      ))}
      {items.length === 0 && <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>Ingen lagt til ennå</p>}
    </div>
  )
}

function ProsjektModal({ title, initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || emptyProsjekt)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }
  const sec = (label) => <h3 style={{ margin:'8px 0 14px', fontSize:'14px', fontWeight:'700', color:'#0f172a', borderBottom:'1px solid #f1f5f9', paddingBottom:'8px' }}>{label}</h3>

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'white', borderRadius:'20px', width:'min(680px, calc(100vw - 32px))', maxHeight:'90vh', display:'flex', flexDirection:'column', zIndex:101, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', fontFamily:'system-ui, sans-serif' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h2 style={{ margin:0, fontSize:'17px', fontWeight:'700', color:'#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color:'#94a3b8' }}>×</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ overflowY:'auto', flex:1 }}>
          <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'20px' }}>
            {sec('Grunnleggende')}
            <div style={g2}>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="Prosjektnavn *"><FInput value={form.name} onChange={e => set('name', e.target.value)} placeholder="Skriv inn prosjektnavn" required /></FLabel></div>
              <FLabel label="Status"><FSelect value={form.status} onChange={v => set('status', v)} options={statusOpts} /></FLabel>
              <FLabel label="Prosjektnummer"><FInput value={form.project_number} onChange={e => set('project_number', e.target.value)} placeholder="Tildeles automatisk" /></FLabel>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="Gateadresse"><FInput value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="Gatenavn og nummer" /></FLabel></div>
              <FLabel label="Postnummer"><FInput value={form.address_postal} onChange={e => set('address_postal', e.target.value)} placeholder="0000" /></FLabel>
              <FLabel label="Poststed"><FInput value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="By" /></FLabel>
              <FLabel label="Startdato"><FInput type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></FLabel>
              <FLabel label="Sluttdato"><FInput type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></FLabel>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="Budsjett (NOK)"><FInput type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" /></FLabel></div>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="Beskrivelse"><FTextarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beskrivelse..." rows={2} /></FLabel></div>
            </div>
            {sec('Prosjektleder')}
            <div style={g2}>
              <FLabel label="Navn"><FInput value={form.project_manager_name} onChange={e => set('project_manager_name', e.target.value)} placeholder="Fullt navn" /></FLabel>
              <FLabel label="Telefon"><FInput value={form.project_manager_phone} onChange={e => set('project_manager_phone', e.target.value)} placeholder="+47 000 00 000" /></FLabel>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="E-post"><FInput type="email" value={form.project_manager_email} onChange={e => set('project_manager_email', e.target.value)} placeholder="prosjektleder@bedrift.no" /></FLabel></div>
            </div>
            {sec('Kunde')}
            <div style={g2}>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="Kundenavn"><FInput value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Navn på kunde" /></FLabel></div>
              <FLabel label="Kontaktperson"><FInput value={form.client_contact} onChange={e => set('client_contact', e.target.value)} placeholder="Navn" /></FLabel>
              <FLabel label="Telefon"><FInput value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+47 000 00 000" /></FLabel>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="E-post"><FInput type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="kunde@eksempel.no" /></FLabel></div>
            </div>
            {sec('Beboer / Annen kontakt')}
            <div style={g2}>
              <FLabel label="Navn"><FInput value={form.resident_name} onChange={e => set('resident_name', e.target.value)} placeholder="Navn" /></FLabel>
              <FLabel label="Telefon"><FInput value={form.resident_phone} onChange={e => set('resident_phone', e.target.value)} placeholder="+47 000 00 000" /></FLabel>
              <div style={{ gridColumn:'1/-1' }}><FLabel label="E-post"><FInput type="email" value={form.resident_email} onChange={e => set('resident_email', e.target.value)} placeholder="beboer@eksempel.no" /></FLabel></div>
            </div>
            {sec('Underentreprenører')}
            <ContactSection title="" items={form.subcontractors || []} onChange={v => set('subcontractors', v)} />
            {sec('Arkitekter')}
            <ContactSection title="" items={form.architects || []} onChange={v => set('architects', v)} />
            {sec('Rådgivere / Konsulenter')}
            <ContactSection title="" items={form.consultants || []} onChange={v => set('consultants', v)} />
          </div>
          <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:'10px', flexShrink:0 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>Avbryt</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>{saving ? 'Lagrer...' : 'Lagre prosjekt'}</button>
          </div>
        </form>
      </div>
    </>
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
  const f = { fontFamily:'system-ui, sans-serif' }
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', boxSizing:'border-box' }

  const load = async () => { try { setProjects(await db.getProjects()) } catch(e){console.error(e)} finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const filtered = projects.filter(p => {
    const ms = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase())
    const mst = statusFilter === 'all' || p.status === statusFilter
    return ms && mst
  })

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      await db.createProject({ ...form, project_number: form.project_number || `P-${Date.now().toString().slice(-5)}`, address: [form.address_street, `${form.address_postal} ${form.address_city}`.trim()].filter(Boolean).join(', '), budget: form.budget ? parseFloat(form.budget) : null })
      setShowCreate(false)
      load()
    } catch(e) { alert('Feil: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div style={f}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'22px', fontWeight:'bold', color:'#0f172a' }}>Prosjekter</h1>
            <p style={{ margin:'3px 0 0', fontSize:'13px', color:'#64748b' }}>{projects.length} prosjekter totalt</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ background:'#059669', color:'white', border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>+ Nytt prosjekt</button>
        </div>
      </div>
      <div style={{ padding:'24px 32px' }}>
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk etter prosjekt..." style={{ ...inp, paddingLeft:'36px' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width:'160px', background:'white' }}>
            <option value="all">Alle statuser</option>
            {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ display:'flex', gap:'4px' }}>
            {['grid','list'].map(v => <button key={v} onClick={() => setViewMode(v)} style={{ padding:'8px 10px', borderRadius:'8px', border:'none', cursor:'pointer', background: viewMode===v ? '#ecfdf5':'transparent', color: viewMode===v ? '#059669':'#94a3b8', fontSize:'16px' }}>{v==='grid'?'⊞':'☰'}</button>)}
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>Laster prosjekter...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🏗️</div>
            <h3 style={{ color:'#0f172a', margin:'0 0 8px' }}>Ingen prosjekter</h3>
            <p style={{ color:'#64748b', margin:'0 0 20px' }}>{search ? 'Ingen matcher søket' : 'Opprett ditt første prosjekt'}</p>
            {!search && <button onClick={() => setShowCreate(true)} style={{ background:'#059669', color:'white', border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>+ Nytt prosjekt</button>}
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px' }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => onNavigateDetail(p.id)}
                style={{ background:'white', borderRadius:'16px', border:'1px solid #f1f5f9', padding:'20px', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>🏗️</div>
                  <StatusBadge status={p.status} />
                </div>
                <h3 style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:'600', color:'#0f172a' }}>{p.name}</h3>
                {p.project_number && <p style={{ margin:'0 0 10px', fontSize:'12px', color:'#94a3b8' }}>#{p.project_number}</p>}
                <div style={{ display:'flex', flexDirection:'column', gap:'4px', fontSize:'13px', color:'#64748b' }}>
                  {p.client_name && <span>👥 {p.client_name}</span>}
                  {p.address && <span>📍 {p.address}</span>}
                  {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString('nb-NO')}</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => onNavigateDetail(p.id)}
                style={{ background:'white', borderRadius:'12px', border:'1px solid #f1f5f9', padding:'14px 18px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🏗️</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontWeight:'600', color:'#0f172a', fontSize:'14px' }}>{p.name}</span>
                    {p.project_number && <span style={{ fontSize:'12px', color:'#94a3b8' }}>#{p.project_number}</span>}
                  </div>
                  <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#64748b', marginTop:'2px' }}>
                    {p.client_name && <span>{p.client_name}</span>}
                    {p.address && <span>{p.address}</span>}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <span style={{ color:'#cbd5e1' }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {showCreate && <ProsjektModal title="Nytt prosjekt" onSave={handleCreate} onClose={() => setShowCreate(false)} saving={saving} />}
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
  const f = { fontFamily:'system-ui, sans-serif' }
  const card = { background:'white', borderRadius:'16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:'24px' }

  const load = async () => { try { setProject(await db.getProject(projectId)) } catch(e){console.error(e)} finally { setLoading(false) } }
  useEffect(() => { load() }, [projectId])

  const handleUpdate = async (form) => {
    setSaving(true)
    try {
      await db.updateProject(projectId, { ...form, address: [form.address_street, `${form.address_postal} ${form.address_city}`.trim()].filter(Boolean).join(', ') || form.address, budget: form.budget ? parseFloat(form.budget) : null })
      setShowEdit(false); load()
    } catch(e) { alert('Feil: ' + e.message) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await db.deleteProject(projectId); onBack() } catch(e) { alert('Feil: ' + e.message) }
  }

  if (loading) return <div style={{ ...f, textAlign:'center', padding:'60px', color:'#94a3b8' }}>Laster prosjekt...</div>
  if (!project) return <div style={{ ...f, textAlign:'center', padding:'60px' }}><p>Prosjekt ikke funnet</p><button onClick={onBack} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'8px 16px', cursor:'pointer' }}>← Tilbake</button></div>

  const tabs = [{id:'ue',label:`Underentreprenører (${project.subcontractors?.length||0})`},{id:'ark',label:`Arkitekter (${project.architects?.length||0})`},{id:'rad',label:`Rådgivere (${project.consultants?.length||0})`}]

  const contactCards = (items, empty) => items?.length > 0 ? (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {items.map((item,i) => (
        <div key={i} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', display:'flex', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:'0 0 3px', fontWeight:'600', color:'#0f172a', fontSize:'14px' }}>{item.company || item.name}</p>
            {(item.trade||item.discipline) && <p style={{ margin:'0 0 3px', fontSize:'13px', color:'#64748b' }}>{item.trade||item.discipline}</p>}
            {item.contact_person && <p style={{ margin:0, fontSize:'13px', color:'#475569' }}>{item.contact_person}</p>}
          </div>
          <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:'4px' }}>
            {item.phone && <a href={`tel:${item.phone}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>📞 {item.phone}</a>}
            {item.email && <a href={`mailto:${item.email}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>✉️ {item.email}</a>}
          </div>
        </div>
      ))}
    </div>
  ) : <p style={{ color:'#94a3b8', fontSize:'14px', textAlign:'center', padding:'20px', margin:0 }}>{empty}</p>

  const initEdit = { ...project, address_street: project.address_street||'', address_postal: project.address_postal||'', address_city: project.address_city||'', budget: project.budget||'', subcontractors: project.subcontractors||[], architects: project.architects||[], consultants: project.consultants||[] }

  return (
    <div style={f}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0, fontFamily:'system-ui, sans-serif' }}>← Tilbake til prosjekter</button>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>🏗️</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <h1 style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'#0f172a' }}>{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.project_number && <p style={{ margin:'3px 0 0', fontSize:'13px', color:'#94a3b8' }}>#{project.project_number}</p>}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => setShowEdit(true)} style={{ padding:'9px 16px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>✏️ Rediger</button>
            <button onClick={() => setShowDelete(true)} style={{ padding:'9px 14px', border:'1px solid #fecaca', borderRadius:'10px', background:'white', cursor:'pointer', color:'#dc2626', fontSize:'14px' }}>🗑️</button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div style={card}>
            <h3 style={{ margin:'0 0 16px', fontSize:'15px', fontWeight:'600', color:'#0f172a' }}>Prosjektinformasjon</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              {project.address && <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px' }}><p style={{ margin:'0 0 3px', fontSize:'11px', color:'#94a3b8', textTransform:'uppercase' }}>Adresse</p><p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'#0f172a' }}>{project.address}</p></div>}
              {(project.start_date||project.end_date) && <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px' }}><p style={{ margin:'0 0 3px', fontSize:'11px', color:'#94a3b8', textTransform:'uppercase' }}>Periode</p><p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'#0f172a' }}>{project.start_date && new Date(project.start_date).toLocaleDateString('nb-NO')}{project.end_date && ` – ${new Date(project.end_date).toLocaleDateString('nb-NO')}`}</p></div>}
              {project.budget && <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px' }}><p style={{ margin:'0 0 3px', fontSize:'11px', color:'#94a3b8', textTransform:'uppercase' }}>Budsjett</p><p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'#0f172a' }}>{Number(project.budget).toLocaleString('nb-NO')} kr</p></div>}
            </div>
            {project.description && <p style={{ margin:'16px 0 0', fontSize:'14px', color:'#475569', lineHeight:1.6 }}>{project.description}</p>}
          </div>

          <div style={card}>
            <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9', marginBottom:'16px', marginLeft:'-24px', marginRight:'-24px', paddingLeft:'24px' }}>
              {tabs.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'10px 16px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight: activeTab===t.id ? '600':'400', background:'transparent', color: activeTab===t.id ? '#059669':'#64748b', borderBottom: activeTab===t.id ? '2px solid #059669':'2px solid transparent', fontFamily:'system-ui, sans-serif' }}>{t.label}</button>)}
            </div>
            {activeTab==='ue' && contactCards(project.subcontractors, 'Ingen underentreprenører registrert')}
            {activeTab==='ark' && contactCards(project.architects, 'Ingen arkitekter registrert')}
            {activeTab==='rad' && contactCards(project.consultants, 'Ingen rådgivere registrert')}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={card}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>👷 Prosjektleder</h3>
            {project.project_manager_name ? <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}><p style={{ margin:0, fontWeight:'600', color:'#0f172a', fontSize:'14px' }}>{project.project_manager_name}</p>{project.project_manager_email && <a href={`mailto:${project.project_manager_email}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>✉️ {project.project_manager_email}</a>}{project.project_manager_phone && <a href={`tel:${project.project_manager_phone}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>📞 {project.project_manager_phone}</a>}</div> : <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>Ikke tildelt</p>}
          </div>
          <div style={card}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🏢 Kunde</h3>
            {project.client_name ? <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}><p style={{ margin:0, fontWeight:'600', color:'#0f172a', fontSize:'14px' }}>{project.client_name}</p>{project.client_contact && <p style={{ margin:0, fontSize:'13px', color:'#475569' }}>👤 {project.client_contact}</p>}{project.client_email && <a href={`mailto:${project.client_email}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>✉️ {project.client_email}</a>}{project.client_phone && <a href={`tel:${project.client_phone}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>📞 {project.client_phone}</a>}</div> : <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>Ingen kundeinformasjon</p>}
          </div>
          {(project.resident_name||project.resident_phone||project.resident_email) && (
            <div style={card}>
              <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🏠 Beboer / Kontakt</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {project.resident_name && <p style={{ margin:0, fontWeight:'600', color:'#0f172a', fontSize:'14px' }}>{project.resident_name}</p>}
                {project.resident_phone && <a href={`tel:${project.resident_phone}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>📞 {project.resident_phone}</a>}
                {project.resident_email && <a href={`mailto:${project.resident_email}`} style={{ fontSize:'13px', color:'#059669', textDecoration:'none' }}>✉️ {project.resident_email}</a>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && <ProsjektModal title="Rediger prosjekt" initial={initEdit} onSave={handleUpdate} onClose={() => setShowEdit(false)} saving={saving} />}
      {showDelete && (
        <>
          <div onClick={() => setShowDelete(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100 }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'white', borderRadius:'16px', padding:'24px', width:'min(400px, calc(100vw - 32px))', zIndex:101, fontFamily:'system-ui, sans-serif' }}>
            <h3 style={{ margin:'0 0 12px', fontSize:'16px', fontWeight:'700', color:'#0f172a' }}>Slett prosjekt</h3>
            <p style={{ margin:'0 0 20px', color:'#475569' }}>Er du sikker på at du vil slette <strong>{project.name}</strong>?</p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
              <button onClick={() => setShowDelete(false)} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>Avbryt</button>
              <button onClick={handleDelete} style={{ padding:'9px 18px', background:'#dc2626', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>Slett</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── PROSJEKTFILER PAGE ───────────────────────────────────────────────────
const FILE_CATEGORIES = [
  { id: 'tegninger', name: 'Tegninger / Planer', emoji: '📐', color: '#3b82f6' },
  { id: 'beskrivelser', name: 'Beskrivelser / Spesifikasjoner', emoji: '📄', color: '#10b981' },
  { id: 'kontrakt', name: 'Kontrakt / Avtaler', emoji: '📋', color: '#f59e0b' },
  { id: 'okonomi', name: 'Økonomi', emoji: '💰', color: '#ef4444' },
  { id: 'motereferater', name: 'Møtereferater', emoji: '📝', color: '#8b5cf6' },
  { id: 'tillatelser', name: 'Tillatelser / Sertifikater', emoji: '🏅', color: '#06b6d4' },
  { id: 'bilder', name: 'Bilder', emoji: '🖼️', color: '#ec4899' },
  { id: 'annet', name: 'Annet', emoji: '📎', color: '#6b7280' },
]

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

const getFileEmoji = (name, type) => {
  const ext = name?.split('.').pop()?.toLowerCase() || type?.toLowerCase() || ''
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️'
  if (['pdf'].includes(ext)) return '📕'
  if (['doc','docx'].includes(ext)) return '📘'
  if (['xls','xlsx'].includes(ext)) return '📗'
  if (['dwg','dxf'].includes(ext)) return '📐'
  return '📄'
}

function ProsjektfilerPage() {
  const [files, setFiles] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ project_id: '', category: 'annet', description: '', access_level: 'alle' })
  const [uploadFiles, setUploadFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const { user } = useAuth()
  const fileInputRef = React.useRef()
  const f = { fontFamily: 'system-ui, sans-serif' }
  const card = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

  const loadData = async () => {
    try {
      const [filesData, projectsData] = await Promise.all([
        supabase.from('project_files').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('projects').select('id, name').order('name').then(r => r.data || [])
      ])
      setFiles(filesData)
      setProjects(projectsData)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = files.filter(f => {
    const ms = !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
    const mp = projectFilter === 'all' || f.project_id === projectFilter
    const mc = categoryFilter === 'all' || f.category === categoryFilter
    return ms && mp && mc
  })

  const grouped = FILE_CATEGORIES.map(cat => ({
    ...cat,
    files: filtered.filter(f => f.category === cat.id)
  })).filter(cat => cat.files.length > 0)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (uploadFiles.length === 0) return alert('Velg minst én fil')
    if (!uploadForm.project_id) return alert('Velg et prosjekt')
    setUploading(true)
    try {
      for (const file of uploadFiles) {
        const ext = file.name.split('.').pop()
        const path = `projects/${uploadForm.project_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('plattform-files').upload(path, file)
        if (upErr) throw upErr
        await supabase.from('project_files').insert({
          name: file.name,
          project_id: uploadForm.project_id,
          file_url: path,
          file_type: ext,
          file_size: file.size,
          category: uploadForm.category,
          description: uploadForm.description,
          access_level: uploadForm.access_level,
          uploaded_by: user?.id,
        })
      }
      setShowUpload(false)
      setUploadFiles([])
      setUploadForm({ project_id: '', category: 'annet', description: '', access_level: 'alle' })
      loadData()
    } catch(e) { alert('Feil ved opplasting: ' + e.message) }
    finally { setUploading(false) }
  }

  const handleDownload = async (file) => {
    try {
      const { data, error } = await supabase.storage.from('plattform-files').download(file.file_url)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert('Feil ved nedlasting: ' + e.message) }
  }

  const handleDelete = async (file) => {
    if (!confirm(`Slett ${file.name}?`)) return
    try {
      await supabase.storage.from('plattform-files').remove([file.file_url])
      await supabase.from('project_files').delete().eq('id', file.id)
      loadData()
    } catch(e) { alert('Feil ved sletting: ' + e.message) }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setUploadFiles(prev => [...prev, ...dropped])
    setShowUpload(true)
  }

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '–'

  return (
    <div style={f}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>Prosjektfiler</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>{files.length} filer totalt</p>
          </div>
          <button onClick={() => setShowUpload(true)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>⬆️ Last opp fil</button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk etter fil..." style={{ ...inp, paddingLeft: '36px' }} />
          </div>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ ...inp, width: '200px', background: 'white' }}>
            <option value="all">Alle prosjekter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inp, width: '200px', background: 'white' }}>
            <option value="all">Alle kategorier</option>
            {FILE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{ border: `2px dashed ${dragOver ? '#059669' : '#e2e8f0'}`, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px', background: dragOver ? '#f0fdf4' : 'transparent', transition: 'all 0.2s', cursor: 'pointer' }}
          onClick={() => { setShowUpload(true) }}
        >
          <p style={{ margin: 0, color: dragOver ? '#059669' : '#94a3b8', fontSize: '14px' }}>
            {dragOver ? '📂 Slipp filene her!' : '📂 Dra og slipp filer her, eller klikk for å laste opp'}
          </p>
        </div>

        {/* File list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Laster filer...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Ingen filer</h3>
            <p style={{ color: '#64748b', margin: '0 0 20px' }}>{search ? 'Ingen filer matcher søket' : 'Last opp din første fil'}</p>
          </div>
        ) : grouped.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {grouped.map(cat => (
              <div key={cat.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{cat.name}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>({cat.files.length})</span>
                  <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cat.files.map(file => (
                    <div key={file.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {getFileEmoji(file.name, file.file_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', fontWeight: '600', color: '#0f172a', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                          <span>📁 {getProjectName(file.project_id)}</span>
                          {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                          {file.description && <span>{file.description}</span>}
                          <span>{new Date(file.created_at).toLocaleDateString('nb-NO')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleDownload(file)} title="Last ned" style={{ background: '#f0fdf4', color: '#059669', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '14px' }}>⬇️</button>
                        <button onClick={() => handleDelete(file)} title="Slett" style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(file => (
              <div key={file.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {getFileEmoji(file.name, file.file_type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{file.name}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                    <span>📁 {getProjectName(file.project_id)}</span>
                    {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleDownload(file)} style={{ background: '#f0fdf4', color: '#059669', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '14px' }}>⬇️</button>
                  <button onClick={() => handleDelete(file)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div onClick={() => setShowUpload(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', borderRadius: '20px', width: 'min(560px, calc(100vw - 32px))', maxHeight: '90vh', display: 'flex', flexDirection: 'column', zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Last opp filer</h2>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleUpload} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* File picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
              >
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>📂 Klikk for å velge filer</p>
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {uploadFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '8px', padding: '8px 12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '13px', color: '#0f172a' }}>{getFileEmoji(f.name)} {f.name}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => setUploadFiles(Array.from(e.target.files))} />

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Prosjekt *</label>
                <select value={uploadForm.project_id} onChange={e => setUploadForm(f => ({...f, project_id: e.target.value}))} required style={{ ...inp, background: 'white' }}>
                  <option value="">Velg prosjekt</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Kategori</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(f => ({...f, category: e.target.value}))} style={{ ...inp, background: 'white' }}>
                  {FILE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Tilgangsnivå</label>
                <select value={uploadForm.access_level} onChange={e => setUploadForm(f => ({...f, access_level: e.target.value}))} style={{ ...inp, background: 'white' }}>
                  <option value="alle">👥 Alle brukere</option>
                  <option value="prosjektleder">🔒 Prosjektleder</option>
                  <option value="admin">🛡️ Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Beskrivelse</label>
                <textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({...f, description: e.target.value}))} placeholder="Valgfri beskrivelse..." rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'system-ui, sans-serif' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button type="button" onClick={() => setShowUpload(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Avbryt</button>
                <button type="submit" disabled={uploading} style={{ padding: '10px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', opacity: uploading ? 0.7 : 1 }}>{uploading ? 'Laster opp...' : 'Last opp'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

// ─── DEFAULT TEMPLATES ────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    name: 'Kvalitetskontroll våtrom',
    description: 'Sjekkliste for kvalitetskontroll av bad, kjøkken og andre våtrom',
    category: 'kvalitet',
    sections: [
      { title: 'Belegning og fuging', items: ['Flisene ligger plant og jevnt', 'Fugene er jevne og uten hull', 'Farge og utseende på fugen'] },
      { title: 'Fuktighet og tetthet', items: ['Sjekk for fuktighet bak fliser', 'Kontroller drenering ved dusj'] },
      { title: 'Armaturer og innfatning', items: ['Blandebatteri fungerer korrekt', 'Håndklestang er sikker og festet', 'Inspeksjonsluker for skjulte ledninger'] },
    ]
  },
  {
    name: 'HMS inspeksjon på byggeplass',
    description: 'Daglig HMS kontroll på byggeplassen',
    category: 'hms',
    sections: [
      { title: 'Personlig verneutstyr', items: ['Alle arbeidere bruker hjelm', 'Sikkerhetsfottøy på alle', 'Vernebrillerbrukes ved behov'] },
      { title: 'Byggeområde og sikkerhet', items: ['Byggeplassen er gjort ryddig', 'Sikkerhetsgjerder er på plass', 'Fall og stupefare er merket'] },
    ]
  },
  {
    name: 'Overtakelse av prosjekt',
    description: 'Sjekkliste for overtakelse av ferdig prosjekt fra entreprenør',
    category: 'overtakelse',
    sections: [
      { title: 'Generell tilstand', items: ['Hele prosjektet er ferdigstilt', 'Området er ryddig og rengjort', 'All avfall er fjernet'] },
      { title: 'Funksjonalitet', items: ['Alle dører åpner og lukker korrekt', 'Alle vinduer åpner og lukker', 'Strøm og lys fungerer'] },
    ]
  },
  {
    name: 'Tømrer- og innfestingskontroll',
    description: 'Kontroll av tømrer- og innfestingsarbeid',
    category: 'tømrer',
    sections: [
      { title: 'Dørfester og karmer', items: ['Dørkarmer er plant og loddet', 'Dørblader stenger tett', 'Beslag og låser fungerer'] },
      { title: 'Vinduer', items: ['Vinduer åpner og lukker lett', 'Tetting rundt vindu er OK'] },
    ]
  },
  {
    name: 'Betongkontroll',
    description: 'Kontroll av betongarbeid og armering',
    category: 'betong',
    sections: [
      { title: 'Armering', items: ['Armeringsplan er fulgt', 'Overdekning er korrekt', 'Armering er rengjort og fri for rust'] },
      { title: 'Støping', items: ['Forskaling er tett og stabil', 'Betongkvalitet er kontrollert', 'Herdetid overholdes'] },
    ]
  },
  {
    name: 'Takarbeid kontroll',
    description: 'Kontroll av taklegging og taktekking',
    category: 'tak',
    sections: [
      { title: 'Undertak og lekter', items: ['Undertak er riktig lagt', 'Lekter er rett og i riktig avstand', 'Vindsperre er korrekt montert'] },
      { title: 'Taktekning', items: ['Takstein/plate er korrekt lagt', 'Møner og valley er tette', 'Renner og nedløp fungerer'] },
    ]
  },
  {
    name: 'Internkontroll generell',
    description: 'Generell internkontroll for bygg og anlegg',
    category: 'internkontroll',
    sections: [
      { title: 'Dokumentasjon', items: ['Tegninger er oppdaterte og tilgjengelige', 'Avvikslogg er oppdatert', 'Endringsmeldinger er registrert'] },
      { title: 'Kvalitet', items: ['Materialer er i henhold til spesifikasjon', 'Utførelse er i henhold til tegning', 'Prøving og testing er utført'] },
    ]
  },
]

const CATEGORY_LABELS = {
  tømrer:        { label: 'Tømrer',        emoji: '🪵' },
  betong:        { label: 'Betong',         emoji: '🏗️' },
  tak:           { label: 'Tak',            emoji: '🏠' },
  elektrikker:   { label: 'Elektrikker',    emoji: '⚡' },
  rorlegger:     { label: 'Rørlegger',      emoji: '🔧' },
  maler:         { label: 'Maler',          emoji: '🎨' },
  murerer:       { label: 'Murerer',        emoji: '🧱' },
  blikkenslager: { label: 'Blikkenslager',  emoji: '🛠️' },
  taktekker:     { label: 'Taktekker',      emoji: '🏠' },
  membranlegger: { label: 'Membranlegger',  emoji: '🔒' },
  sveiser:       { label: 'Sveiser',        emoji: '🔥' },
  kvalitet:      { label: 'Kvalitet',       emoji: '🔍' },
  hms:           { label: 'HMS',            emoji: '⚠️' },
  overtakelse:   { label: 'Overtakelse',    emoji: '🎯' },
  internkontroll:{ label: 'Internkontroll', emoji: '✅' },
  annet:         { label: 'Annet',          emoji: '📋' },
}

// ─── SJEKKLISTER PAGE ─────────────────────────────────────────────────────
function SjekklistePage({ onNavigateDetail }) {
  const [checklists, setChecklists] = useState([])
  const [projects, setProjects] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('lister') // 'lister' or 'maler'
  const [showNew, setShowNew] = useState(false)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [editTemplate, setEditTemplate] = useState(null)
  const [newForm, setNewForm] = useState({ project_id: '', template_id: '', title: '' })
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const f = { fontFamily: 'system-ui, sans-serif' }
  const card = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

  const loadData = async () => {
    try {
      const [cl, pr, tmpl] = await Promise.all([
        supabase.from('checklists').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('projects').select('id, name').order('name').then(r => r.data || []),
        supabase.from('checklist_templates').select('*').order('name').then(r => r.data || []),
      ])
      setChecklists(cl)
      setProjects(pr)
      // If no templates, seed with defaults
      if (tmpl.length === 0) {
        const seeds = DEFAULT_TEMPLATES.map(t => ({
          name: t.name,
          description: t.description,
          category: t.category,
          items: t.sections.flatMap(s => s.items.map(item => ({ title: item, section: s.title, checked: false }))),
          sections: t.sections,
        }))
        await supabase.from('checklist_templates').insert(seeds)
        const { data: newTmpl } = await supabase.from('checklist_templates').select('*').order('name')
        setTemplates(newTmpl || [])
      } else {
        setTemplates(tmpl)
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = checklists.filter(c => {
    const ms = !search || c.title?.toLowerCase().includes(search.toLowerCase())
    const mp = projectFilter === 'all' || c.project_id === projectFilter
    const mst = statusFilter === 'all' || c.status === statusFilter
    return ms && mp && mst
  })

  const getProgress = (c) => {
    const items = c.items || []
    if (items.length === 0) return 0
    return Math.round(items.filter(i => i.checked).length / items.length * 100)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newForm.project_id) return alert('Velg et prosjekt')
    setSaving(true)
    try {
      const tmpl = templates.find(t => t.id === newForm.template_id)
      const title = newForm.title || (tmpl ? `${tmpl.name} – ${projects.find(p => p.id === newForm.project_id)?.name}` : 'Ny sjekkliste')
      const items = tmpl ? (tmpl.items || tmpl.sections?.flatMap(s => s.items.map(item => ({ title: typeof item === 'string' ? item : item.title, section: s.title, checked: false }))) || []) : []
      const { data, error } = await supabase.from('checklists').insert({
        title,
        project_id: newForm.project_id,
        template_id: newForm.template_id || null,
        status: 'ikke_startet',
        items,
        created_by: user?.id,
      }).select().single()
      if (error) throw error
      setShowNew(false)
      setNewForm({ project_id: '', template_id: '', title: '' })
      loadData()
      if (data?.id) onNavigateDetail(data.id)
    } catch(e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteChecklist = async (id) => {
    if (!confirm('Slett sjekkliste?')) return
    await supabase.from('checklists').delete().eq('id', id)
    loadData()
  }

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Slett mal?')) return
    await supabase.from('checklist_templates').delete().eq('id', id)
    loadData()
  }

  const handleSaveTemplate = async (tmpl) => {
    setSaving(true)
    try {
      if (editTemplate?.id) {
        await supabase.from('checklist_templates').update(tmpl).eq('id', editTemplate.id)
      } else {
        await supabase.from('checklist_templates').insert(tmpl)
      }
      setShowNewTemplate(false)
      setEditTemplate(null)
      loadData()
    } catch(e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const statusOpts2 = [
    { value: 'all', label: 'Alle statuser' },
    { value: 'ikke_startet', label: 'Ikke startet' },
    { value: 'påbegynt', label: 'Påbegynt' },
    { value: 'fullfort', label: 'Fullført' },
  ]

  const statusBadge = (status) => {
    const map = { ikke_startet: ['#f1f5f9','#475569','Ikke startet'], påbegynt: ['#eff6ff','#2563eb','Påbegynt'], fullfort: ['#ecfdf5','#059669','Fullført'] }
    const [bg, color, label] = map[status] || ['#f1f5f9','#475569', status]
    return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500' }}>{label}</span>
  }

  const groupedTemplates = Object.entries(CATEGORY_LABELS).map(([cat, { label, emoji }]) => ({
    cat, label, emoji,
    templates: templates.filter(t => t.category === cat)
  })).filter(g => g.templates.length > 0)

  const uncategorized = templates.filter(t => !CATEGORY_LABELS[t.category])

  return (
    <div style={f}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>Sjekklister</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>{checklists.length} sjekklister totalt</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {view === 'maler' && <button onClick={() => { setEditTemplate(null); setShowNewTemplate(true) }} style={{ background: 'white', color: '#059669', border: '1px solid #059669', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Ny mal</button>}
            {view === 'lister' && <button onClick={() => setShowNew(true)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Ny sjekkliste</button>}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: '16px', borderBottom: '2px solid #f1f5f9' }}>
          {[{id:'lister',label:'📋 Sjekklister'},{id:'maler',label:'📁 Maler'}].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{ padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: view===tab.id?'600':'400', background: 'transparent', color: view===tab.id?'#059669':'#64748b', borderBottom: view===tab.id?'2px solid #059669':'2px solid transparent', marginBottom: '-2px', fontFamily: 'system-ui, sans-serif' }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {view === 'lister' ? (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk etter sjekkliste..." style={{ ...inp, paddingLeft: '36px' }} />
              </div>
              <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ ...inp, width: '180px', background: 'white' }}>
                <option value="all">Alle prosjekter</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: '160px', background: 'white' }}>
                {statusOpts2.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster sjekklister...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Ingen sjekklister</h3>
                <p style={{ color: '#64748b', margin: '0 0 20px' }}>Opprett din første sjekkliste</p>
                <button onClick={() => setShowNew(true)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Ny sjekkliste</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.map(c => {
                  const progress = getProgress(c)
                  const projectName = projects.find(p => p.id === c.project_id)?.name || '–'
                  return (
                    <button key={c.id} onClick={() => onNavigateDetail(c.id)}
                      style={{ ...card, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>✅</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                          {statusBadge(c.status)}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          <span>📁 {projectName}</span>
                          <span>📝 {c.items?.length || 0} punkter</span>
                          <span>📅 {new Date(c.created_at).toLocaleDateString('nb-NO')}</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#059669' : '#3b82f6', borderRadius: '999px', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>{progress}%</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDeleteChecklist(c.id) }} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>🗑️</button>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* MALER VIEW */
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster maler...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {groupedTemplates.map(group => (
                  <div key={group.cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '20px' }}>{group.emoji}</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{group.label}</span>
                      <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{group.templates.length} maler</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {group.templates.map(tmpl => (
                        <div key={tmpl.id} style={{ ...card, padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div>
                              <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{tmpl.name}</h3>
                              {tmpl.description && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{tmpl.description}</p>}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                            {tmpl.items?.length || tmpl.sections?.reduce((s, sec) => s + (sec.items?.length || 0), 0) || 0} kontrollpunkter
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setShowNew(true) }} style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Bruk mal</button>
                            <button onClick={() => { setEditTemplate(tmpl); setShowNewTemplate(true) }} style={{ background: '#f8fafc', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }}>✏️</button>
                            <button onClick={() => handleDeleteTemplate(tmpl.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {uncategorized.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '20px' }}>📋</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Andre</span>
                      <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {uncategorized.map(tmpl => (
                        <div key={tmpl.id} style={{ ...card, padding: '18px' }}>
                          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{tmpl.name}</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setShowNew(true)} style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Bruk mal</button>
                            <button onClick={() => handleDeleteTemplate(tmpl.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Checklist Modal */}
      {showNew && (
        <>
          <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', borderRadius: '20px', width: 'min(520px, calc(100vw - 32px))', zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Ny sjekkliste</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Prosjekt *</label>
                <select value={newForm.project_id} onChange={e => setNewForm(f => ({...f, project_id: e.target.value}))} required style={{ ...inp, background: 'white' }}>
                  <option value="">Velg prosjekt</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Mal (valgfritt)</label>
                <select value={newForm.template_id} onChange={e => setNewForm(f => ({...f, template_id: e.target.value}))} style={{ ...inp, background: 'white' }}>
                  <option value="">Ingen mal – tom sjekkliste</option>
                  {Object.entries(CATEGORY_LABELS).map(([cat, {label, emoji}]) => {
                    const catTemplates = templates.filter(t => t.category === cat)
                    if (catTemplates.length === 0) return null
                    return (
                      <optgroup key={cat} label={`${emoji} ${label}`}>
                        {catTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Tittel (valgfritt)</label>
                <input value={newForm.title} onChange={e => setNewForm(f => ({...f, title: e.target.value}))} placeholder="Genereres automatisk hvis tom" style={inp} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button type="button" onClick={() => setShowNew(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Avbryt</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>{saving ? 'Oppretter...' : 'Opprett sjekkliste'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* New/Edit Template Modal */}
      {showNewTemplate && (
        <TemplateEditorModal
          template={editTemplate}
          onSave={handleSaveTemplate}
          onClose={() => { setShowNewTemplate(false); setEditTemplate(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

function TemplateEditorModal({ template, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'annet',
    sections: template?.sections || [{ title: 'Seksjon 1', items: [{ title: '', checked: false }] }],
  })

  const addSection = () => setForm(f => ({ ...f, sections: [...f.sections, { title: `Seksjon ${f.sections.length + 1}`, items: [{ title: '', checked: false }] }] }))
  const removeSection = (si) => setForm(f => ({ ...f, sections: f.sections.filter((_, i) => i !== si) }))
  const updateSection = (si, title) => setForm(f => ({ ...f, sections: f.sections.map((s, i) => i === si ? { ...s, title } : s) }))
  const addItem = (si) => setForm(f => ({ ...f, sections: f.sections.map((s, i) => i === si ? { ...s, items: [...(s.items||[]), { title: '', checked: false }] } : s) }))
  const removeItem = (si, ii) => setForm(f => ({ ...f, sections: f.sections.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s) }))
  const updateItem = (si, ii, title) => setForm(f => ({ ...f, sections: f.sections.map((s, i) => i === si ? { ...s, items: s.items.map((item, j) => j === ii ? { ...item, title } : item) } : s) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const items = form.sections.flatMap(s => (s.items||[]).map(item => ({ title: typeof item === 'string' ? item : item.title, section: s.title, checked: false })))
    onSave({ ...form, items })
  }

  const inp2 = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', borderRadius: '20px', width: 'min(620px, calc(100vw - 32px))', maxHeight: '90vh', display: 'flex', flexDirection: 'column', zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>{template ? 'Rediger mal' : 'Ny mal'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#94a3b8' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Malnavn *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Navn på malen" style={inp2} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={{ ...inp2, background: 'white' }}>
                  {Object.entries(CATEGORY_LABELS).map(([k, {label, emoji}]) => <option key={k} value={k}>{emoji} {label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Beskrivelse</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Kort beskrivelse av malen" style={inp2} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Seksjoner og kontrollpunkter</h3>
                <button type="button" onClick={addSection} style={{ background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>+ Seksjon</button>
              </div>
              {form.sections.map((section, si) => (
                <div key={si} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input value={section.title} onChange={e => updateSection(si, e.target.value)} placeholder="Seksjonstittel" style={{ ...inp2, flex: 1, fontWeight: '600' }} />
                    {form.sections.length > 1 && <button type="button" onClick={() => removeSection(si)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}>🗑️</button>}
                  </div>
                  {(section.items||[]).map((item, ii) => (
                    <div key={ii} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input value={typeof item === 'string' ? item : item.title} onChange={e => updateItem(si, ii, e.target.value)} placeholder={`Kontrollpunkt ${ii + 1}`} style={{ ...inp2, flex: 1 }} />
                      <button type="button" onClick={() => removeItem(si, ii)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addItem(si)} style={{ background: 'white', color: '#059669', border: '1px dashed #d1fae5', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', width: '100%', marginTop: '4px' }}>+ Legg til punkt</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Avbryt</button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>{saving ? 'Lagrer...' : 'Lagre mal'}</button>
          </div>
        </form>
      </div>
    </>
  )
}

function SjekklisteDetaljerPage({ checklistId, onBack }) {
  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const f = { fontFamily: 'system-ui, sans-serif' }
  const card = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '24px' }

  const load = async () => {
    try {
      const { data } = await supabase.from('checklists').select('*').eq('id', checklistId).single()
      setChecklist(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [checklistId])

  const toggleItem = async (index) => {
    const newItems = [...(checklist.items || [])]
    newItems[index] = { ...newItems[index], checked: !newItems[index].checked }
    const allDone = newItems.every(i => i.checked)
    const newStatus = allDone ? 'fullfort' : newItems.some(i => i.checked) ? 'påbegynt' : 'ikke_startet'
    const updated = { ...checklist, items: newItems, status: newStatus }
    setChecklist(updated)
    await supabase.from('checklists').update({ items: newItems, status: newStatus }).eq('id', checklistId)
  }

  const updateComment = async (index, comment) => {
    const newItems = [...(checklist.items || [])]
    newItems[index] = { ...newItems[index], comment }
    setChecklist(c => ({ ...c, items: newItems }))
    await supabase.from('checklists').update({ items: newItems }).eq('id', checklistId)
  }

  if (loading) return <div style={{ ...f, textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Laster sjekkliste...</div>
  if (!checklist) return <div style={{ ...f, textAlign: 'center', padding: '60px' }}><button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer' }}>← Tilbake</button></div>

  const items = checklist.items || []
  const checked = items.filter(i => i.checked).length
  const progress = items.length > 0 ? Math.round(checked / items.length * 100) : 0

  // Group items by section
  const sections = {}
  items.forEach((item, idx) => {
    const sec = item.section || 'Generelt'
    if (!sections[sec]) sections[sec] = []
    sections[sec].push({ ...item, idx })
  })

  const statusBadge2 = (status) => {
    const map = { ikke_startet: ['#f1f5f9','#475569','Ikke startet'], påbegynt: ['#eff6ff','#2563eb','Påbegynt'], fullfort: ['#ecfdf5','#059669','Fullført'] }
    const [bg, color, label] = map[status] || ['#f1f5f9','#475569', status]
    return <span style={{ background: bg, color, padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '500' }}>{label}</span>
  }

  return (
    <div style={f}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px', marginBottom: '12px', padding: 0, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>← Tilbake til sjekklister</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{checklist.title}</h1>
              {statusBadge2(checklist.status)}
            </div>
            <div style={{ display: 'flex', align: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>📝 {checked}/{items.length} fullført</span>
              <span>📅 {new Date(checklist.created_at).toLocaleDateString('nb-NO')}</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#059669' : '#3b82f6', borderRadius: '999px', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: progress === 100 ? '#059669' : '#3b82f6', flexShrink: 0 }}>{progress}%</span>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: '800px' }}>
        {Object.entries(sections).map(([sectionTitle, sectionItems]) => (
          <div key={sectionTitle} style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              {sectionTitle}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sectionItems.map(item => (
                <div key={item.idx} style={{ background: 'white', borderRadius: '12px', border: `1px solid ${item.checked ? '#d1fae5' : '#f1f5f9'}`, padding: '14px 16px', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <button onClick={() => toggleItem(item.idx)}
                      style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${item.checked ? '#059669' : '#d1d5db'}`, background: item.checked ? '#059669' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', transition: 'all 0.2s' }}>
                      {item.checked && <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>✓</span>}
                    </button>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '500', color: item.checked ? '#6b7280' : '#0f172a', textDecoration: item.checked ? 'line-through' : 'none' }}>
                        {item.title}
                      </p>
                      <input
                        value={item.comment || ''}
                        onChange={e => updateComment(item.idx, e.target.value)}
                        placeholder="Legg til kommentar..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #f1f5f9', borderRadius: '8px', fontSize: '12px', outline: 'none', background: '#f8fafc', color: '#475569', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}
                        onBlur={e => updateComment(item.idx, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {progress === 100 && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px', padding: '20px', textAlign: 'center', marginTop: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 4px', color: '#059669', fontSize: '16px', fontWeight: '700' }}>Sjekkliste fullført!</h3>
            <p style={{ margin: 0, color: '#065f46', fontSize: '14px' }}>Alle kontrollpunkter er bekreftet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AVVIK MODULE ─────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  'Lav':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
  'Medium':  { bg: '#fffbeb', color: '#d97706', border: '#fde68a', dot: '#f59e0b' },
  'Høy':     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', dot: '#f97316' },
  'Kritisk': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444' },
}

const AVVIK_STATUS_CONFIG = {
  'Åpen':              { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Under behandling':  { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Lukket':            { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG['Medium']
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {severity}
    </span>
  )
}

function AvvikStatusBadge({ status }) {
  const cfg = AVVIK_STATUS_CONFIG[status] || AVVIK_STATUS_CONFIG['Åpen']
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
      {status}
    </span>
  )
}

function AvvikPage() {
  const { user } = useAuth()
  const [deviations, setDeviations] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterSeverity, setFilterSeverity] = useState('alle')
  const [filterProject, setFilterProject] = useState('alle')
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      const [devData, projData] = await Promise.all([
        supabase.from('deviations').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('projects').select('id, name').order('name').then(r => r.data || [])
      ])
      setDeviations(devData)
      setProjects(projData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = deviations.filter(d => {
    if (filterStatus !== 'alle' && d.status !== filterStatus) return false
    if (filterSeverity !== 'alle' && d.severity !== filterSeverity) return false
    if (filterProject !== 'alle' && d.project_id !== filterProject) return false
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    open: deviations.filter(d => d.status === 'Åpen').length,
    inProgress: deviations.filter(d => d.status === 'Under behandling').length,
    closed: deviations.filter(d => d.status === 'Lukket').length,
    critical: deviations.filter(d => d.severity === 'Kritisk' && d.status !== 'Lukket').length,
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #059669', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Laster avvik...</p>
      </div>
    </div>
  )

  if (selected) return (
    <AvvikDetaljer
      deviation={selected}
      projects={projects}
      onBack={() => { setSelected(null); loadData() }}
      user={user}
    />
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>⚠️ Avvik</h1>
            <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px', marginBottom: 0 }}>Registrer, følg opp og lukk avvik</p>
          </div>
          <button onClick={() => setShowNew(true)}
            style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            + Registrer avvik
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Åpne avvik', value: counts.open, color: '#dc2626', bg: '#fef2f2', emoji: '🔴' },
            { label: 'Under behandling', value: counts.inProgress, color: '#d97706', bg: '#fffbeb', emoji: '🟡' },
            { label: 'Lukkede avvik', value: counts.closed, color: '#16a34a', bg: '#f0fdf4', emoji: '🟢' },
            { label: 'Kritiske (åpne)', value: counts.critical, color: '#dc2626', bg: '#fef2f2', emoji: '🚨' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                <span style={{ background: s.bg, color: s.color, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>{s.value}</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søk i avvik..."
            style={{ ...inp, maxWidth: '240px', flex: '1' }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, maxWidth: '180px' }}>
            <option value="alle">Alle statuser</option>
            <option value="Åpen">Åpen</option>
            <option value="Under behandling">Under behandling</option>
            <option value="Lukket">Lukket</option>
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ ...inp, maxWidth: '160px' }}>
            <option value="alle">Alle alvorligheter</option>
            <option value="Lav">Lav</option>
            <option value="Medium">Medium</option>
            <option value="Høy">Høy</option>
            <option value="Kritisk">Kritisk</option>
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ ...inp, maxWidth: '220px' }}>
            <option value="alle">Alle prosjekter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(filterStatus !== 'alle' || filterSeverity !== 'alle' || filterProject !== 'alle' || search) && (
            <button onClick={() => { setFilterStatus('alle'); setFilterSeverity('alle'); setFilterProject('alle'); setSearch('') }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', color: '#64748b', fontWeight: '500' }}>
              Nullstill
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#94a3b8' }}>{filtered.length} avvik</span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>Ingen avvik funnet</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
              {deviations.length === 0 ? 'Ingen avvik er registrert ennå.' : 'Prøv å endre filtervalg.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(dev => {
              const proj = projects.find(p => p.id === dev.project_id)
              return (
                <div key={dev.id} onClick={() => setSelected(dev)}
                  style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', display: 'flex', alignItems: 'flex-start', gap: '16px' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f1f5f9' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: SEVERITY_CONFIG[dev.severity]?.bg || '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {dev.severity === 'Kritisk' ? '🚨' : dev.severity === 'Høy' ? '⚠️' : dev.severity === 'Medium' ? '📋' : '📝'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{dev.title}</span>
                      <SeverityBadge severity={dev.severity} />
                      <AvvikStatusBadge status={dev.status} />
                    </div>
                    {dev.description && <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>{dev.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {proj && <span style={{ fontSize: '12px', color: '#059669', fontWeight: '500' }}>🏗️ {proj.name}</span>}
                      {dev.location && <span style={{ fontSize: '12px', color: '#64748b' }}>📍 {dev.location}</span>}
                      {dev.assigned_to && <span style={{ fontSize: '12px', color: '#64748b' }}>👤 {dev.assigned_to}</span>}
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(dev.created_at).toLocaleDateString('nb-NO')}</span>
                      {dev.images?.length > 0 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>📎 {dev.images.length} bilde{dev.images.length > 1 ? 'r' : ''}</span>}
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '18px', flexShrink: 0 }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNew && (
        <AvvikModal
          projects={projects}
          user={user}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); loadData() }}
        />
      )}
    </div>
  )
}

function AvvikModal({ projects, user, onClose, onSaved, initial }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', location: '', severity: 'Medium',
    project_id: '', assigned_to: '',
  })
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = React.useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }

  const handleFiles = (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    setImages(prev => [...prev, ...imgs])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('Tittel er påkrevd')
    if (!form.project_id) return alert('Velg et prosjekt')
    setUploading(true)
    try {
      const imageUrls = []
      for (const img of images) {
        const ext = img.name.split('.').pop()
        const path = `avvik/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('plattform-files').upload(path, img)
        if (!error) imageUrls.push(path)
      }
      const { error } = await supabase.from('deviations').insert({
        title: form.title.trim(),
        description: form.description,
        location: form.location,
        severity: form.severity,
        project_id: form.project_id,
        assigned_to: form.assigned_to,
        status: 'Åpen',
        images: imageUrls,
        created_by: user?.id,
      })
      if (error) throw error
      onSaved()
    } catch (e) { alert('Feil: ' + e.message) }
    finally { setUploading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>⚠️ Registrer avvik</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ overflowY: 'auto', flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Prosjekt */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Prosjekt *</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={inp} required>
              <option value="">Velg prosjekt...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Tittel */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Tittel *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Kort beskrivelse av avviket" required style={inp} />
          </div>

          {/* Alvorlighetsgrad */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Alvorlighetsgrad</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['Lav', 'Medium', 'Høy', 'Kritisk'].map(s => {
                const cfg = SEVERITY_CONFIG[s]
                const active = form.severity === s
                return (
                  <button key={s} type="button" onClick={() => set('severity', s)}
                    style={{ padding: '9px 4px', borderRadius: '10px', border: `2px solid ${active ? cfg.dot : '#e2e8f0'}`, background: active ? cfg.bg : 'white', color: active ? cfg.color : '#64748b', fontWeight: active ? '700' : '400', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sted og ansvarlig */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Sted / Lokasjon</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="F.eks. 3. etasje, bygg A" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Ansvarlig person</label>
              <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Navn på ansvarlig" style={inp} />
            </div>
          </div>

          {/* Beskrivelse */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Beskrivelse</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beskriv avviket i detalj..." rows={4}
              style={{ ...inp, resize: 'none' }} />
          </div>

          {/* Bilder */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Bilder / Vedlegg</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? '#059669' : '#e2e8f0'}`, borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f0fdf4' : '#f8fafc', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📷</div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Dra bilder hit eller <span style={{ color: '#059669', fontWeight: '600' }}>klikk for å velge</span></p>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={URL.createObjectURL(img)} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                    <button type="button" onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Avbryt</button>
            <button type="submit" disabled={uploading}
              style={{ padding: '10px 24px', background: uploading ? '#6ee7b7' : '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
              {uploading ? 'Lagrer...' : 'Registrer avvik'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AvvikDetaljer({ deviation, projects, onBack, user }) {
  const [dev, setDev] = useState(deviation)
  const [showClose, setShowClose] = useState(false)
  const [closeComment, setCloseComment] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUrls, setImageUrls] = useState([])
  const [lightbox, setLightbox] = useState(null)

  const proj = projects.find(p => p.id === dev.project_id)

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }

  useEffect(() => {
    const loadImages = async () => {
      if (!dev.images?.length) return
      const urls = await Promise.all(dev.images.map(async path => {
        const { data } = await supabase.storage.from('plattform-files').createSignedUrl(path, 3600)
        return data?.signedUrl
      }))
      setImageUrls(urls.filter(Boolean))
    }
    loadImages()
  }, [dev.images])

  const updateStatus = async (newStatus) => {
    setSaving(true)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'Lukket') { updates.closed_at = new Date().toISOString(); updates.close_comment = closeComment }
      const { data, error } = await supabase.from('deviations').update(updates).eq('id', dev.id).select().single()
      if (error) throw error
      setDev(data)
      setShowClose(false)
    } catch (e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Slett dette avviket?')) return
    await supabase.from('deviations').delete().eq('id', dev.id)
    onBack()
  }

  const statusFlow = ['Åpen', 'Under behandling', 'Lukket']
  const currentIdx = statusFlow.indexOf(dev.status)

  const card = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0, fontFamily: 'system-ui, sans-serif' }}>
          ← Tilbake til avvik
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: SEVERITY_CONFIG[dev.severity]?.bg || '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
              {dev.severity === 'Kritisk' ? '🚨' : '⚠️'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{dev.title}</h1>
                <SeverityBadge severity={dev.severity} />
                <AvvikStatusBadge status={dev.status} />
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {proj && <span style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>🏗️ {proj.name}</span>}
                {dev.location && <span style={{ fontSize: '13px', color: '#64748b' }}>📍 {dev.location}</span>}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Registrert {new Date(dev.created_at).toLocaleDateString('nb-NO')}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setShowEdit(true)} style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>✏️ Rediger</button>
            <button onClick={handleDelete} style={{ padding: '9px 12px', border: '1px solid #fecaca', borderRadius: '10px', background: 'white', cursor: 'pointer', color: '#dc2626', fontSize: '13px' }}>🗑️</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Beskrivelse */}
          {dev.description && (
            <div style={card}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>📋 Beskrivelse</h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{dev.description}</p>
            </div>
          )}

          {/* Bilder */}
          {imageUrls.length > 0 && (
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>📷 Bilder ({imageUrls.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {imageUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Avviksbilde ${i+1}`} onClick={() => setLightbox(url)}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', border: '1px solid #f1f5f9', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.target.style.opacity = '0.85'}
                    onMouseLeave={e => e.target.style.opacity = '1'} />
                ))}
              </div>
            </div>
          )}

          {/* Lukkingskommentar */}
          {dev.status === 'Lukket' && dev.close_comment && (
            <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>✅ Lukket avvik</h3>
              <p style={{ margin: '0 0 6px', color: '#166534', fontSize: '14px', lineHeight: 1.6 }}>{dev.close_comment}</p>
              {dev.closed_at && <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>Lukket: {new Date(dev.closed_at).toLocaleDateString('nb-NO')}</p>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Detaljer */}
          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>ℹ️ Detaljer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Alvorlighet', value: <SeverityBadge severity={dev.severity} /> },
                { label: 'Status', value: <AvvikStatusBadge status={dev.status} /> },
                { label: 'Prosjekt', value: proj?.name },
                { label: 'Sted', value: dev.location },
                { label: 'Ansvarlig', value: dev.assigned_to },
                { label: 'Registrert', value: new Date(dev.created_at).toLocaleDateString('nb-NO') },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500', textAlign: 'right', maxWidth: '55%' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status workflow */}
          {dev.status !== 'Lukket' && (
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>🔄 Oppdater status</h3>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                {statusFlow.map((s, i) => (
                  <React.Fragment key={s}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px', background: i <= currentIdx ? '#059669' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: i <= currentIdx ? 'white' : '#94a3b8', fontWeight: '700' }}>
                        {i < currentIdx ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: '10px', color: i <= currentIdx ? '#059669' : '#94a3b8', fontWeight: i === currentIdx ? '700' : '400', lineHeight: 1.2 }}>{s}</div>
                    </div>
                    {i < statusFlow.length - 1 && <div style={{ height: '2px', width: '20px', background: i < currentIdx ? '#059669' : '#e2e8f0', flexShrink: 0 }} />}
                  </React.Fragment>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dev.status === 'Åpen' && (
                  <button onClick={() => updateStatus('Under behandling')} disabled={saving}
                    style={{ padding: '10px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%' }}>
                    🔄 Sett til «Under behandling»
                  </button>
                )}
                <button onClick={() => setShowClose(true)}
                  style={{ padding: '10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%' }}>
                  ✅ Lukk avvik
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lukk avvik modal */}
      {showClose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowClose(false)} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'system-ui, sans-serif' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>✅ Lukk avvik</h3>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '14px' }}>Legg til en kommentar om hva som ble gjort for å lukke avviket.</p>
            <textarea value={closeComment} onChange={e => setCloseComment(e.target.value)} placeholder="Beskriv tiltak som ble gjennomført..." rows={4}
              style={{ ...inp, resize: 'none', marginBottom: '18px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowClose(false)} style={{ padding: '10px 18px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Avbryt</button>
              <button onClick={() => updateStatus('Lukket')} disabled={saving}
                style={{ padding: '10px 20px', background: saving ? '#6ee7b7' : '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
                {saving ? 'Lagrer...' : 'Lukk avvik'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '20px' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
      )}

      {/* Rediger modal */}
      {showEdit && (
        <AvvikEditModal
          dev={dev}
          projects={projects}
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false)
            const { data } = await supabase.from('deviations').select('*').eq('id', dev.id).single()
            if (data) setDev(data)
          }}
        />
      )}
    </div>
  )
}

function AvvikEditModal({ dev, projects, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: dev.title || '',
    description: dev.description || '',
    location: dev.location || '',
    severity: dev.severity || 'Medium',
    project_id: dev.project_id || '',
    assigned_to: dev.assigned_to || '',
    status: dev.status || 'Åpen',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('deviations').update({ ...form, updated_at: new Date().toISOString() }).eq('id', dev.id)
      if (error) throw error
      onSaved()
    } catch (e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>✏️ Rediger avvik</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <form onSubmit={handleSave} style={{ overflowY: 'auto', flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Prosjekt *</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={inp} required>
              <option value="">Velg prosjekt...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Tittel *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Alvorlighetsgrad</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['Lav', 'Medium', 'Høy', 'Kritisk'].map(s => {
                const cfg = SEVERITY_CONFIG[s]
                const active = form.severity === s
                return (
                  <button key={s} type="button" onClick={() => set('severity', s)}
                    style={{ padding: '9px 4px', borderRadius: '10px', border: `2px solid ${active ? cfg.dot : '#e2e8f0'}`, background: active ? cfg.bg : 'white', color: active ? cfg.color : '#64748b', fontWeight: active ? '700' : '400', fontSize: '13px', cursor: 'pointer' }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
              <option value="Åpen">Åpen</option>
              <option value="Under behandling">Under behandling</option>
              <option value="Lukket">Lukket</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Sted</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Ansvarlig</label>
              <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Beskrivelse</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} style={{ ...inp, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Avbryt</button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#6ee7b7' : '#059669', color: 'white', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── END AVVIK MODULE ─────────────────────────────────────────────────────────

// ─── HMS & RISIKO MODULE ──────────────────────────────────────────────────────

const HMS_TYPES = {
  sja:            { label: 'SJA',             fullLabel: 'Sikker Jobb Analyse',         emoji: '🦺', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  ruh:            { label: 'RUH',             fullLabel: 'Rapport om Uønsket Hendelse', emoji: '🚨', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  risiko:         { label: 'Risikoanalyse',   fullLabel: 'Risikoanalyse',               emoji: '📊', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  mottakskontroll:{ label: 'Mottakskontroll', fullLabel: 'Mottakskontroll',             emoji: '📦', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  handbok:        { label: 'HMS-håndbok',     fullLabel: 'HMS-håndbok / Dokumenter',    emoji: '📗', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
}

const HMS_STATUS = {
  'Utkast':   { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  'Aktiv':    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Godkjent': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Arkivert': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
}

function HmsStatusBadge({ status }) {
  const cfg = HMS_STATUS[status] || HMS_STATUS['Utkast']
  return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{status}</span>
}

function HmsTypeBadge({ type }) {
  const cfg = HMS_TYPES[type]
  if (!cfg) return null
  return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{cfg.emoji} {cfg.label}</span>
}

const RISK_LABELS_S = ['1 – Ubetydelig', '2 – Liten', '3 – Moderat', '4 – Alvorlig', '5 – Katastrofal']
const RISK_LABELS_P = ['1 – Svært liten', '2 – Liten', '3 – Mulig', '4 – Sannsynlig', '5 – Svært sannsynlig']
const riskColor = (score) => {
  if (score <= 4)  return { bg: '#f0fdf4', color: '#16a34a', label: 'Lav' }
  if (score <= 9)  return { bg: '#fffbeb', color: '#d97706', label: 'Middels' }
  if (score <= 15) return { bg: '#fff7ed', color: '#ea580c', label: 'Høy' }
  return { bg: '#fef2f2', color: '#dc2626', label: 'Kritisk' }
}

const hmsInp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }
const hmsCard = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

function HmsModalShell({ title, onClose, size, children }) {
  const maxWidth = size === 'xl' ? '860px' : size === 'lg' ? '680px' : '520px'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '20px', width: '100%', maxWidth, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

function HmsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('alle')
  const [filterProject, setFilterProject] = useState('alle')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState(null)
  const [selected, setSelected] = useState(null)

  const loadData = async () => {
    try {
      const [recs, projs] = await Promise.all([
        supabase.from('hms_records').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('projects').select('id, name').order('name').then(r => r.data || [])
      ])
      setRecords(recs); setProjects(projs)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const filtered = records.filter(r => {
    if (activeTab !== 'alle' && r.type !== activeTab) return false
    if (filterProject !== 'alle' && r.project_id !== filterProject) return false
    if (filterStatus !== 'alle' && r.status !== filterStatus) return false
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const counts = Object.keys(HMS_TYPES).reduce((acc, t) => { acc[t] = records.filter(r => r.type === t).length; return acc }, {})

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:'system-ui, sans-serif' }}><div style={{ textAlign:'center' }}><div style={{ width:'36px', height:'36px', border:'3px solid #e2e8f0', borderTop:'3px solid #059669', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/><p style={{ color:'#94a3b8', fontSize:'14px' }}>Laster HMS & Risiko...</p></div></div>
  if (selected) return <HmsDetaljer record={selected} projects={projects} user={user} onBack={() => { setSelected(null); loadData() }} />

  return (
    <div style={{ fontFamily:'system-ui, sans-serif' }}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'24px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'bold', color:'#0f172a', margin:0 }}>🛡️ HMS & Risiko</h1>
            <p style={{ color:'#64748b', marginTop:'4px', fontSize:'14px', marginBottom:0 }}>SJA, RUH, Risikoanalyse, Mottakskontroll og HMS-håndbok</p>
          </div>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowNew(v => !v)} style={{ background:'#059669', color:'white', border:'none', borderRadius:'12px', padding:'11px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>+ Nytt HMS-skjema ▾</button>
            {showNew && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:50 }} onClick={() => setShowNew(false)} />
                <div style={{ position:'absolute', top:'110%', right:0, background:'white', border:'1px solid #e2e8f0', borderRadius:'14px', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:60, minWidth:'240px', padding:'8px' }}>
                  {Object.entries(HMS_TYPES).map(([key, cfg]) => (
                    <button key={key} onClick={() => { setNewType(key); setShowNew(false) }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px', border:'none', borderRadius:'10px', background:'transparent', cursor:'pointer', textAlign:'left' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{ width:'32px', height:'32px', borderRadius:'8px', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>{cfg.emoji}</span>
                      <div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a' }}>{cfg.fullLabel}</div></div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'12px' }}>
          {Object.entries(HMS_TYPES).map(([key, cfg]) => (
            <button key={key} onClick={() => setActiveTab(activeTab === key ? 'alle' : key)}
              style={{ background: activeTab===key ? cfg.bg : 'white', border:`1px solid ${activeTab===key ? cfg.border : '#f1f5f9'}`, borderRadius:'14px', padding:'16px', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ fontSize:'22px', marginBottom:'8px' }}>{cfg.emoji}</div>
              <div style={{ fontSize:'20px', fontWeight:'800', color: activeTab===key ? cfg.color : '#0f172a' }}>{counts[key]}</div>
              <div style={{ fontSize:'11px', color: activeTab===key ? cfg.color : '#94a3b8', fontWeight:'500', marginTop:'2px' }}>{cfg.label}</div>
            </button>
          ))}
        </div>
        <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'14px 18px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søk..." style={{ ...hmsInp, maxWidth:'200px', flex:1 }} />
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ ...hmsInp, maxWidth:'220px' }}>
            <option value="alle">Alle prosjekter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...hmsInp, maxWidth:'160px' }}>
            <option value="alle">Alle statuser</option>
            {Object.keys(HMS_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterProject!=='alle'||filterStatus!=='alle'||search||activeTab!=='alle') && <button onClick={() => { setFilterProject('alle'); setFilterStatus('alle'); setSearch(''); setActiveTab('alle') }} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', cursor:'pointer', color:'#64748b' }}>Nullstill</button>}
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#94a3b8' }}>{filtered.length} skjema</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🛡️</div>
            <h3 style={{ margin:'0 0 6px', color:'#0f172a', fontSize:'16px', fontWeight:'600' }}>Ingen skjemaer funnet</h3>
            <p style={{ margin:0, color:'#94a3b8', fontSize:'14px' }}>{records.length===0 ? 'Opprett ditt første HMS-skjema.' : 'Prøv å endre filtervalg.'}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {filtered.map(rec => {
              const cfg = HMS_TYPES[rec.type]
              const proj = projects.find(p => p.id === rec.project_id)
              return (
                <div key={rec.id} onClick={() => setSelected(rec)}
                  style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:'16px', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:cfg?.bg||'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{cfg?.emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'5px' }}>
                      <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px' }}>{rec.title}</span>
                      <HmsTypeBadge type={rec.type} />
                      <HmsStatusBadge status={rec.status} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
                      {proj && <span style={{ fontSize:'12px', color:'#059669', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                      {rec.data?.dato && <span style={{ fontSize:'12px', color:'#64748b' }}>📅 {rec.data.dato}</span>}
                      <span style={{ fontSize:'12px', color:'#94a3b8' }}>{new Date(rec.created_at).toLocaleDateString('nb-NO')}</span>
                    </div>
                  </div>
                  <span style={{ color:'#94a3b8', fontSize:'18px', flexShrink:0 }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {newType === 'sja'             && <SjaModal            projects={projects} user={user} onClose={() => setNewType(null)} onSaved={() => { setNewType(null); loadData() }} />}
      {newType === 'ruh'             && <RuhModal            projects={projects} user={user} onClose={() => setNewType(null)} onSaved={() => { setNewType(null); loadData() }} />}
      {newType === 'risiko'          && <RisikoModal         projects={projects} user={user} onClose={() => setNewType(null)} onSaved={() => { setNewType(null); loadData() }} />}
      {newType === 'mottakskontroll' && <MottakskontrollModal projects={projects} user={user} onClose={() => setNewType(null)} onSaved={() => { setNewType(null); loadData() }} />}
      {newType === 'handbok'         && <HandbokModal        projects={projects} user={user} onClose={() => setNewType(null)} onSaved={() => { setNewType(null); loadData() }} />}
    </div>
  )
}

function HmsDetaljer({ record: initialRecord, projects, user, onBack }) {
  const [rec, setRec] = useState(initialRecord)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const cfg = HMS_TYPES[rec.type]
  const proj = projects.find(p => p.id === rec.project_id)

  const updateStatus = async (newStatus) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from('hms_records').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', rec.id).select().single()
      if (error) throw error
      setRec(data)
    } catch (e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Slett dette skjemaet?')) return
    await supabase.from('hms_records').delete().eq('id', rec.id)
    onBack()
  }

  const refreshRec = async () => { const { data } = await supabase.from('hms_records').select('*').eq('id', rec.id).single(); if (data) setRec(data) }

  return (
    <div style={{ fontFamily:'system-ui, sans-serif' }}>
      <style>{`@media print { .no-print { display:none !important } }`}</style>
      <div className="no-print" style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>← Tilbake til HMS & Risiko</button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:cfg?.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0 }}>{cfg?.emoji}</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'4px' }}>
                <h1 style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'#0f172a' }}>{rec.title}</h1>
                <HmsTypeBadge type={rec.type} />
                <HmsStatusBadge status={rec.status} />
              </div>
              <div style={{ display:'flex', gap:'14px', flexWrap:'wrap' }}>
                {proj && <span style={{ fontSize:'13px', color:'#059669', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                <span style={{ fontSize:'13px', color:'#94a3b8' }}>Opprettet {new Date(rec.created_at).toLocaleDateString('nb-NO')}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <button onClick={() => window.print()} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>🖨️ Skriv ut</button>
            <button onClick={() => setEditing(true)} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>✏️ Rediger</button>
            <button onClick={handleDelete} style={{ padding:'9px 12px', border:'1px solid #fecaca', borderRadius:'10px', background:'white', cursor:'pointer', color:'#dc2626', fontSize:'13px' }}>🗑️</button>
          </div>
        </div>
      </div>
      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div>
          {rec.type === 'sja'             && <SjaView rec={rec} proj={proj} />}
          {rec.type === 'ruh'             && <RuhView rec={rec} proj={proj} />}
          {rec.type === 'risiko'          && <RisikoView rec={rec} proj={proj} />}
          {rec.type === 'mottakskontroll' && <MottakskontrollView rec={rec} proj={proj} />}
          {rec.type === 'handbok'         && <HandbokView rec={rec} proj={proj} />}
        </div>
        <div className="no-print" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={hmsCard}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🔄 Status</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {Object.keys(HMS_STATUS).map(s => (
                <button key={s} onClick={() => updateStatus(s)} disabled={saving || rec.status === s}
                  style={{ padding:'9px 14px', borderRadius:'10px', border:`1px solid ${rec.status===s ? HMS_STATUS[s].border : '#e2e8f0'}`, background: rec.status===s ? HMS_STATUS[s].bg : 'white', color: rec.status===s ? HMS_STATUS[s].color : '#475569', fontWeight: rec.status===s ? '700':'400', fontSize:'13px', cursor: rec.status===s ? 'default':'pointer', textAlign:'left', width:'100%' }}>
                  {rec.status===s ? '✓ ':''}{s}
                </button>
              ))}
            </div>
          </div>
          <div style={hmsCard}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>ℹ️ Informasjon</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
              {[['Type',cfg?.fullLabel],['Prosjekt',proj?.name],['Dato',rec.data?.dato],['Ansvarlig',rec.data?.ansvarlig],['Opprettet',new Date(rec.created_at).toLocaleDateString('nb-NO')]].filter(r=>r[1]).map(([k,v],i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ fontSize:'12px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'500' }}>{k}</span>
                  <span style={{ fontSize:'13px', color:'#0f172a', fontWeight:'500', textAlign:'right', maxWidth:'55%' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {editing && rec.type==='sja'             && <SjaModal            projects={projects} user={user} initial={rec} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshRec() }} />}
      {editing && rec.type==='ruh'             && <RuhModal            projects={projects} user={user} initial={rec} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshRec() }} />}
      {editing && rec.type==='risiko'          && <RisikoModal         projects={projects} user={user} initial={rec} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshRec() }} />}
      {editing && rec.type==='mottakskontroll' && <MottakskontrollModal projects={projects} user={user} initial={rec} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshRec() }} />}
      {editing && rec.type==='handbok'         && <HandbokModal        projects={projects} user={user} initial={rec} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshRec() }} />}
    </div>
  )
}

function SjaModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title || '')
  const [projectId, setProjectId] = useState(initial?.project_id || '')
  const [dato, setDato] = useState(initial?.data?.dato || new Date().toISOString().split('T')[0])
  const [sted, setSted] = useState(initial?.data?.sted || '')
  const [ansvarlig, setAnsvarlig] = useState(initial?.data?.ansvarlig || '')
  const [arbeidsBeskrivelse, setArbeidsBeskrivelse] = useState(initial?.data?.arbeidsBeskrivelse || '')
  const [utstyr, setUtstyr] = useState(initial?.data?.utstyr || '')
  const [nodNummer, setNodNummer] = useState(initial?.data?.nodNummer || { brann:'110', politi:'112', ambulanse:'113', intern:'' })
  const [operasjoner, setOperasjoner] = useState(initial?.data?.operasjoner || [{ id:Date.now(), operasjon:'', fare:'', konsekvens:'', tiltak:'', sannsynlighet:3, alvorlighet:3 }])
  const [deltakere, setDeltakere] = useState(initial?.data?.deltakere || [{ navn:'', signert:false }])
  const [saving, setSaving] = useState(false)

  const addOp = () => setOperasjoner(o => [...o, { id:Date.now(), operasjon:'', fare:'', konsekvens:'', tiltak:'', sannsynlighet:3, alvorlighet:3 }])
  const removeOp = (id) => setOperasjoner(o => o.filter(x => x.id !== id))
  const updateOp = (id, f, v) => setOperasjoner(o => o.map(x => x.id===id ? { ...x, [f]:v } : x))
  const addDelt = () => setDeltakere(d => [...d, { navn:'', signert:false }])
  const removeDelt = (i) => setDeltakere(d => d.filter((_,idx) => idx!==i))
  const updateDelt = (i, f, v) => setDeltakere(d => d.map((x,idx) => idx===i ? { ...x, [f]:v } : x))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()||!projectId) return alert('Tittel og prosjekt er påkrevd')
    setSaving(true)
    try {
      const payload = { title:title.trim(), project_id:projectId, type:'sja', status:initial?.status||'Utkast', data:{ dato,sted,ansvarlig,arbeidsBeskrivelse,utstyr,nodNummer,operasjoner,deltakere }, updated_at:new Date().toISOString() }
      if (isEdit) { const {error} = await supabase.from('hms_records').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error} = await supabase.from('hms_records').insert({...payload,created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  return (
    <HmsModalShell title={`🦺 ${isEdit?'Rediger':'Ny'} SJA – Sikker Jobb Analyse`} onClose={onClose} size="xl">
      <form onSubmit={handleSave} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Tittel / Jobbtype *</label><input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="F.eks. Arbeid i høyde – takarbeid" style={hmsInp} /></div>
          <div><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Prosjekt *</label><select value={projectId} onChange={e=>setProjectId(e.target.value)} style={hmsInp} required><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Dato</label><input type="date" value={dato} onChange={e=>setDato(e.target.value)} style={hmsInp} /></div>
          <div><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Sted</label><input value={sted} onChange={e=>setSted(e.target.value)} placeholder="Lokasjon" style={hmsInp} /></div>
          <div><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Ansvarlig leder</label><input value={ansvarlig} onChange={e=>setAnsvarlig(e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Arbeidsbeskrivelse</label><textarea value={arbeidsBeskrivelse} onChange={e=>setArbeidsBeskrivelse(e.target.value)} rows={3} style={{ ...hmsInp, resize:'none' }} placeholder="Beskriv arbeidet..." /></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Verneutstyr (PPE)</label><textarea value={utstyr} onChange={e=>setUtstyr(e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Hjelm, sele, refleksvest..." /></div>
        </div>
        <div>
          <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#dc2626' }}>🚨 Nødnummer</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
            {[['brann','🔥 Brann','110'],['politi','👮 Politi','112'],['ambulanse','🚑 Ambulanse','113'],['intern','☎️ Intern','Internnr']].map(([k,lbl,ph]) => (
              <div key={k}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'5px' }}>{lbl}</label><input value={nodNummer[k]} onChange={e=>setNodNummer(v=>({...v,[k]:e.target.value}))} placeholder={ph} style={hmsInp} /></div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>⚙️ Arbeidsoperasjoner og risikovurdering</h3>
            <button type="button" onClick={addOp} style={{ background:'#eff6ff', color:'#2563eb', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til</button>
          </div>
          {operasjoner.map((op,idx) => {
            const score = op.sannsynlighet * op.alvorlighet
            const rc = riskColor(score)
            return (
              <div key={op.id} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', border:'1px solid #f1f5f9', marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:'#64748b' }}>Operasjon {idx+1}</span>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ background:rc.bg, color:rc.color, fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px' }}>Risiko: {score} – {rc.label}</span>
                    {operasjoner.length>1 && <button type="button" onClick={()=>removeOp(op.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Fjern</button>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                  <div style={{ gridColumn:'1/-1' }}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Arbeidsoperasjon</label><input value={op.operasjon} onChange={e=>updateOp(op.id,'operasjon',e.target.value)} placeholder="Hva skal gjøres" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Identifisert fare</label><input value={op.fare} onChange={e=>updateOp(op.id,'fare',e.target.value)} placeholder="Hva kan gå galt?" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Konsekvens</label><input value={op.konsekvens} onChange={e=>updateOp(op.id,'konsekvens',e.target.value)} placeholder="Hva kan skje?" style={hmsInp} /></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Tiltak</label><input value={op.tiltak} onChange={e=>updateOp(op.id,'tiltak',e.target.value)} placeholder="Hva gjøres for å redusere risikoen?" style={hmsInp} /></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Sannsynlighet: <strong>{op.sannsynlighet}</strong>/5</label><input type="range" min="1" max="5" value={op.sannsynlighet} onChange={e=>updateOp(op.id,'sannsynlighet',+e.target.value)} style={{ width:'100%', accentColor:'#2563eb' }} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Alvorlighet: <strong>{op.alvorlighet}</strong>/5</label><input type="range" min="1" max="5" value={op.alvorlighet} onChange={e=>updateOp(op.id,'alvorlighet',+e.target.value)} style={{ width:'100%', accentColor:'#2563eb' }} /></div>
                </div>
              </div>
            )
          })}
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>👷 Deltakere</h3>
            <button type="button" onClick={addDelt} style={{ background:'#eff6ff', color:'#2563eb', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til</button>
          </div>
          {deltakere.map((d,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', background:'#f8fafc', borderRadius:'10px', padding:'10px 14px', marginBottom:'8px' }}>
              <input value={d.navn} onChange={e=>updateDelt(i,'navn',e.target.value)} placeholder={`Deltaker ${i+1} – fullt navn`} style={{ ...hmsInp, flex:1 }} />
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#475569', cursor:'pointer', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={d.signert} onChange={e=>updateDelt(i,'signert',e.target.checked)} style={{ width:'16px', height:'16px', accentColor:'#059669' }} />Signert
              </label>
              {deltakere.length>1 && <button type="button" onClick={()=>removeDelt(i)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>×</button>}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', paddingTop:'4px', borderTop:'1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
          <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett SJA'}</button>
        </div>
      </form>
    </HmsModalShell>
  )
}

function SjaView({ rec, proj }) {
  const d = rec.data || {}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={hmsCard}>
        <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#2563eb' }}>🦺 Sikker Jobb Analyse</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[['Prosjekt',proj?.name],['Dato',d.dato],['Sted',d.sted],['Ansvarlig',d.ansvarlig]].filter(r=>r[1]).map(([k,v]) => (
            <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}><div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div></div>
          ))}
        </div>
        {d.arbeidsBeskrivelse && <p style={{ margin:'0 0 8px', fontSize:'14px', color:'#475569', lineHeight:1.6 }}><strong>Arbeidsbeskrivelse:</strong> {d.arbeidsBeskrivelse}</p>}
        {d.utstyr && <p style={{ margin:0, fontSize:'14px', color:'#475569' }}><strong>Verneutstyr:</strong> {d.utstyr}</p>}
      </div>
      {d.nodNummer && (
        <div style={{ ...hmsCard, background:'#fef2f2', border:'1px solid #fecaca' }}>
          <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#dc2626' }}>🚨 Nødnummer</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
            {[['🔥 Brann',d.nodNummer.brann||'110'],['👮 Politi',d.nodNummer.politi||'112'],['🚑 Ambulanse',d.nodNummer.ambulanse||'113'],['☎️ Intern',d.nodNummer.intern]].filter(r=>r[1]).map(([k,v]) => (
              <div key={k} style={{ background:'white', borderRadius:'8px', padding:'10px', textAlign:'center', border:'1px solid #fecaca' }}><div style={{ fontSize:'11px', color:'#dc2626', fontWeight:'600', marginBottom:'4px' }}>{k}</div><div style={{ fontSize:'18px', fontWeight:'800', color:'#0f172a' }}>{v}</div></div>
            ))}
          </div>
        </div>
      )}
      {d.operasjoner?.length > 0 && (
        <div style={hmsCard}>
          <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>⚙️ Arbeidsoperasjoner</h3>
          {d.operasjoner.map((op,i) => {
            const score = op.sannsynlighet * op.alvorlighet; const rc = riskColor(score)
            return (
              <div key={i} style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px', marginBottom:'8px', border:`1px solid ${rc.bg}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'14px' }}>{op.operasjon||`Operasjon ${i+1}`}</span>
                  <span style={{ background:rc.bg, color:rc.color, fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px' }}>R={score} – {rc.label}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', fontSize:'13px', color:'#475569' }}>
                  {op.fare&&<div><strong>Fare:</strong> {op.fare}</div>}
                  {op.konsekvens&&<div><strong>Konsekvens:</strong> {op.konsekvens}</div>}
                  {op.tiltak&&<div><strong>Tiltak:</strong> {op.tiltak}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {d.deltakere?.length > 0 && (
        <div style={hmsCard}>
          <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>👷 Deltakere ({d.deltakere.length})</h3>
          {d.deltakere.map((del,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', borderRadius:'8px', padding:'9px 14px', marginBottom:'6px' }}>
              <span style={{ fontSize:'14px', fontWeight:'500', color:'#0f172a' }}>{del.navn||`Deltaker ${i+1}`}</span>
              <span style={{ fontSize:'12px', fontWeight:'600', padding:'3px 10px', borderRadius:'999px', background:del.signert?'#f0fdf4':'#f8fafc', color:del.signert?'#16a34a':'#94a3b8', border:`1px solid ${del.signert?'#bbf7d0':'#e2e8f0'}` }}>{del.signert?'✓ Signert':'Ikke signert'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RuhModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title||'')
  const [projectId, setProjectId] = useState(initial?.project_id||'')
  const d0 = initial?.data||{}
  const [form, setForm] = useState({ dato:d0.dato||new Date().toISOString().split('T')[0], tidspunkt:d0.tidspunkt||'', sted:d0.sted||'', ansvarlig:d0.ansvarlig||'', hendelsestype:d0.hendelsestype||'Nestenulykke', involverte:d0.involverte||'', hendelsesBeskrivelse:d0.hendelsesBeskrivelse||'', arsak:d0.arsak||'', skadeomfang:d0.skadeomfang||'', tiltak:d0.tiltak||'', forebyggende:d0.forebyggende||'', vitner:d0.vitner||'', varsletLeder:d0.varsletLeder||false, varsletVerneombud:d0.varsletVerneombud||false, legekontakt:d0.legekontakt||false })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const TYPER = ['Nestenulykke','Personskade','Materielskade','Farlig situasjon','Miljøhendelse','Annet']

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()||!projectId) return alert('Tittel og prosjekt er påkrevd')
    setSaving(true)
    try {
      const payload = { title:title.trim(), project_id:projectId, type:'ruh', status:initial?.status||'Utkast', data:form, updated_at:new Date().toISOString() }
      if (isEdit) { const {error}=await supabase.from('hms_records').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error}=await supabase.from('hms_records').insert({...payload,created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  const lbl = (t) => ({ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' })
  return (
    <HmsModalShell title={`🚨 ${isEdit?'Rediger':'Ny'} RUH – Uønsket Hendelse`} onClose={onClose} size="lg">
      <form onSubmit={handleSave} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Tittel *</label><input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Kort beskrivelse av hendelsen" style={hmsInp} /></div>
          <div><label style={lbl()}>Prosjekt *</label><select value={projectId} onChange={e=>setProjectId(e.target.value)} style={hmsInp} required><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label style={lbl()}>Hendelsestype</label><select value={form.hendelsestype} onChange={e=>set('hendelsestype',e.target.value)} style={hmsInp}>{TYPER.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
          <div><label style={lbl()}>Dato</label><input type="date" value={form.dato} onChange={e=>set('dato',e.target.value)} style={hmsInp} /></div>
          <div><label style={lbl()}>Tidspunkt</label><input type="time" value={form.tidspunkt} onChange={e=>set('tidspunkt',e.target.value)} style={hmsInp} /></div>
          <div><label style={lbl()}>Sted</label><input value={form.sted} onChange={e=>set('sted',e.target.value)} placeholder="Lokasjon" style={hmsInp} /></div>
          <div><label style={lbl()}>Rapportert av</label><input value={form.ansvarlig} onChange={e=>set('ansvarlig',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div><label style={lbl()}>Involverte</label><input value={form.involverte} onChange={e=>set('involverte',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div><label style={lbl()}>Vitner</label><input value={form.vitner} onChange={e=>set('vitner',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Beskrivelse av hendelsen *</label><textarea value={form.hendelsesBeskrivelse} onChange={e=>set('hendelsesBeskrivelse',e.target.value)} rows={4} required style={{ ...hmsInp, resize:'none' }} placeholder="Hva skjedde?" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Årsak</label><textarea value={form.arsak} onChange={e=>set('arsak',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Hva var årsaken?" /></div>
          <div><label style={lbl()}>Skadeomfang</label><textarea value={form.skadeomfang} onChange={e=>set('skadeomfang',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Eventuelle skader..." /></div>
          <div><label style={lbl()}>Umiddelbare tiltak</label><textarea value={form.tiltak} onChange={e=>set('tiltak',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Hva ble gjort?" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Forebyggende tiltak</label><textarea value={form.forebyggende} onChange={e=>set('forebyggende',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Hindre gjentakelse..." /></div>
        </div>
        <div style={{ background:'#fffbeb', borderRadius:'12px', padding:'14px', border:'1px solid #fde68a' }}>
          <h4 style={{ margin:'0 0 10px', fontSize:'13px', fontWeight:'700', color:'#92400e' }}>📢 Varsling</h4>
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
            {[['varsletLeder','Leder varslet'],['varsletVerneombud','Verneombud varslet'],['legekontakt','Legekontakt tatt']].map(([k,lbl]) => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px', color:'#374151' }}>
                <input type="checkbox" checked={form[k]} onChange={e=>set(k,e.target.checked)} style={{ width:'16px', height:'16px', accentColor:'#d97706' }} />{lbl}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
          <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett RUH'}</button>
        </div>
      </form>
    </HmsModalShell>
  )
}

function RuhView({ rec, proj }) {
  const d = rec.data||{}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={hmsCard}>
        <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#dc2626' }}>🚨 Rapport om Uønsket Hendelse</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[['Prosjekt',proj?.name],['Hendelsestype',d.hendelsestype],['Dato',d.dato],['Tidspunkt',d.tidspunkt],['Sted',d.sted],['Rapportert av',d.ansvarlig],['Involverte',d.involverte],['Vitner',d.vitner]].filter(r=>r[1]).map(([k,v]) => (
            <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}><div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div></div>
          ))}
        </div>
        {[['Beskrivelse',d.hendelsesBeskrivelse],['Årsak',d.arsak],['Skadeomfang',d.skadeomfang],['Umiddelbare tiltak',d.tiltak],['Forebyggende tiltak',d.forebyggende]].filter(r=>r[1]).map(([k,v]) => (
          <div key={k} style={{ marginBottom:'10px' }}><div style={{ fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'4px', textTransform:'uppercase' }}>{k}</div><p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6, background:'#f8fafc', borderRadius:'8px', padding:'10px 12px' }}>{v}</p></div>
        ))}
        <div style={{ display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap' }}>
          {[['Leder varslet',d.varsletLeder],['Verneombud varslet',d.varsletVerneombud],['Legekontakt tatt',d.legekontakt]].map(([lbl,val]) => (
            <span key={lbl} style={{ fontSize:'12px', fontWeight:'600', padding:'4px 12px', borderRadius:'999px', background:val?'#f0fdf4':'#f8fafc', color:val?'#16a34a':'#94a3b8', border:`1px solid ${val?'#bbf7d0':'#e2e8f0'}` }}>{val?'✓':'○'} {lbl}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function RisikoModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title||'')
  const [projectId, setProjectId] = useState(initial?.project_id||'')
  const d0 = initial?.data||{}
  const [form, setForm] = useState({ dato:d0.dato||new Date().toISOString().split('T')[0], ansvarlig:d0.ansvarlig||'', omrade:d0.omrade||'', formal:d0.formal||'' })
  const [risikoer, setRisikoer] = useState(d0.risikoer||[{ id:Date.now(), fare:'', arsak:'', konsekvens:'', sannsynlighet:2, konsekvensGrad:2, tiltak:'', restRisiko:'' }])
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const addR = () => setRisikoer(r=>[...r,{ id:Date.now(), fare:'', arsak:'', konsekvens:'', sannsynlighet:2, konsekvensGrad:2, tiltak:'', restRisiko:'' }])
  const removeR = (id) => setRisikoer(r=>r.filter(x=>x.id!==id))
  const updateR = (id,f,v) => setRisikoer(r=>r.map(x=>x.id===id?{...x,[f]:v}:x))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()||!projectId) return alert('Tittel og prosjekt er påkrevd')
    setSaving(true)
    try {
      const payload = { title:title.trim(), project_id:projectId, type:'risiko', status:initial?.status||'Utkast', data:{...form,risikoer}, updated_at:new Date().toISOString() }
      if (isEdit) { const {error}=await supabase.from('hms_records').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error}=await supabase.from('hms_records').insert({...payload,created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }
  const lbl = () => ({ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' })
  return (
    <HmsModalShell title={`📊 ${isEdit?'Rediger':'Ny'} Risikoanalyse`} onClose={onClose} size="xl">
      <form onSubmit={handleSave} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Tittel *</label><input value={title} onChange={e=>setTitle(e.target.value)} required style={hmsInp} placeholder="Navn på risikoanalysen" /></div>
          <div><label style={lbl()}>Prosjekt *</label><select value={projectId} onChange={e=>setProjectId(e.target.value)} style={hmsInp} required><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label style={lbl()}>Dato</label><input type="date" value={form.dato} onChange={e=>set('dato',e.target.value)} style={hmsInp} /></div>
          <div><label style={lbl()}>Område / Aktivitet</label><input value={form.omrade} onChange={e=>set('omrade',e.target.value)} placeholder="F.eks. Gravearbeider" style={hmsInp} /></div>
          <div><label style={lbl()}>Ansvarlig</label><input value={form.ansvarlig} onChange={e=>set('ansvarlig',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Formål</label><textarea value={form.formal} onChange={e=>set('formal',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Formål med analysen..." /></div>
        </div>
        <div style={{ background:'#f5f3ff', borderRadius:'10px', padding:'12px', border:'1px solid #ddd6fe', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:'13px', fontWeight:'700', color:'#7c3aed' }}>📊 Fargekode:</span>
          {[{r:3,l:'Lav'},{r:6,l:'Middels'},{r:12,l:'Høy'},{r:20,l:'Kritisk'}].map(({r,l}) => { const rc=riskColor(r); return <span key={l} style={{ background:rc.bg, color:rc.color, fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px' }}>{l}</span> })}
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>⚠️ Risikoer ({risikoer.length})</h3>
            <button type="button" onClick={addR} style={{ background:'#f5f3ff', color:'#7c3aed', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til</button>
          </div>
          {risikoer.map((r,idx) => {
            const score = r.sannsynlighet * r.konsekvensGrad; const rc = riskColor(score)
            return (
              <div key={r.id} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', border:'1px solid #f1f5f9', marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontWeight:'700', fontSize:'13px', color:'#64748b' }}>Risiko {idx+1}</span>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <span style={{ background:rc.bg, color:rc.color, fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px' }}>R={score} – {rc.label}</span>
                    {risikoer.length>1 && <button type="button" onClick={()=>removeR(r.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Fjern</button>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Fare / Risiko</label><input value={r.fare} onChange={e=>updateR(r.id,'fare',e.target.value)} placeholder="Hva er faren?" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Årsak</label><input value={r.arsak} onChange={e=>updateR(r.id,'arsak',e.target.value)} placeholder="Hva kan forårsake det?" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Konsekvens</label><input value={r.konsekvens} onChange={e=>updateR(r.id,'konsekvens',e.target.value)} placeholder="Hva kan skje?" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Tiltak</label><input value={r.tiltak} onChange={e=>updateR(r.id,'tiltak',e.target.value)} placeholder="Hva gjøres?" style={hmsInp} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Sannsynlighet: <strong>{r.sannsynlighet}</strong>/5</label><input type="range" min="1" max="5" value={r.sannsynlighet} onChange={e=>updateR(r.id,'sannsynlighet',+e.target.value)} style={{ width:'100%', accentColor:'#7c3aed' }} /></div>
                  <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Konsekvensgrad: <strong>{r.konsekvensGrad}</strong>/5</label><input type="range" min="1" max="5" value={r.konsekvensGrad} onChange={e=>updateR(r.id,'konsekvensGrad',+e.target.value)} style={{ width:'100%', accentColor:'#7c3aed' }} /></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Restrisiko etter tiltak</label><input value={r.restRisiko} onChange={e=>updateR(r.id,'restRisiko',e.target.value)} placeholder="Hva er restrisikoen?" style={hmsInp} /></div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
          <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett risikoanalyse'}</button>
        </div>
      </form>
    </HmsModalShell>
  )
}

function RisikoView({ rec, proj }) {
  const d = rec.data||{}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={hmsCard}>
        <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#7c3aed' }}>📊 Risikoanalyse</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[['Prosjekt',proj?.name],['Dato',d.dato],['Område',d.omrade],['Ansvarlig',d.ansvarlig]].filter(r=>r[1]).map(([k,v]) => (
            <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}><div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div></div>
          ))}
        </div>
        {d.formal&&<p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6 }}><strong>Formål:</strong> {d.formal}</p>}
      </div>
      {d.risikoer?.length>0 && (
        <div style={hmsCard}>
          <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>⚠️ Risikoer ({d.risikoer.length})</h3>
          {d.risikoer.map((r,i) => { const score=r.sannsynlighet*r.konsekvensGrad; const rc=riskColor(score); return (
            <div key={i} style={{ borderRadius:'10px', padding:'12px', background:rc.bg, border:`1px solid ${rc.bg}`, marginBottom:'8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'14px' }}>{r.fare||`Risiko ${i+1}`}</span>
                <span style={{ background:'white', color:rc.color, fontSize:'13px', fontWeight:'800', padding:'4px 12px', borderRadius:'999px' }}>R={score} – {rc.label}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', fontSize:'13px', color:'#475569' }}>
                {r.arsak&&<div><strong>Årsak:</strong> {r.arsak}</div>}
                {r.konsekvens&&<div><strong>Konsekvens:</strong> {r.konsekvens}</div>}
                {r.tiltak&&<div><strong>Tiltak:</strong> {r.tiltak}</div>}
              </div>
              <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'6px' }}>S: {r.sannsynlighet}/5 · K: {r.konsekvensGrad}/5 {r.restRisiko&&`· Restrisiko: ${r.restRisiko}`}</div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function MottakskontrollModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title||'')
  const [projectId, setProjectId] = useState(initial?.project_id||'')
  const d0 = initial?.data||{}
  const [form, setForm] = useState({ dato:d0.dato||new Date().toISOString().split('T')[0], leverandor:d0.leverandor||'', ordrenummer:d0.ordrenummer||'', mottattAv:d0.mottattAv||'', sted:d0.sted||'', transportor:d0.transportor||'', fraktseddel:d0.fraktseddel||'', kommentar:d0.kommentar||'' })
  const [varer, setVarer] = useState(d0.varer||[{ id:Date.now(), beskrivelse:'', antall:'', enhet:'stk', bestiltAntall:'', tilstand:'OK', avvik:'' }])
  const [kp, setKp] = useState(d0.kontrollpunkter||[
    {id:1,punkt:'Riktig mengde levert?',svar:null,kommentar:''},
    {id:2,punkt:'Riktig produkt / spesifikasjon?',svar:null,kommentar:''},
    {id:3,punkt:'Fri for synlige skader?',svar:null,kommentar:''},
    {id:4,punkt:'Emballasje i orden?',svar:null,kommentar:''},
    {id:5,punkt:'Samsvarserklæring / dokumentasjon medfølger?',svar:null,kommentar:''},
    {id:6,punkt:'Merking i henhold til krav?',svar:null,kommentar:''},
  ])
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const addVare = () => setVarer(v=>[...v,{id:Date.now(),beskrivelse:'',antall:'',enhet:'stk',bestiltAntall:'',tilstand:'OK',avvik:''}])
  const removeVare = (id) => setVarer(v=>v.filter(x=>x.id!==id))
  const updateVare = (id,f,v) => setVarer(vv=>vv.map(x=>x.id===id?{...x,[f]:v}:x))
  const updateKp = (id,f,v) => setKp(k=>k.map(x=>x.id===id?{...x,[f]:v}:x))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()||!projectId) return alert('Tittel og prosjekt er påkrevd')
    setSaving(true)
    try {
      const payload = { title:title.trim(), project_id:projectId, type:'mottakskontroll', status:initial?.status||'Utkast', data:{...form,varer,kontrollpunkter:kp}, updated_at:new Date().toISOString() }
      if (isEdit) { const {error}=await supabase.from('hms_records').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error}=await supabase.from('hms_records').insert({...payload,created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }
  const lbl = () => ({ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' })
  return (
    <HmsModalShell title={`📦 ${isEdit?'Rediger':'Ny'} Mottakskontroll`} onClose={onClose} size="xl">
      <form onSubmit={handleSave} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Tittel *</label><input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="F.eks. Mottak stål – leveranse 14" style={hmsInp} /></div>
          <div><label style={lbl()}>Prosjekt *</label><select value={projectId} onChange={e=>setProjectId(e.target.value)} style={hmsInp} required><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label style={lbl()}>Dato</label><input type="date" value={form.dato} onChange={e=>set('dato',e.target.value)} style={hmsInp} /></div>
          <div><label style={lbl()}>Leverandør</label><input value={form.leverandor} onChange={e=>set('leverandor',e.target.value)} placeholder="Firmanavn" style={hmsInp} /></div>
          <div><label style={lbl()}>Ordrenummer</label><input value={form.ordrenummer} onChange={e=>set('ordrenummer',e.target.value)} placeholder="Bestillingsnr." style={hmsInp} /></div>
          <div><label style={lbl()}>Mottatt av</label><input value={form.mottattAv} onChange={e=>set('mottattAv',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div><label style={lbl()}>Sted</label><input value={form.sted} onChange={e=>set('sted',e.target.value)} placeholder="Mottakssted" style={hmsInp} /></div>
          <div><label style={lbl()}>Transportør</label><input value={form.transportor} onChange={e=>set('transportor',e.target.value)} placeholder="Fraktselskap" style={hmsInp} /></div>
          <div><label style={lbl()}>Fraktseddel nr.</label><input value={form.fraktseddel} onChange={e=>set('fraktseddel',e.target.value)} placeholder="Nummer" style={hmsInp} /></div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📋 Vareliste</h3>
            <button type="button" onClick={addVare} style={{ background:'#ecfeff', color:'#0891b2', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til</button>
          </div>
          {varer.map((vare,idx) => (
            <div key={vare.id} style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px', border:'1px solid #f1f5f9', marginBottom:'8px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#374151', marginBottom:'3px' }}>Beskrivelse</label><input value={vare.beskrivelse} onChange={e=>updateVare(vare.id,'beskrivelse',e.target.value)} placeholder="Varenavn" style={hmsInp} /></div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#374151', marginBottom:'3px' }}>Bestilt</label><input value={vare.bestiltAntall} onChange={e=>updateVare(vare.id,'bestiltAntall',e.target.value)} placeholder="0" style={hmsInp} /></div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#374151', marginBottom:'3px' }}>Mottatt</label><input value={vare.antall} onChange={e=>updateVare(vare.id,'antall',e.target.value)} placeholder="0" style={hmsInp} /></div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#374151', marginBottom:'3px' }}>Enhet</label><input value={vare.enhet} onChange={e=>updateVare(vare.id,'enhet',e.target.value)} placeholder="stk" style={hmsInp} /></div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#374151', marginBottom:'3px' }}>Tilstand</label><select value={vare.tilstand} onChange={e=>updateVare(vare.id,'tilstand',e.target.value)} style={hmsInp}><option value="OK">✅ OK</option><option value="Avvik">⚠️ Avvik</option><option value="Avvist">❌ Avvist</option></select></div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input value={vare.avvik} onChange={e=>updateVare(vare.id,'avvik',e.target.value)} placeholder="Avvik / kommentar" style={{ ...hmsInp, flex:1 }} />
                {varer.length>1&&<button type="button" onClick={()=>removeVare(vare.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'8px', padding:'9px 12px', cursor:'pointer', fontSize:'12px' }}>Fjern</button>}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>✅ Kontrollpunkter</h3>
          {kp.map(k => (
            <div key={k.id} style={{ background:'#f8fafc', borderRadius:'10px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
              <span style={{ flex:1, fontSize:'13px', color:'#374151', fontWeight:'500' }}>{k.punkt}</span>
              <div style={{ display:'flex', gap:'6px' }}>
                {[['Ja',true,'#16a34a','#f0fdf4'],['Nei',false,'#dc2626','#fef2f2']].map(([l,val,col,bg]) => (
                  <button key={l} type="button" onClick={()=>updateKp(k.id,'svar',k.svar===val?null:val)}
                    style={{ padding:'5px 14px', borderRadius:'8px', border:`1px solid ${k.svar===val?col:'#e2e8f0'}`, background:k.svar===val?bg:'white', color:k.svar===val?col:'#64748b', fontWeight:k.svar===val?'700':'400', fontSize:'13px', cursor:'pointer' }}>{l}
                  </button>
                ))}
              </div>
              <input value={k.kommentar} onChange={e=>updateKp(k.id,'kommentar',e.target.value)} placeholder="Merknad..." style={{ ...hmsInp, width:'160px' }} />
            </div>
          ))}
        </div>
        <div><label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Generell kommentar</label><textarea value={form.kommentar} onChange={e=>set('kommentar',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Andre merknader..." /></div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
          <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett mottakskontroll'}</button>
        </div>
      </form>
    </HmsModalShell>
  )
}

function MottakskontrollView({ rec, proj }) {
  const d = rec.data||{}
  const avvikCount = d.varer?.filter(v=>v.tilstand!=='OK').length||0
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={hmsCard}>
        <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'700', color:'#0891b2' }}>📦 Mottakskontroll</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[['Prosjekt',proj?.name],['Dato',d.dato],['Leverandør',d.leverandor],['Ordrenr.',d.ordrenummer],['Mottatt av',d.mottattAv],['Sted',d.sted],['Transportør',d.transportor],['Fraktseddel',d.fraktseddel]].filter(r=>r[1]).map(([k,v]) => (
            <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}><div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div></div>
          ))}
        </div>
        {avvikCount>0&&<div style={{ background:'#fffbeb', borderRadius:'8px', padding:'9px 14px', border:'1px solid #fde68a', fontSize:'13px', color:'#92400e', fontWeight:'600' }}>⚠️ {avvikCount} vare{avvikCount>1?'r':''} med avvik</div>}
      </div>
      {d.varer?.length>0&&<div style={hmsCard}><h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📋 Vareliste</h3>{d.varer.map((v,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', background:v.tilstand!=='OK'?'#fffbeb':'#f8fafc', borderRadius:'8px', padding:'9px 14px', marginBottom:'6px', border:`1px solid ${v.tilstand!=='OK'?'#fde68a':'#f1f5f9'}` }}><span style={{ flex:1, fontSize:'14px', fontWeight:'500', color:'#0f172a' }}>{v.beskrivelse||`Vare ${i+1}`}</span><span style={{ fontSize:'12px', color:'#64748b' }}>{v.antall}/{v.bestiltAntall||'?'} {v.enhet}</span><span style={{ fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:v.tilstand==='OK'?'#f0fdf4':v.tilstand==='Avvik'?'#fffbeb':'#fef2f2', color:v.tilstand==='OK'?'#16a34a':v.tilstand==='Avvik'?'#d97706':'#dc2626' }}>{v.tilstand}</span>{v.avvik&&<span style={{ fontSize:'12px', color:'#64748b' }}>{v.avvik}</span>}</div>)}</div>}
      {d.kontrollpunkter?.length>0&&<div style={hmsCard}><h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>✅ Kontrollpunkter</h3>{d.kontrollpunkter.map((kp,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f8fafc', borderRadius:'8px', marginBottom:'4px' }}><span style={{ fontSize:'16px' }}>{kp.svar===true?'✅':kp.svar===false?'❌':'⬜'}</span><span style={{ flex:1, fontSize:'13px', color:'#374151' }}>{kp.punkt}</span>{kp.kommentar&&<span style={{ fontSize:'12px', color:'#94a3b8', fontStyle:'italic' }}>{kp.kommentar}</span>}</div>)}</div>}
      {d.kommentar&&<div style={hmsCard}><h4 style={{ margin:'0 0 6px', fontSize:'13px', fontWeight:'700', color:'#374151' }}>Kommentar</h4><p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6 }}>{d.kommentar}</p></div>}
    </div>
  )
}

function HandbokModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title||'')
  const [projectId, setProjectId] = useState(initial?.project_id||'')
  const d0 = initial?.data||{}
  const [form, setForm] = useState({ dato:d0.dato||new Date().toISOString().split('T')[0], versjon:d0.versjon||'1.0', ansvarlig:d0.ansvarlig||'', formal:d0.formal||'', omfang:d0.omfang||'', malsetning:d0.malsetning||'' })
  const [seksjoner, setSeksjoner] = useState(d0.seksjoner||[
    {id:1,tittel:'HMS-policy',innhold:''},
    {id:2,tittel:'Organisasjon og ansvar',innhold:''},
    {id:3,tittel:'Risikovurdering',innhold:''},
    {id:4,tittel:'Verneutstyr (PPE)',innhold:''},
    {id:5,tittel:'Beredskapsplan',innhold:''},
  ])
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const addSeksjon = () => setSeksjoner(s=>[...s,{id:Date.now(),tittel:'',innhold:''}])
  const removeSeksjon = (id) => setSeksjoner(s=>s.filter(x=>x.id!==id))
  const updateSeksjon = (id,f,v) => setSeksjoner(s=>s.map(x=>x.id===id?{...x,[f]:v}:x))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()||!projectId) return alert('Tittel og prosjekt er påkrevd')
    setSaving(true)
    try {
      const payload = { title:title.trim(), project_id:projectId, type:'handbok', status:initial?.status||'Utkast', data:{...form,seksjoner}, updated_at:new Date().toISOString() }
      if (isEdit) { const {error}=await supabase.from('hms_records').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error}=await supabase.from('hms_records').insert({...payload,created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }
  const lbl = () => ({ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' })
  return (
    <HmsModalShell title={`📗 ${isEdit?'Rediger':'Ny'} HMS-håndbok`} onClose={onClose} size="xl">
      <form onSubmit={handleSave} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Tittel *</label><input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="F.eks. HMS-håndbok – Prosjekt X 2025" style={hmsInp} /></div>
          <div><label style={lbl()}>Prosjekt *</label><select value={projectId} onChange={e=>setProjectId(e.target.value)} style={hmsInp} required><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label style={lbl()}>Dato</label><input type="date" value={form.dato} onChange={e=>set('dato',e.target.value)} style={hmsInp} /></div>
          <div><label style={lbl()}>Versjon</label><input value={form.versjon} onChange={e=>set('versjon',e.target.value)} placeholder="1.0" style={hmsInp} /></div>
          <div><label style={lbl()}>HMS-ansvarlig</label><input value={form.ansvarlig} onChange={e=>set('ansvarlig',e.target.value)} placeholder="Navn" style={hmsInp} /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl()}>Formål</label><textarea value={form.formal} onChange={e=>set('formal',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Formålet med HMS-håndboken..." /></div>
          <div><label style={lbl()}>Omfang</label><textarea value={form.omfang} onChange={e=>set('omfang',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Hvem gjelder håndboken for?" /></div>
          <div><label style={lbl()}>HMS-målsetning</label><textarea value={form.malsetning} onChange={e=>set('malsetning',e.target.value)} rows={2} style={{ ...hmsInp, resize:'none' }} placeholder="Bedriftens HMS-målsetninger..." /></div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📄 Seksjoner ({seksjoner.length})</h3>
            <button type="button" onClick={addSeksjon} style={{ background:'#ecfdf5', color:'#059669', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til seksjon</button>
          </div>
          {seksjoner.map((s,idx) => (
            <div key={s.id} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', border:'1px solid #f1f5f9', marginBottom:'10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <span style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#ecfdf5', color:'#059669', fontSize:'12px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{idx+1}</span>
                <input value={s.tittel} onChange={e=>updateSeksjon(s.id,'tittel',e.target.value)} placeholder="Seksjonstittel" style={{ ...hmsInp, flex:1 }} />
                {seksjoner.length>1&&<button type="button" onClick={()=>removeSeksjon(s.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'8px', padding:'7px 12px', cursor:'pointer', fontSize:'12px' }}>Fjern</button>}
              </div>
              <textarea value={s.innhold} onChange={e=>updateSeksjon(s.id,'innhold',e.target.value)} placeholder="Skriv innhold for denne seksjonen..." rows={4} style={{ ...hmsInp, resize:'vertical' }} />
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
          <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett HMS-håndbok'}</button>
        </div>
      </form>
    </HmsModalShell>
  )
}

function HandbokView({ rec, proj }) {
  const d = rec.data||{}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={hmsCard}>
        <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#059669' }}>📗 HMS-håndbok</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[['Prosjekt',proj?.name],['Dato',d.dato],['Versjon',d.versjon],['HMS-ansvarlig',d.ansvarlig]].filter(r=>r[1]).map(([k,v]) => (
            <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}><div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div><div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div></div>
          ))}
        </div>
        {[['Formål',d.formal],['Omfang',d.omfang],['HMS-målsetning',d.malsetning]].filter(r=>r[1]).map(([k,v]) => (
          <div key={k} style={{ marginBottom:'10px' }}><div style={{ fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'4px', textTransform:'uppercase' }}>{k}</div><p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6 }}>{v}</p></div>
        ))}
      </div>
      {d.seksjoner?.length>0&&d.seksjoner.map((s,i) => (
        <div key={i} style={hmsCard}>
          <h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>{i+1}. {s.tittel}</h3>
          <p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{s.innhold||<span style={{ color:'#94a3b8', fontStyle:'italic' }}>Ingen innhold</span>}</p>
        </div>
      ))}
    </div>
  )
}

// ─── END HMS MODULE ───────────────────────────────────────────────────────────


// ─── MASKIN MODULE ────────────────────────────────────────────────────────────

const MASKIN_STATUS = {
  'På lager':    { emoji: '🏭', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'På prosjekt': { emoji: '🏗️', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Service':     { emoji: '🔧', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Utrangert':   { emoji: '🚫', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
}

const MASKIN_KATEGORIER = {
  'Maskin / Kjøretøy': [
    'Gravemaskin','Hjullaster','Dumper','Minidumper','Truck','Teleskoptruck',
    'Kompaktlaster','Vals','Asfaltlegger','Traktor','Kran','Mobilkran','Annet kjøretøy'
  ],
  'Håndverktøy / Elektroverktøy': [
    'Slagborrmaskin','Kjedeborrmaskin','Piggemaskin','Vinkelsliper','Rundsag',
    'Stikksag','Boremaskin','Spikerpistol','Sliperimaskin','Høvlemaskin',
    'Fresmaskin','Betongsag','Kjernebormaskin','Nivelleringslaser',
    'Rotasjonslaser','Multimeter','Varmepistol','Annet håndverktøy'
  ],
  'Stillas / Løfteutstyr': [
    'Rullestillas','Fasadestillas','Hengestillas','Klaffestillas',
    'Sakselift','Teleskoplift','Personheis','Materialheismaskin',
    'Stativkran','Talje','Annet løfteutstyr'
  ],
  'Maling / Overflatebehandling': [
    'Malingspumpe','Airless-sprøyte','Kompressor','Sandblåser',
    'Høytrykksspyler','Dampvasker','Gulvsliper','Annet maleutstyr'
  ],
  'Annet utstyr': [
    'Generator','Lysmast','Varmekanon','Tørkeaggregat','Pumpe',
    'Vannpumpe','Betongblandemaskin','Betongvibrator','Annet'
  ],
}

const mInp = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', boxSizing:'border-box', background:'white', color:'#0f172a', fontFamily:'system-ui, sans-serif' }
const mCard = { background:'white', borderRadius:'16px', border:'1px solid #f1f5f9', padding:'20px 24px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }

function MaskinStatusBadge({ status }) {
  const cfg = MASKIN_STATUS[status] || MASKIN_STATUS['På lager']
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' }}>{cfg.emoji} {status}</span>
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000*60*60*24))
}

function ServiceBadge({ date }) {
  if (!date) return null
  const days = daysUntil(date)
  let bg='#f0fdf4', color='#16a34a', label=`Service om ${days}d`
  if (days < 0)       { bg='#fef2f2'; color='#dc2626'; label=`Forfalt ${Math.abs(days)}d siden` }
  else if (days <= 14){ bg='#fef2f2'; color='#dc2626'; label=`Service om ${days}d` }
  else if (days <= 30){ bg='#fffbeb'; color='#d97706'; label=`Service om ${days}d` }
  return <span style={{ background:bg, color, padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', border:`1px solid ${bg}` }}>🔧 {label}</span>
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
function MaskinPage() {
  const { user } = useAuth()
  const [maskiner, setMaskiner] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterKat, setFilterKat] = useState('alle')
  const [search, setSearch] = useState('')
  const [visning, setVisning] = useState('liste') // 'liste' | 'rutenett'
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    try {
      const [m, p] = await Promise.all([
        supabase.from('machines').select('*').order('name').then(r => r.data||[]),
        supabase.from('projects').select('id,name').order('name').then(r => r.data||[])
      ])
      setMaskiner(m); setProjects(p)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = maskiner.filter(m => {
    if (filterStatus !== 'alle' && m.status !== filterStatus) return false
    if (filterKat !== 'alle' && m.category !== filterKat) return false
    if (search && ![m.name,m.brand,m.model,m.serial_number].some(v=>v?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const counts = Object.keys(MASKIN_STATUS).reduce((acc,s) => { acc[s]=maskiner.filter(m=>m.status===s).length; return acc }, {})
  const serviceAlert = maskiner.filter(m => m.next_service && daysUntil(m.next_service) <= 30).length

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',fontFamily:'system-ui,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'36px',height:'36px',border:'3px solid #e2e8f0',borderTop:'3px solid #059669',borderRadius:'50%',margin:'0 auto 12px',animation:'spin 1s linear infinite' }}/>
        <p style={{ color:'#94a3b8',fontSize:'14px' }}>Laster maskiner...</p>
      </div>
    </div>
  )

  if (selected) return <MaskinDetaljer maskin={selected} projects={projects} user={user} onBack={() => { setSelected(null); load() }} />

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'24px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'bold', color:'#0f172a', margin:0 }}>🚜 Maskinregister</h1>
            <p style={{ color:'#64748b', marginTop:'4px', fontSize:'14px', marginBottom:0 }}>Oversikt, lokasjon, service og hendelseslogg for alt utstyr</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ background:'#059669', color:'white', border:'none', borderRadius:'12px', padding:'11px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>+ Ny maskin</button>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Status stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
          {Object.entries(MASKIN_STATUS).map(([s,cfg]) => (
            <button key={s} onClick={() => setFilterStatus(filterStatus===s?'alle':s)}
              style={{ background:filterStatus===s?cfg.bg:'white', border:`1px solid ${filterStatus===s?cfg.border:'#f1f5f9'}`, borderRadius:'14px', padding:'16px', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ fontSize:'22px', marginBottom:'8px' }}>{cfg.emoji}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', color:filterStatus===s?cfg.color:'#0f172a' }}>{counts[s]||0}</div>
              <div style={{ fontSize:'11px', color:filterStatus===s?cfg.color:'#94a3b8', fontWeight:'500', marginTop:'2px' }}>{s}</div>
            </button>
          ))}
        </div>

        {serviceAlert > 0 && (
          <div style={{ background:'#fffbeb', borderRadius:'12px', padding:'14px 18px', border:'1px solid #fde68a', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px' }}>⚠️</span>
            <span style={{ fontSize:'14px', fontWeight:'600', color:'#92400e' }}>{serviceAlert} maskin{serviceAlert>1?'er':''} har service innen 30 dager</span>
          </div>
        )}

        {/* Filters + visningsvalg */}
        <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'14px 18px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Søk navn, merke, serienr..." style={{ ...mInp, maxWidth:'240px', flex:1 }} />
          <select value={filterKat} onChange={e=>setFilterKat(e.target.value)} style={{ ...mInp, maxWidth:'220px' }}>
            <option value="alle">Alle kategorier</option>
            {Object.keys(MASKIN_KATEGORIER).map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          {(filterStatus!=='alle'||filterKat!=='alle'||search) && (
            <button onClick={()=>{setFilterStatus('alle');setFilterKat('alle');setSearch('')}} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', cursor:'pointer', color:'#64748b' }}>Nullstill</button>
          )}
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#94a3b8' }}>{filtered.length} maskiner</span>
          {/* Visningsknapper */}
          <div style={{ display:'flex', border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
            <button onClick={()=>setVisning('liste')} style={{ padding:'8px 14px', border:'none', background:visning==='liste'?'#f1f5f9':'white', cursor:'pointer', fontSize:'16px', color:visning==='liste'?'#059669':'#94a3b8' }} title="Listevisning">☰</button>
            <button onClick={()=>setVisning('rutenett')} style={{ padding:'8px 14px', border:'none', borderLeft:'1px solid #e2e8f0', background:visning==='rutenett'?'#f1f5f9':'white', cursor:'pointer', fontSize:'16px', color:visning==='rutenett'?'#059669':'#94a3b8' }} title="Rutenettvisning">⊞</button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🚜</div>
            <h3 style={{ margin:'0 0 6px', color:'#0f172a' }}>Ingen maskiner funnet</h3>
            <p style={{ margin:0, color:'#94a3b8', fontSize:'14px' }}>{maskiner.length===0?'Legg til din første maskin.':'Prøv å endre filtervalg.'}</p>
          </div>
        )}

        {/* LISTEVISNING */}
        {visning === 'liste' && filtered.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filtered.map(m => {
              const cfg = MASKIN_STATUS[m.status]
              const proj = projects.find(p=>p.id===m.current_project_id)
              return (
                <div key={m.id} onClick={()=>setSelected(m)}
                  style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'14px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:'16px', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:cfg?.bg||'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{cfg?.emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'3px' }}>
                      <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px' }}>{m.name}</span>
                      <MaskinStatusBadge status={m.status} />
                      {m.next_service && <ServiceBadge date={m.next_service} />}
                    </div>
                    <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                      {m.category && <span style={{ fontSize:'12px', color:'#64748b' }}>📋 {m.category}</span>}
                      {m.type && <span style={{ fontSize:'12px', color:'#64748b' }}>🔩 {m.type}</span>}
                      {m.brand && <span style={{ fontSize:'12px', color:'#64748b' }}>🏷️ {m.brand}{m.model?` ${m.model}`:''}</span>}
                      {m.serial_number && <span style={{ fontSize:'12px', color:'#64748b' }}>🔢 {m.serial_number}</span>}
                      {proj && <span style={{ fontSize:'12px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                    </div>
                  </div>
                  <span style={{ color:'#94a3b8', fontSize:'18px', flexShrink:0 }}>›</span>
                </div>
              )
            })}
          </div>
        )}

        {/* RUTENETTVISNING */}
        {visning === 'rutenett' && filtered.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px' }}>
            {filtered.map(m => {
              const cfg = MASKIN_STATUS[m.status]
              const proj = projects.find(p=>p.id===m.current_project_id)
              const days = m.next_service ? daysUntil(m.next_service) : null
              return (
                <div key={m.id} onClick={()=>setSelected(m)}
                  style={{ background:'white', borderRadius:'16px', border:`1px solid ${days!==null&&days<=14?'#fecaca':days!==null&&days<=30?'#fde68a':'#f1f5f9'}`, padding:'18px', cursor:'pointer', display:'flex', flexDirection:'column', gap:'12px', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:cfg?.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>{cfg?.emoji}</div>
                    <MaskinStatusBadge status={m.status} />
                  </div>
                  <div>
                    <div style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px', marginBottom:'4px' }}>{m.name}</div>
                    {m.category && <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'2px' }}>{m.category}</div>}
                    {m.type && <div style={{ fontSize:'12px', color:'#64748b' }}>{m.type}</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    {m.brand && <div style={{ fontSize:'12px', color:'#64748b' }}>🏷️ {m.brand}{m.model?` ${m.model}`:''}</div>}
                    {proj && <div style={{ fontSize:'12px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</div>}
                    {m.next_service && <ServiceBadge date={m.next_service} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNew && <MaskinModal projects={projects} user={user} onClose={()=>setShowNew(false)} onSaved={()=>{setShowNew(false);load()}} />}
    </div>
  )
}

function MaskinDetaljer({ maskin: init, projects, user, onBack }) {
  const [m, setM] = useState(init)
  const [logs, setLogs] = useState([])
  const [editing, setEditing] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const cfg = MASKIN_STATUS[m.status]
  const proj = projects.find(p=>p.id===m.current_project_id)

  const loadLogs = async () => {
    const { data } = await supabase.from('machine_logs').select('*').eq('machine_id', m.id).order('created_at', { ascending:false })
    setLogs(data||[])
  }
  const refreshM = async () => {
    const { data } = await supabase.from('machines').select('*').eq('id', m.id).single()
    if (data) setM(data)
  }
  useEffect(() => { loadLogs() }, [])

  const handleDelete = async () => {
    if (!confirm('Slett denne maskinen og all logg?')) return
    await supabase.from('machines').delete().eq('id', m.id)
    onBack()
  }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>← Tilbake til maskiner</button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:cfg?.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0 }}>{cfg?.emoji}</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'4px' }}>
                <h1 style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'#0f172a' }}>{m.name}</h1>
                <MaskinStatusBadge status={m.status} />
                {m.next_service && <ServiceBadge date={m.next_service} />}
              </div>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                {m.category && <span style={{ fontSize:'13px', color:'#64748b' }}>📋 {m.category}</span>}
                {m.type && <span style={{ fontSize:'13px', color:'#64748b' }}>🔩 {m.type}</span>}
                {m.brand && <span style={{ fontSize:'13px', color:'#64748b' }}>🏷️ {m.brand} {m.model}</span>}
                {proj && <span style={{ fontSize:'13px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <button onClick={()=>setShowStatusModal(true)} style={{ padding:'9px 16px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>🔄 Endre status</button>
            <button onClick={()=>setEditing(true)} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>✏️ Rediger</button>
            <button onClick={handleDelete} style={{ padding:'9px 12px', border:'1px solid #fecaca', borderRadius:'10px', background:'white', cursor:'pointer', color:'#dc2626', fontSize:'13px' }}>🗑️</button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={mCard}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📋 Maskininformasjon</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[['Kategori',m.category],['Type',m.type],['Merke',m.brand],['Modell',m.model],['Serienummer',m.serial_number],['Årsmodell',m.year],['Siste service',m.last_service],['Neste service',m.next_service],['Prosjekt',proj?.name]].filter(r=>r[1]).map(([k,v])=>(
                <div key={k} style={{ background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}>
                  <div style={{ fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'600' }}>{k}</div>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', marginTop:'2px' }}>{v}</div>
                </div>
              ))}
            </div>
            {m.notes && <p style={{ margin:'12px 0 0', fontSize:'14px', color:'#475569', lineHeight:1.6, background:'#f8fafc', borderRadius:'8px', padding:'10px 12px' }}>{m.notes}</p>}
          </div>

          <div style={mCard}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📜 Hendelseslogg ({logs.length})</h3>
            {logs.length===0 ? (
              <p style={{ margin:0, color:'#94a3b8', fontSize:'14px', fontStyle:'italic' }}>Ingen loggede hendelser ennå</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {logs.map((log,i) => {
                  const toCfg = MASKIN_STATUS[log.to_status]
                  return (
                    <div key={log.id} style={{ display:'flex', gap:'12px', paddingBottom:'14px', paddingTop:i>0?'14px':'0', borderTop:i>0?'1px solid #f8fafc':'none' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:toCfg?.bg||'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>{toCfg?.emoji||'📌'}</div>
                        {i < logs.length-1 && <div style={{ width:'2px', flex:1, background:'#f1f5f9', marginTop:'4px' }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:'600', fontSize:'13px', color:'#0f172a', marginBottom:'2px' }}>{log.action}</div>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'2px' }}>
                          {log.from_status && log.to_status && <span style={{ fontSize:'12px', color:'#64748b' }}>{log.from_status} → <strong style={{ color:toCfg?.color }}>{log.to_status}</strong></span>}
                          {log.employee_name && <span style={{ fontSize:'12px', color:'#64748b' }}>👤 {log.employee_name}</span>}
                        </div>
                        {log.notes && <p style={{ margin:'2px 0 0', fontSize:'12px', color:'#94a3b8', lineHeight:1.5 }}>{log.notes}</p>}
                        <div style={{ fontSize:'11px', color:'#cbd5e1', marginTop:'4px' }}>{new Date(log.created_at).toLocaleString('nb-NO')}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={mCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>📍 Lokasjon</h3>
            <div style={{ background:cfg?.bg, borderRadius:'12px', padding:'16px', textAlign:'center', border:`1px solid ${cfg?.border}` }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>{cfg?.emoji}</div>
              <div style={{ fontWeight:'700', color:cfg?.color, fontSize:'16px' }}>{m.status}</div>
              {proj && <div style={{ fontSize:'13px', color:'#64748b', marginTop:'6px' }}>📍 {proj.name}</div>}
            </div>
          </div>

          {m.next_service && (
            <div style={{ ...mCard, background:daysUntil(m.next_service)<=14?'#fef2f2':daysUntil(m.next_service)<=30?'#fffbeb':'white', border:`1px solid ${daysUntil(m.next_service)<=14?'#fecaca':daysUntil(m.next_service)<=30?'#fde68a':'#f1f5f9'}` }}>
              <h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🔧 Service</h3>
              <div style={{ fontSize:'13px', color:'#64748b' }}>Neste service:</div>
              <div style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px', margin:'3px 0 6px' }}>{m.next_service}</div>
              <ServiceBadge date={m.next_service} />
              {m.last_service && <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'8px' }}>Siste: {m.last_service}</div>}
            </div>
          )}
        </div>
      </div>

      {editing && <MaskinModal projects={projects} user={user} initial={m} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);refreshM();loadLogs()}} />}
      {showStatusModal && <StatusEndringsModal maskin={m} projects={projects} user={user} onClose={()=>setShowStatusModal(false)} onSaved={async()=>{setShowStatusModal(false);await refreshM();await loadLogs()}} />}
    </div>
  )
}

function StatusEndringsModal({ maskin, projects, user, onClose, onSaved }) {
  const [newStatus, setNewStatus] = useState(maskin.status)
  const [projectId, setProjectId] = useState(maskin.current_project_id||'')
  const [employeeName, setEmployeeName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = { status:newStatus, updated_at:new Date().toISOString() }
      updates.current_project_id = newStatus==='På prosjekt' ? (projectId||null) : null
      const { error:mErr } = await supabase.from('machines').update(updates).eq('id', maskin.id)
      if (mErr) throw mErr

      const proj = projects.find(p=>p.id===projectId)
      let action = `Status endret til ${newStatus}`
      if (newStatus==='På prosjekt'&&proj) action = `Sendt til ${proj.name}`
      else if (newStatus==='På lager') action = 'Returnert til lager'
      else if (newStatus==='Service') action = 'Sendt til service'
      else if (newStatus==='Utrangert') action = 'Merket som utrangert'

      await supabase.from('machine_logs').insert({ machine_id:maskin.id, action, from_status:maskin.status, to_status:newStatus, project_id:newStatus==='På prosjekt'?(projectId||null):null, employee_name:employeeName||null, notes:notes||null, created_by:user?.id })
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>🔄 Endre status – {maskin.name}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'8px' }}>Ny status</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {Object.entries(MASKIN_STATUS).map(([s,cfg]) => (
                <button key={s} type="button" onClick={()=>setNewStatus(s)}
                  style={{ padding:'12px', borderRadius:'12px', border:`2px solid ${newStatus===s?cfg.border:'#e2e8f0'}`, background:newStatus===s?cfg.bg:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'20px' }}>{cfg.emoji}</span>
                  <span style={{ fontWeight:newStatus===s?'700':'500', color:newStatus===s?cfg.color:'#475569', fontSize:'13px' }}>{s}</span>
                </button>
              ))}
            </div>
          </div>
          {newStatus==='På prosjekt' && (
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Prosjekt</label>
              <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={mInp}>
                <option value="">Velg prosjekt...</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>👤 Ansatt (henter/leverer)</label>
            <input value={employeeName} onChange={e=>setEmployeeName(e.target.value)} placeholder="Navn på ansatt" style={mInp} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Merknad</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Eventuelle merknader..." style={{ ...mInp, resize:'none' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
            <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
            <button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':'Bekreft endring'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MaskinModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name: initial?.name||'', category: initial?.category||'', type: initial?.type||'',
    brand: initial?.brand||'', model: initial?.model||'', serial_number: initial?.serial_number||'',
    year: initial?.year||'', current_project_id: initial?.current_project_id||'',
    last_service: initial?.last_service||'', next_service: initial?.next_service||'',
    notes: initial?.notes||'', status: initial?.status||'På lager',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  // When category changes, reset type
  const setCategory = (cat) => setForm(f=>({...f, category:cat, type:''}))

  const availableTypes = form.category ? MASKIN_KATEGORIER[form.category]||[] : []

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('Navn er påkrevd')
    setSaving(true)
    try {
      const payload = {
        name:form.name.trim(), category:form.category||null, type:form.type||null,
        brand:form.brand||null, model:form.model||null, serial_number:form.serial_number||null,
        year:form.year?parseInt(form.year):null,
        current_project_id:form.status==='På prosjekt'?(form.current_project_id||null):null,
        last_service:form.last_service||null, next_service:form.next_service||null,
        notes:form.notes||null, status:form.status, updated_at:new Date().toISOString(),
      }
      if (isEdit) {
        const {error} = await supabase.from('machines').update(payload).eq('id', initial.id)
        if (error) throw error
        if (form.status !== initial.status) {
          await supabase.from('machine_logs').insert({ machine_id:initial.id, action:`Status endret til ${form.status}`, from_status:initial.status, to_status:form.status, created_by:user?.id })
        }
      } else {
        const {data, error} = await supabase.from('machines').insert(payload).select().single()
        if (error) throw error
        await supabase.from('machine_logs').insert({ machine_id:data.id, action:'Maskin registrert', to_status:form.status, created_by:user?.id })
      }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  const lbl = (t) => <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>{t}</label>

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'680px', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>🚜 {isEdit?'Rediger':'Registrer ny'} maskin</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <form onSubmit={handleSave} style={{ overflowY:'auto', flex:1, padding:'24px', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ gridColumn:'1/-1' }}>{lbl('Navn / Beskrivelse *')}<input value={form.name} onChange={e=>set('name',e.target.value)} required placeholder="F.eks. Slagborrmaskin Makita, Rullestillas 4m" style={mInp} /></div>

            {/* Kategori */}
            <div>
              {lbl('Utstyrstype')}
              <select value={form.category} onChange={e=>setCategory(e.target.value)} style={mInp}>
                <option value="">— Alle kategorier —</option>
                {Object.keys(MASKIN_KATEGORIER).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Maskintype — avhengig av kategori */}
            <div>
              {lbl('Maskintype')}
              <select value={form.type} onChange={e=>set('type',e.target.value)} style={mInp} disabled={!form.category}>
                <option value="">Velg type...</option>
                {availableTypes.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>{lbl('Status')}<select value={form.status} onChange={e=>set('status',e.target.value)} style={mInp}>{Object.keys(MASKIN_STATUS).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            {form.status==='På prosjekt' && (
              <div>{lbl('Tilordnet prosjekt')}<select value={form.current_project_id} onChange={e=>set('current_project_id',e.target.value)} style={mInp}><option value="">Velg prosjekt...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            )}
            <div>{lbl('Merke')}<input value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="F.eks. Makita, Hilti, Layher..." style={mInp} /></div>
            <div>{lbl('Modell')}<input value={form.model} onChange={e=>set('model',e.target.value)} placeholder="Modellnummer" style={mInp} /></div>
            <div>{lbl('Serienummer')}<input value={form.serial_number} onChange={e=>set('serial_number',e.target.value)} placeholder="Serienummer" style={mInp} /></div>
            <div>{lbl('Årsmodell')}<input type="number" value={form.year} onChange={e=>set('year',e.target.value)} placeholder="2022" min="1980" max="2030" style={mInp} /></div>
            <div>{lbl('Siste service')}<input type="date" value={form.last_service} onChange={e=>set('last_service',e.target.value)} style={mInp} /></div>
            <div>{lbl('Neste service')}<input type="date" value={form.next_service} onChange={e=>set('next_service',e.target.value)} style={mInp} /></div>
            <div style={{ gridColumn:'1/-1' }}>{lbl('Merknad')}<textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="Eventuelle merknader om maskinen..." style={{ ...mInp, resize:'none' }} /></div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Registrer maskin'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── END MASKIN MODULE ────────────────────────────────────────────────────────

// ─── NOTIFICATION SYSTEM ──────────────────────────────────────────────────────

const NotifContext = React.createContext({})

function NotifProvider({ children }) {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    setNotifs(data || [])
  }

  useEffect(() => {
    load()
    if (!user) return
    const channel = supabase.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }
  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs(n => n.map(x => ({ ...x, read: true })))
  }

  const unread = notifs.filter(n => !n.read).length
  return <NotifContext.Provider value={{ notifs, unread, load, markRead, markAllRead }}>{children}</NotifContext.Provider>
}

const useNotif = () => React.useContext(NotifContext)

function NotifBell({ onNavigate }) {
  const { notifs, unread, markRead, markAllRead } = useNotif()
  const [open, setOpen] = useState(false)

  const typeIcon = (type) => ({ info: 'ℹ️', success: '✅', warning: '⚠️', quote: '📋' }[type] || 'ℹ️')

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px 8px', borderRadius: '8px', color: '#64748b' }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#dc2626', color: 'white', borderRadius: '999px', fontSize: '10px', fontWeight: '800', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 100, width: '340px', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>🔔 Varsler {unread > 0 && <span style={{ background: '#dc2626', color: 'white', borderRadius: '999px', fontSize: '11px', padding: '1px 7px', marginLeft: '6px' }}>{unread}</span>}</span>
              {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#059669', fontWeight: '600' }}>Merk alle lest</button>}
            </div>
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Ingen varsler ennå</div>
              ) : notifs.map(n => (
                <div key={n.id} onClick={() => { markRead(n.id); setOpen(false); if (n.link_page && onNavigate) onNavigate(n.link_page) }}
                  style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', background: n.read ? 'white' : '#f0fdf4', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = n.read ? 'white' : '#f0fdf4'}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{typeIcon(n.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? '500' : '700', fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>{n.title}</div>
                    {n.message && <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{n.message}</div>}
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString('nb-NO')}</div>
                  </div>
                  {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', flexShrink: 0, marginTop: '4px' }} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── END NOTIFICATION SYSTEM ──────────────────────────────────────────────────
// ─── TILBUD MODULE ────────────────────────────────────────────────────────────

const QUOTE_STATUS = {
  'Utkast':   { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', emoji: '📝' },
  'Sendt':    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', emoji: '📤' },
  'Akseptert':{ bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', emoji: '✅' },
  'Avslått':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', emoji: '❌' },
}

const qInp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }
const qCard = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

function QuoteStatusBadge({ status }) {
  const cfg = QUOTE_STATUS[status] || QUOTE_STATUS['Utkast']
  return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{cfg.emoji} {status}</span>
}

function calcChapter(ch) {
  const sum = (ch.posts || []).reduce((acc, p) => acc + (parseFloat(p.qty)||0) * ((parseFloat(p.unitPriceWork)||0) + (parseFloat(p.unitPriceMaterial)||0)), 0)
  const markup = parseFloat(ch.markup) || 0
  return { sum, total: sum * (1 + markup / 100) }
}

function calcQuote(chapters, globalMarkup) {
  const subtotal = chapters.reduce((acc, ch) => acc + calcChapter(ch).sum, 0)
  const gm = parseFloat(globalMarkup) || 0
  const chapterTotals = chapters.reduce((acc, ch) => acc + calcChapter(ch).total, 0)
  return { subtotal, chapterTotals, grandTotal: chapterTotals * (1 + gm / 100) }
}

function fmt(n) { return (Math.round((parseFloat(n)||0)*100)/100).toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr' }

function TilbudPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    try {
      const [q, p] = await Promise.all([
        supabase.from('quotes').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('projects').select('id,name').order('name').then(r => r.data || [])
      ])
      setQuotes(q); setProjects(p)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = quotes.filter(q => {
    if (filterStatus !== 'alle' && q.status !== filterStatus) return false
    if (search && ![q.title, q.quote_number, q.customer_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const counts = Object.keys(QUOTE_STATUS).reduce((acc, s) => { acc[s] = quotes.filter(q => q.status === s).length; return acc }, {})
  const totalAkseptert = quotes.filter(q => q.status === 'Akseptert').reduce((acc, q) => acc + calcQuote(q.chapters || [], q.global_markup).grandTotal, 0)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:'system-ui,sans-serif' }}><div style={{ textAlign:'center' }}><div style={{ width:'36px', height:'36px', border:'3px solid #e2e8f0', borderTop:'3px solid #059669', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/><p style={{ color:'#94a3b8', fontSize:'14px' }}>Laster tilbud...</p></div></div>

  if (selected) return <TilbudDetaljer quote={selected} projects={projects} user={user} onBack={() => { setSelected(null); load() }} />

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'24px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'bold', color:'#0f172a', margin:0 }}>📋 Tilbud</h1>
            <p style={{ color:'#64748b', marginTop:'4px', fontSize:'14px', marginBottom:0 }}>Opprett, send og følg opp tilbud til kunder</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ background:'#059669', color:'white', border:'none', borderRadius:'12px', padding:'11px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>+ Nytt tilbud</button>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr) 1.4fr', gap:'12px' }}>
          {Object.entries(QUOTE_STATUS).map(([s, cfg]) => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'alle' : s)}
              style={{ background: filterStatus===s ? cfg.bg : 'white', border:`1px solid ${filterStatus===s ? cfg.border : '#f1f5f9'}`, borderRadius:'14px', padding:'16px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'20px', marginBottom:'8px' }}>{cfg.emoji}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', color: filterStatus===s ? cfg.color : '#0f172a' }}>{counts[s]||0}</div>
              <div style={{ fontSize:'11px', color: filterStatus===s ? cfg.color : '#94a3b8', fontWeight:'500', marginTop:'2px' }}>{s}</div>
            </button>
          ))}
          <div style={{ background:'linear-gradient(135deg,#059669,#0891b2)', borderRadius:'14px', padding:'16px', color:'white' }}>
            <div style={{ fontSize:'20px', marginBottom:'8px' }}>💰</div>
            <div style={{ fontSize:'18px', fontWeight:'800' }}>{fmt(totalAkseptert)}</div>
            <div style={{ fontSize:'11px', opacity:0.85, fontWeight:'500', marginTop:'2px' }}>Total akseptert</div>
          </div>
        </div>

        <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'14px 18px', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søk tilbud, kunde, nummer..." style={{ ...qInp, maxWidth:'260px', flex:1 }} />
          {(search || filterStatus !== 'alle') && <button onClick={() => { setSearch(''); setFilterStatus('alle') }} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', cursor:'pointer', color:'#64748b' }}>Nullstill</button>}
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#94a3b8' }}>{filtered.length} tilbud</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
            <h3 style={{ margin:'0 0 6px', color:'#0f172a' }}>Ingen tilbud funnet</h3>
            <p style={{ margin:0, color:'#94a3b8', fontSize:'14px' }}>{quotes.length===0 ? 'Opprett ditt første tilbud.' : 'Prøv å endre søk eller filter.'}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filtered.map(q => {
              const cfg = QUOTE_STATUS[q.status]
              const proj = projects.find(p => p.id === q.project_id)
              const { grandTotal } = calcQuote(q.chapters || [], q.global_markup)
              const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status === 'Sendt'
              return (
                <div key={q.id} onClick={() => setSelected(q)}
                  style={{ background:'white', borderRadius:'14px', border:`1px solid ${isExpired ? '#fecaca' : '#f1f5f9'}`, padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:'16px', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{cfg.emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px' }}>{q.title}</span>
                      <span style={{ fontSize:'12px', color:'#94a3b8', fontFamily:'monospace' }}>{q.quote_number}</span>
                      <QuoteStatusBadge status={q.status} />
                      {isExpired && <span style={{ background:'#fef2f2', color:'#dc2626', fontSize:'12px', fontWeight:'600', padding:'2px 8px', borderRadius:'999px', border:'1px solid #fecaca' }}>⏰ Utløpt</span>}
                    </div>
                    <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                      {q.customer_name && <span style={{ fontSize:'12px', color:'#64748b' }}>👤 {q.customer_name}</span>}
                      {proj && <span style={{ fontSize:'12px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                      {q.valid_until && <span style={{ fontSize:'12px', color:'#64748b' }}>📅 Gyldig til {q.valid_until}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:'800', fontSize:'16px', color:'#0f172a' }}>{fmt(grandTotal)}</div>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>inkl. påslag</div>
                  </div>
                  <span style={{ color:'#94a3b8', fontSize:'18px' }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNew && <TilbudEditorModal projects={projects} user={user} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function TilbudDetaljer({ quote: init, projects, user, onBack }) {
  const [q, setQ] = useState(init)
  const [editing, setEditing] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const cfg = QUOTE_STATUS[q.status]
  const proj = projects.find(p => p.id === q.project_id)
  const { grandTotal, chapterTotals } = calcQuote(q.chapters || [], q.global_markup)

  const refresh = async () => {
    const { data } = await supabase.from('quotes').select('*').eq('id', q.id).single()
    if (data) setQ(data)
  }

  const handleDelete = async () => {
    if (!confirm('Slett dette tilbudet?')) return
    await supabase.from('quotes').delete().eq('id', q.id)
    onBack()
  }

  const updateStatus = async (status) => {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'Akseptert') updates.accepted_at = new Date().toISOString()
    await supabase.from('quotes').update(updates).eq('id', q.id)
    setQ(v => ({ ...v, ...updates }))
  }

  const handlePrint = () => window.print()

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <style>{`@media print { .no-print { display:none !important } body { background:white } }`}</style>
      <div className="no-print" style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>← Tilbake til tilbud</button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0 }}>{cfg.emoji}</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'4px' }}>
                <h1 style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'#0f172a' }}>{q.title}</h1>
                <span style={{ fontSize:'13px', color:'#94a3b8', fontFamily:'monospace' }}>{q.quote_number}</span>
                <QuoteStatusBadge status={q.status} />
              </div>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                {q.customer_name && <span style={{ fontSize:'13px', color:'#64748b' }}>👤 {q.customer_name}</span>}
                {proj && <span style={{ fontSize:'13px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0, flexWrap:'wrap' }}>
            {q.status === 'Utkast' && <button onClick={() => setShowSendModal(true)} style={{ padding:'9px 16px', background:'#2563eb', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>📧 Send til kunde</button>}
            <button onClick={handlePrint} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>🖨️ Skriv ut / PDF</button>
            {q.status !== 'Akseptert' && <button onClick={() => setEditing(true)} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>✏️ Rediger</button>}
            <button onClick={handleDelete} style={{ padding:'9px 12px', border:'1px solid #fecaca', borderRadius:'10px', background:'white', cursor:'pointer', color:'#dc2626', fontSize:'13px' }}>🗑️</button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        {/* Left - print area */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Header info */}
          <div style={qCard}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div>
                <div style={{ fontSize:'12px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', marginBottom:'10px' }}>Kunde</div>
                {[['Navn', q.customer_name], ['Adresse', q.customer_address], ['Org.nr', q.customer_orgnr], ['E-post', q.customer_email]].filter(r=>r[1]).map(([k,v]) => (
                  <div key={k} style={{ marginBottom:'5px', fontSize:'13px' }}><span style={{ color:'#94a3b8' }}>{k}: </span><span style={{ color:'#0f172a', fontWeight:'500' }}>{v}</span></div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', marginBottom:'10px' }}>Tilbudsinfo</div>
                {[['Nr.', q.quote_number], ['Dato', q.created_at?.split('T')[0]], ['Gyldig til', q.valid_until], ['Betalingsbetingelser', q.payment_terms], ['Leveringstid', q.delivery_time]].filter(r=>r[1]).map(([k,v]) => (
                  <div key={k} style={{ marginBottom:'5px', fontSize:'13px' }}><span style={{ color:'#94a3b8' }}>{k}: </span><span style={{ color:'#0f172a', fontWeight:'500' }}>{v}</span></div>
                ))}
              </div>
            </div>
            {q.intro_text && <p style={{ margin:'14px 0 0', fontSize:'14px', color:'#475569', lineHeight:1.6, borderTop:'1px solid #f1f5f9', paddingTop:'12px' }}>{q.intro_text}</p>}
          </div>

          {/* Chapters */}
          {(q.chapters || []).map((ch, ci) => {
            const { sum, total } = calcChapter(ch)
            return (
              <div key={ci} style={qCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                  <h3 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:'#0f172a' }}>{String(ci+1).padStart(2,'0')}. {ch.title}</h3>
                  <div style={{ textAlign:'right' }}>
                    {ch.markup > 0 && <div style={{ fontSize:'11px', color:'#94a3b8' }}>Påslag {ch.markup}%</div>}
                    <div style={{ fontWeight:'700', color:'#059669', fontSize:'14px' }}>{fmt(total)}</div>
                  </div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Beskrivelse','Mengde','Enhet','Arbeid/enh','Material/enh','Sum'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign: h==='Sum'||h==='Arbeid/enh'||h==='Material/enh' ? 'right':'left', color:'#64748b', fontWeight:'600', fontSize:'11px', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(ch.posts || []).map((p, pi) => {
                      const lineSum = (parseFloat(p.qty)||0) * ((parseFloat(p.unitPriceWork)||0) + (parseFloat(p.unitPriceMaterial)||0))
                      return (
                        <tr key={pi} style={{ borderBottom:'1px solid #f8fafc' }}>
                          <td style={{ padding:'9px 10px', color:'#0f172a', fontWeight:'500' }}>{p.description || '—'}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', color:'#475569' }}>{p.qty}</td>
                          <td style={{ padding:'9px 10px', color:'#475569' }}>{p.unit}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', color:'#475569' }}>{p.unitPriceWork ? fmt(p.unitPriceWork) : '—'}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', color:'#475569' }}>{p.unitPriceMaterial ? fmt(p.unitPriceMaterial) : '—'}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:'700', color:'#0f172a' }}>{fmt(lineSum)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {ch.description && <p style={{ margin:'10px 0 0', fontSize:'13px', color:'#94a3b8', fontStyle:'italic' }}>{ch.description}</p>}
              </div>
            )
          })}

          {/* Totals */}
          <div style={{ ...qCard, background:'#f8fafc' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxWidth:'320px', marginLeft:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', color:'#475569' }}>
                <span>Kapittelsum</span><span style={{ fontWeight:'600' }}>{fmt(chapterTotals)}</span>
              </div>
              {parseFloat(q.global_markup) > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', color:'#475569' }}>
                  <span>Generelt påslag ({q.global_markup}%)</span>
                  <span style={{ fontWeight:'600' }}>{fmt(grandTotal - chapterTotals)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'17px', fontWeight:'800', color:'#0f172a', borderTop:'2px solid #e2e8f0', paddingTop:'10px', marginTop:'4px' }}>
                <span>Total eks. mva</span><span style={{ color:'#059669' }}>{fmt(grandTotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#94a3b8' }}>
                <span>Mva 25%</span><span>{fmt(grandTotal * 0.25)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'15px', fontWeight:'700', color:'#0f172a' }}>
                <span>Total inkl. mva</span><span>{fmt(grandTotal * 1.25)}</span>
              </div>
            </div>
          </div>

          {q.outro_text && <div style={qCard}><p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6 }}>{q.outro_text}</p></div>}
        </div>

        {/* Right sidebar */}
        <div className="no-print" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Status */}
          <div style={qCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🔄 Status</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {Object.keys(QUOTE_STATUS).map(s => (
                <button key={s} onClick={() => updateStatus(s)} disabled={q.status===s}
                  style={{ padding:'9px 14px', borderRadius:'10px', border:`1px solid ${q.status===s ? QUOTE_STATUS[s].border : '#e2e8f0'}`, background: q.status===s ? QUOTE_STATUS[s].bg : 'white', color: q.status===s ? QUOTE_STATUS[s].color : '#475569', fontWeight: q.status===s ? '700':'400', fontSize:'13px', cursor: q.status===s ? 'default':'pointer', textAlign:'left', width:'100%' }}>
                  {q.status===s ? '✓ ':''}{QUOTE_STATUS[s].emoji} {s}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={qCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>💰 Oppsummering</h3>
            <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'14px', textAlign:'center', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:'11px', color:'#16a34a', fontWeight:'600', textTransform:'uppercase', marginBottom:'4px' }}>Total eks. mva</div>
              <div style={{ fontSize:'22px', fontWeight:'800', color:'#0f172a' }}>{fmt(grandTotal)}</div>
            </div>
            <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'5px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#94a3b8' }}><span>Mva 25%</span><span>{fmt(grandTotal*0.25)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'700', color:'#0f172a' }}><span>Inkl. mva</span><span>{fmt(grandTotal*1.25)}</span></div>
            </div>
          </div>

          {/* Info */}
          <div style={qCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>ℹ️ Detaljer</h3>
            {[['Prosjekt', proj?.name], ['Gyldig til', q.valid_until], ['Betalingsbetingelser', q.payment_terms], ['Leveringstid', q.delivery_time], ['Sendt', q.sent_at ? new Date(q.sent_at).toLocaleDateString('nb-NO') : null], ['Akseptert', q.accepted_at ? new Date(q.accepted_at).toLocaleDateString('nb-NO') : null]].filter(r=>r[1]).map(([k,v],i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f8fafc', fontSize:'13px' }}>
                <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ fontWeight:'500', color:'#0f172a', textAlign:'right', maxWidth:'55%' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && <TilbudEditorModal projects={projects} user={user} initial={q} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh() }} />}
      {showSendModal && <SendTilbudModal quote={q} user={user} onClose={() => setShowSendModal(false)} onSent={() => { setShowSendModal(false); refresh() }} />}
    </div>
  )
}

function TilbudEditorModal({ projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [step, setStep] = useState(1) // 1=info, 2=kapitler
  const [form, setForm] = useState({
    title: initial?.title || '',
    quote_number: initial?.quote_number || `TB-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`,
    project_id: initial?.project_id || '',
    customer_name: initial?.customer_name || '',
    customer_email: initial?.customer_email || '',
    customer_address: initial?.customer_address || '',
    customer_orgnr: initial?.customer_orgnr || '',
    valid_until: initial?.valid_until || '',
    payment_terms: initial?.payment_terms || '30 dager netto',
    delivery_time: initial?.delivery_time || '',
    intro_text: initial?.intro_text || '',
    outro_text: initial?.outro_text || 'Vi håper tilbudet er av interesse og ser frem til et godt samarbeid.',
    global_markup: initial?.global_markup || 0,
  })
  const [chapters, setChapters] = useState(initial?.chapters || [
    { id: Date.now(), title: 'Generelt', description: '', markup: 0, posts: [{ id: Date.now()+1, description: '', qty: 1, unit: 'stk', unitPriceWork: 0, unitPriceMaterial: 0 }] }
  ])
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Chapter helpers
  const addChapter = () => setChapters(c => [...c, { id: Date.now(), title: `Kapittel ${c.length+1}`, description: '', markup: 0, posts: [{ id: Date.now()+1, description: '', qty: 1, unit: 'stk', unitPriceWork: 0, unitPriceMaterial: 0 }] }])
  const removeChapter = (id) => setChapters(c => c.filter(x => x.id !== id))
  const updateChapter = (id, f, v) => setChapters(c => c.map(x => x.id === id ? { ...x, [f]: v } : x))
  const addPost = (chId) => setChapters(c => c.map(x => x.id === chId ? { ...x, posts: [...x.posts, { id: Date.now(), description: '', qty: 1, unit: 'stk', unitPriceWork: 0, unitPriceMaterial: 0 }] } : x))
  const removePost = (chId, pId) => setChapters(c => c.map(x => x.id === chId ? { ...x, posts: x.posts.filter(p => p.id !== pId) } : x))
  const updatePost = (chId, pId, f, v) => setChapters(c => c.map(x => x.id === chId ? { ...x, posts: x.posts.map(p => p.id === pId ? { ...p, [f]: v } : p) } : x))

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Tittel er påkrevd')
    setSaving(true)
    try {
      const payload = { ...form, chapters, updated_at: new Date().toISOString(), project_id: form.project_id || null }
      if (isEdit) {
        const { error } = await supabase.from('quotes').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('quotes').insert({ ...payload, status: 'Utkast', created_by: user?.id })
        if (error) throw error
      }
      onSaved()
    } catch(e) { alert('Feil: ' + e.message) }
    finally { setSaving(false) }
  }

  const lbl = t => <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>{t}</label>
  const { grandTotal } = calcQuote(chapters, form.global_markup)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'900px', maxHeight:'94vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif' }}>
        {/* Modal header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>📋 {isEdit ? 'Rediger' : 'Nytt'} tilbud</h2>
            <div style={{ display:'flex', gap:'4px' }}>
              {[['1','Informasjon'],['2','Kapitler & Poster']].map(([n, lbl]) => (
                <button key={n} onClick={() => setStep(+n)}
                  style={{ padding:'6px 14px', borderRadius:'8px', border:'none', background: step===+n ? '#059669' : '#f1f5f9', color: step===+n ? 'white' : '#64748b', fontWeight: step===+n ? '700':'500', fontSize:'13px', cursor:'pointer' }}>
                  {n}. {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'13px', color:'#94a3b8' }}>Total: <strong style={{ color:'#059669' }}>{fmt(grandTotal)}</strong></span>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'24px' }}>
          {/* STEP 1 - Info */}
          {step === 1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div style={{ gridColumn:'1/-1' }}>{lbl('Tilbudstittel *')}<input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="F.eks. Tilbud betongarbeider Blokk B" style={qInp} /></div>
              <div>{lbl('Tilbudsnummer')}<input value={form.quote_number} onChange={e=>set('quote_number',e.target.value)} style={qInp} /></div>
              <div>{lbl('Knytt til prosjekt')}<select value={form.project_id} onChange={e=>set('project_id',e.target.value)} style={qInp}><option value="">Ingen</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div style={{ gridColumn:'1/-1', borderTop:'1px solid #f1f5f9', paddingTop:'16px' }}><div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'12px' }}>👤 Kundeinformasjon</div></div>
              <div>{lbl('Kundenavn')}<input value={form.customer_name} onChange={e=>set('customer_name',e.target.value)} placeholder="Firmanavn eller personnavn" style={qInp} /></div>
              <div>{lbl('E-post')}<input type="email" value={form.customer_email} onChange={e=>set('customer_email',e.target.value)} placeholder="kunde@epost.no" style={qInp} /></div>
              <div>{lbl('Adresse')}<input value={form.customer_address} onChange={e=>set('customer_address',e.target.value)} placeholder="Gateadresse, postnummer sted" style={qInp} /></div>
              <div>{lbl('Org.nr / Fødselsnr')}<input value={form.customer_orgnr} onChange={e=>set('customer_orgnr',e.target.value)} placeholder="123 456 789" style={qInp} /></div>
              <div style={{ gridColumn:'1/-1', borderTop:'1px solid #f1f5f9', paddingTop:'16px' }}><div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'12px' }}>📅 Betingelser</div></div>
              <div>{lbl('Gyldig til')}<input type="date" value={form.valid_until} onChange={e=>set('valid_until',e.target.value)} style={qInp} /></div>
              <div>{lbl('Betalingsbetingelser')}<input value={form.payment_terms} onChange={e=>set('payment_terms',e.target.value)} placeholder="30 dager netto" style={qInp} /></div>
              <div>{lbl('Leveringstid')}<input value={form.delivery_time} onChange={e=>set('delivery_time',e.target.value)} placeholder="F.eks. 3–4 uker" style={qInp} /></div>
              <div>{lbl('Generelt påslag (%)')}<input type="number" value={form.global_markup} onChange={e=>set('global_markup',e.target.value)} placeholder="0" min="0" max="100" style={qInp} /></div>
              <div style={{ gridColumn:'1/-1' }}>{lbl('Innledende tekst')}<textarea value={form.intro_text} onChange={e=>set('intro_text',e.target.value)} rows={3} placeholder="Takk for henvendelse. Vi tillater oss å fremme følgende tilbud..." style={{ ...qInp, resize:'none' }} /></div>
              <div style={{ gridColumn:'1/-1' }}>{lbl('Avsluttende tekst')}<textarea value={form.outro_text} onChange={e=>set('outro_text',e.target.value)} rows={2} style={{ ...qInp, resize:'none' }} /></div>
            </div>
          )}

          {/* STEP 2 - Chapters */}
          {step === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {chapters.map((ch, ci) => {
                const { sum, total } = calcChapter(ch)
                return (
                  <div key={ch.id} style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Chapter header */}
                    <div style={{ background:'#f8fafc', padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px', borderBottom:'1px solid #f1f5f9' }}>
                      <span style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#059669', color:'white', fontWeight:'800', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{ci+1}</span>
                      <input value={ch.title} onChange={e=>updateChapter(ch.id,'title',e.target.value)} placeholder="Kapittelittel" style={{ ...qInp, flex:1, background:'transparent', border:'1px solid #e2e8f0', fontWeight:'700' }} />
                      <input type="number" value={ch.markup} onChange={e=>updateChapter(ch.id,'markup',e.target.value)} placeholder="Påslag %" min="0" max="100" style={{ ...qInp, width:'100px' }} title="Påslag %" />
                      <span style={{ fontWeight:'700', color:'#059669', fontSize:'14px', whiteSpace:'nowrap' }}>{fmt(total)}</span>
                      {chapters.length > 1 && <button onClick={()=>removeChapter(ch.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'13px' }}>🗑️</button>}
                    </div>
                    {/* Posts table */}
                    <div style={{ padding:'14px 18px' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr>
                            {['Beskrivelse','Mengde','Enhet','Arbeid kr/enh','Material kr/enh','Sum',''].map((h,i) => (
                              <th key={i} style={{ padding:'6px 8px', textAlign:i>=3&&i<=5?'right':'left', fontSize:'11px', fontWeight:'600', color:'#94a3b8', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ch.posts.map(p => {
                            const lineSum = (parseFloat(p.qty)||0) * ((parseFloat(p.unitPriceWork)||0)+(parseFloat(p.unitPriceMaterial)||0))
                            return (
                              <tr key={p.id}>
                                <td style={{ padding:'6px 4px' }}><input value={p.description} onChange={e=>updatePost(ch.id,p.id,'description',e.target.value)} placeholder="Beskriv arbeid/materiale" style={{ ...qInp, minWidth:'180px' }} /></td>
                                <td style={{ padding:'6px 4px' }}><input type="number" value={p.qty} onChange={e=>updatePost(ch.id,p.id,'qty',e.target.value)} style={{ ...qInp, width:'70px', textAlign:'right' }} /></td>
                                <td style={{ padding:'6px 4px' }}><input value={p.unit} onChange={e=>updatePost(ch.id,p.id,'unit',e.target.value)} placeholder="stk" style={{ ...qInp, width:'60px' }} /></td>
                                <td style={{ padding:'6px 4px' }}><input type="number" value={p.unitPriceWork} onChange={e=>updatePost(ch.id,p.id,'unitPriceWork',e.target.value)} style={{ ...qInp, width:'110px', textAlign:'right' }} /></td>
                                <td style={{ padding:'6px 4px' }}><input type="number" value={p.unitPriceMaterial} onChange={e=>updatePost(ch.id,p.id,'unitPriceMaterial',e.target.value)} style={{ ...qInp, width:'110px', textAlign:'right' }} /></td>
                                <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:'700', color:'#0f172a', whiteSpace:'nowrap' }}>{fmt(lineSum)}</td>
                                <td style={{ padding:'6px 4px' }}>{ch.posts.length>1&&<button onClick={()=>removePost(ch.id,p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:'16px' }}>×</button>}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px' }}>
                        <button onClick={()=>addPost(ch.id)} style={{ background:'#f0fdf4', color:'#059669', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til post</button>
                        <div style={{ fontSize:'13px', color:'#64748b' }}>Kapittelsum: <strong style={{ color:'#0f172a' }}>{fmt(sum)}</strong>{ch.markup>0?` + påslag = ${fmt(total)}`:''}</div>
                      </div>
                      {ch.description !== undefined && <textarea value={ch.description} onChange={e=>updateChapter(ch.id,'description',e.target.value)} rows={1} placeholder="Kapittelnotat (valgfritt)" style={{ ...qInp, marginTop:'8px', resize:'none', fontSize:'12px', color:'#94a3b8' }} />}
                    </div>
                  </div>
                )
              })}
              <button onClick={addChapter} style={{ background:'white', border:'2px dashed #e2e8f0', borderRadius:'14px', padding:'16px', cursor:'pointer', color:'#94a3b8', fontWeight:'600', fontSize:'14px', width:'100%' }}>+ Legg til kapittel</button>

              {/* Grand total */}
              <div style={{ background:'#f0fdf4', borderRadius:'14px', padding:'18px 24px', border:'1px solid #bbf7d0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'13px', color:'#16a34a', fontWeight:'600' }}>Total eks. mva</div>
                    {parseFloat(form.global_markup)>0 && <div style={{ fontSize:'12px', color:'#94a3b8' }}>Inkl. generelt påslag {form.global_markup}%</div>}
                  </div>
                  <div style={{ fontSize:'24px', fontWeight:'800', color:'#0f172a' }}>{fmt(grandTotal)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', gap:'8px' }}>
            {step === 2 && <button onClick={()=>setStep(1)} style={{ padding:'10px 18px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>← Tilbake</button>}
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
            {step === 1 && <button onClick={()=>setStep(2)} style={{ padding:'10px 24px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>Neste: Kapitler →</button>}
            {step === 2 && <button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett tilbud'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SendTilbudModal({ quote, user, onClose, onSent }) {
  const [email, setEmail] = useState(quote.customer_email || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const { grandTotal } = calcQuote(quote.chapters || [], quote.global_markup)

  const handleSend = async () => {
    if (!email) return alert('E-postadresse er påkrevd')
    setSending(true)
    try {
      const approvalUrl = await createApprovalToken({ module: 'quote', recordId: quote.id, recipientEmail: email, createdBy: user?.id })
      const emailHtml = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px">
          <h1 style="color:#0f172a;font-size:22px;margin-bottom:8px">${quote.title}</h1>
          <p style="color:#64748b;font-size:14px">Tilbudsnummer: <strong>${quote.quote_number}</strong></p>
          ${quote.intro_text ? `<p style="color:#475569;line-height:1.6">${quote.intro_text}</p>` : ''}
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #bbf7d0">
            <div style="font-size:13px;color:#16a34a;font-weight:600;margin-bottom:4px">TOTALSUM EKS. MVA</div>
            <div style="font-size:28px;font-weight:800;color:#0f172a">${fmt(grandTotal)}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px">Inkl. mva: ${fmt(grandTotal*1.25)}</div>
          </div>
          ${quote.valid_until ? `<p style="color:#64748b;font-size:13px">Tilbudet er gyldig til: <strong>${quote.valid_until}</strong></p>` : ''}
          ${quote.payment_terms ? `<p style="color:#64748b;font-size:13px">Betalingsbetingelser: <strong>${quote.payment_terms}</strong></p>` : ''}
          <div style="text-align:center;margin:32px 0">
            <a href="${approvalUrl}" style="background:#059669;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">✅ Godkjenn tilbud</a>
          </div>
          ${quote.outro_text ? `<p style="color:#64748b;font-size:13px;line-height:1.6">${quote.outro_text}</p>` : ''}
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px">Sendt via En Plattform KS-system</p>
        </div>
      `
      const fnRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ to: email, subject: `Tilbud ${quote.quote_number} – ${quote.title}`, html: emailHtml })
      })
      const fnData = await fnRes.json()
      if (!fnRes.ok || fnData?.error) throw new Error(fnData?.error || 'Sending feilet')

      await supabase.from('quotes').update({ status: 'Sendt', sent_at: new Date().toISOString(), customer_email: email }).eq('id', quote.id)
      setSent(true)
      setTimeout(() => onSent(), 1500)
    } catch(e) { alert('Kunne ikke sende: ' + e.message) }
    finally { setSending(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>📧 Send tilbud til kunde</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
          {sent ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
              <h3 style={{ margin:'0 0 6px', color:'#0f172a' }}>Tilbud sendt!</h3>
              <p style={{ margin:0, color:'#64748b', fontSize:'14px' }}>Kunden mottar en e-post med godkjenningsknapp</p>
            </div>
          ) : (
            <>
              <div style={{ background:'#f0fdf4', borderRadius:'12px', padding:'14px', border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:'13px', color:'#16a34a', fontWeight:'600' }}>Tilbud: {quote.title}</div>
                <div style={{ fontSize:'20px', fontWeight:'800', color:'#0f172a', marginTop:'4px' }}>{fmt(grandTotal)}</div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>E-postadresse til kunde *</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="kunde@epost.no" style={qInp} />
              </div>
              <div style={{ background:'#fffbeb', borderRadius:'10px', padding:'12px 14px', border:'1px solid #fde68a', fontSize:'13px', color:'#92400e' }}>
                ⚠️ Kunden mottar en e-post med en <strong>godkjenningsknapp</strong>. Når de klikker, oppdateres tilbudet automatisk til «Akseptert» og du får et varsel i systemet.
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
                <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
                <button onClick={handleSend} disabled={sending} style={{ padding:'10px 24px', background:sending?'#6ee7b7':'#2563eb', color:'white', border:'none', borderRadius:'10px', cursor:sending?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{sending?'Sender...':'📧 Send nå'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── END TILBUD MODULE ────────────────────────────────────────────────────────

// ─── GODKJENNING MODULE ───────────────────────────────────────────────────────

const MODULE_CONFIG = {
  quote:        { label: 'Tilbud',          emoji: '📋', table: 'quotes',           statusField: 'status', approvedStatus: 'Akseptert', rejectedStatus: 'Avslått',  notifTitle: (r) => `Tilbud godkjent: ${r.title}`, notifTitleReject: (r) => `Tilbud avslått: ${r.title}` },
  order:        { label: 'Ordre',           emoji: '📦', table: 'orders',           statusField: 'status', approvedStatus: 'Bekreftet', rejectedStatus: 'Avslått',  notifTitle: (r) => `Ordre bekreftet: ${r.title}`, notifTitleReject: (r) => `Ordre avslått: ${r.title}` },
  invoice:      { label: 'Faktura',         emoji: '🧾', table: 'invoices',         statusField: 'status', approvedStatus: 'Godkjent',  rejectedStatus: 'Avvist',   notifTitle: (r) => `Faktura godkjent: ${r.title}`, notifTitleReject: (r) => `Faktura avvist: ${r.title}` },
  change_order: { label: 'Endringsmelding', emoji: '🔄', table: 'change_orders',    statusField: 'status', approvedStatus: 'Godkjent',  rejectedStatus: 'Avslått',  notifTitle: (r) => `Endringsmelding godkjent: ${r.title}`, notifTitleReject: (r) => `Endringsmelding avslått: ${r.title}` },
  tender:       { label: 'Anbud',           emoji: '📑', table: 'tenders',          statusField: 'status', approvedStatus: 'Akseptert', rejectedStatus: 'Avslått',  notifTitle: (r) => `Anbud akseptert: ${r.title}`, notifTitleReject: (r) => `Anbud avslått: ${r.title}` },
}

function GodkjenningsPage() {
  const [token, setToken] = useState(null)
  const [tokenData, setTokenData] = useState(null)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [signedName, setSignedName] = useState('')
  const [rejectComment, setRejectComment] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null) // 'approved' | 'rejected'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) { setError('Ugyldig lenke — token mangler.'); setLoading(false); return }
    setToken(t)
    loadToken(t)
  }, [])

  const loadToken = async (t) => {
    try {
      const { data: td, error: te } = await supabase.from('approval_tokens').select('*').eq('token', t).single()
      if (te || !td) throw new Error('Lenken er ugyldig eller utløpt.')
      if (td.status !== 'pending') { setDone(td.status === 'approved' ? 'approved' : 'rejected'); setTokenData(td); setLoading(false); return }

      const cfg = MODULE_CONFIG[td.module]
      if (!cfg) throw new Error('Ukjent dokumenttype.')

      const { data: rec, error: re } = await supabase.from(cfg.table).select('*').eq('id', td.record_id).single()
      if (re || !rec) throw new Error('Dokumentet ble ikke funnet.')

      setTokenData(td)
      setRecord(rec)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleApprove = async () => {
    if (!signedName.trim()) return alert('Vennligst skriv inn ditt navn for å signere.')
    setSubmitting(true)
    try {
      const cfg = MODULE_CONFIG[tokenData.module]
      const now = new Date().toISOString()

      await supabase.from('approval_tokens').update({ status: 'approved', signed_name: signedName.trim(), approved_at: now }).eq('id', tokenData.id)
      await supabase.from(cfg.table).update({ [cfg.statusField]: cfg.approvedStatus, accepted_at: now, updated_at: now }).eq('id', tokenData.record_id)

      if (tokenData.created_by) {
        await supabase.from('notifications').insert({
          user_id: tokenData.created_by,
          title: cfg.notifTitle(record),
          message: `Signert av ${signedName.trim()}${tokenData.recipient_email ? ` (${tokenData.recipient_email})` : ''}`,
          type: 'success',
          link_page: tokenData.module === 'quote' ? 'tilbud' : tokenData.module,
          link_id: tokenData.record_id,
        })
      }
      setDone('approved')
    } catch(e) { alert('Feil: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const handleReject = async () => {
    setSubmitting(true)
    try {
      const cfg = MODULE_CONFIG[tokenData.module]
      const now = new Date().toISOString()

      await supabase.from('approval_tokens').update({ status: 'rejected', signed_name: signedName.trim()||null, reject_comment: rejectComment.trim()||null, rejected_at: now }).eq('id', tokenData.id)
      await supabase.from(cfg.table).update({ [cfg.statusField]: cfg.rejectedStatus, updated_at: now }).eq('id', tokenData.record_id)

      if (tokenData.created_by) {
        await supabase.from('notifications').insert({
          user_id: tokenData.created_by,
          title: cfg.notifTitleReject(record),
          message: rejectComment.trim() || `Avslått av mottaker${tokenData.recipient_email ? ` (${tokenData.recipient_email})` : ''}`,
          type: 'warning',
          link_page: tokenData.module === 'quote' ? 'tilbud' : tokenData.module,
          link_id: tokenData.record_id,
        })
      }
      setDone('rejected')
    } catch(e) { alert('Feil: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const cfg = tokenData ? MODULE_CONFIG[tokenData.module] : null

  const pageStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }
  const cardStyle = { background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '560px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: '1px solid #f1f5f9' }

  if (loading) return (
    <div style={pageStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #059669', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: '#64748b' }}>Laster dokument...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Ugyldig lenke</h2>
        <p style={{ margin: 0, color: '#64748b' }}>{error}</p>
      </div>
    </div>
  )

  if (done === 'approved') return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '24px' }}>Godkjent!</h2>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '16px' }}>
          {cfg?.label} er godkjent{tokenData?.signed_name ? ` og signert av ${tokenData.signed_name}` : ''}.
        </p>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Avsender har mottatt bekreftelse. Du kan lukke denne siden.</p>
      </div>
    </div>
  )

  if (done === 'rejected') return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🙏</div>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '24px' }}>Tilbakemelding mottatt</h2>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '16px' }}>Avsender er varslet om din beslutning.</p>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Du kan lukke denne siden.</p>
      </div>
    </div>
  )

  if (!record || !cfg) return null

  const isQuote = tokenData.module === 'quote'
  const chapters = record.chapters || []
  const grandTotal = isQuote ? chapters.reduce((acc, ch) => {
    const chSum = (ch.posts||[]).reduce((a,p) => a + (parseFloat(p.qty)||0)*((parseFloat(p.unitPriceWork)||0)+(parseFloat(p.unitPriceMaterial)||0)), 0)
    return acc + chSum * (1 + (parseFloat(ch.markup)||0)/100)
  }, 0) * (1 + (parseFloat(record.global_markup)||0)/100) : null

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>{cfg.emoji}</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{record.title}</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{cfg.label} • {record.quote_number || record.order_number || record.invoice_number || ''}</p>
        </div>

        {/* Document details */}
        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: isQuote ? '16px' : '0' }}>
            {[
              ['Til', record.customer_name],
              ['Gyldig til', record.valid_until],
              ['Betalingsbetingelser', record.payment_terms],
              ['Leveringstid', record.delivery_time],
            ].filter(r => r[1]).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '2px' }}>{k}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{v}</div>
              </div>
            ))}
          </div>
          {isQuote && grandTotal !== null && (
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Totalsum eks. mva</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{(Math.round(grandTotal)).toLocaleString('nb-NO')} kr</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Inkl. mva: {(Math.round(grandTotal * 1.25)).toLocaleString('nb-NO')} kr</div>
            </div>
          )}
        </div>

        {/* Intro text */}
        {record.intro_text && <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>{record.intro_text}</p>}

        {/* Chapters summary for quote */}
        {isQuote && chapters.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {chapters.map((ch, i) => {
              const chSum = (ch.posts||[]).reduce((a,p) => a + (parseFloat(p.qty)||0)*((parseFloat(p.unitPriceWork)||0)+(parseFloat(p.unitPriceMaterial)||0)), 0)
              const chTotal = chSum * (1 + (parseFloat(ch.markup)||0)/100)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i%2===0?'#f8fafc':'white', borderRadius: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#374151', fontWeight: '500' }}>{String(i+1).padStart(2,'0')}. {ch.title}</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{Math.round(chTotal).toLocaleString('nb-NO')} kr</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Signature */}
        {!showReject && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>✍️ Ditt fulle navn (signatur)</label>
            <input value={signedName} onChange={e => setSignedName(e.target.value)} placeholder="Skriv inn ditt fulle navn..." style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', transition: 'border 0.15s' }}
              onFocus={e => e.target.style.borderColor='#059669'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
          </div>
        )}

        {/* Reject form */}
        {showReject && (
          <div style={{ marginBottom: '16px', background: '#fef2f2', borderRadius: '12px', padding: '16px', border: '1px solid #fecaca' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>❌ Årsak til avslag (valgfritt)</label>
            <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={3} placeholder="Beskriv hvorfor du avslår..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }} />
          </div>
        )}

        {/* Action buttons */}
        {!showReject ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={handleApprove} disabled={submitting}
              style={{ width: '100%', padding: '16px', background: submitting ? '#6ee7b7' : '#059669', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
              {submitting ? 'Behandler...' : `✅ Godkjenn ${cfg.label}`}
            </button>
            <button onClick={() => setShowReject(true)}
              style={{ width: '100%', padding: '13px', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              ❌ Avslå
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowReject(false)}
              style={{ flex: 1, padding: '13px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              ← Tilbake
            </button>
            <button onClick={handleReject} disabled={submitting}
              style={{ flex: 2, padding: '13px', background: submitting ? '#fca5a5' : '#dc2626', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Sender...' : 'Bekreft avslag'}
            </button>
          </div>
        )}

        {record.outro_text && <p style={{ margin: '20px 0 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, textAlign: 'center' }}>{record.outro_text}</p>}
        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#cbd5e1', textAlign: 'center' }}>Sendt via En Plattform KS-system • enplattform.no</p>
      </div>
    </div>
  )
}

// Helper: create approval token and return URL
async function createApprovalToken({ module, recordId, recipientEmail, createdBy }) {
  const { data, error } = await supabase.from('approval_tokens').insert({
    module, record_id: recordId, recipient_email: recipientEmail, created_by: createdBy
  }).select().single()
  if (error) throw error
  return `${window.location.origin}/godkjenn?token=${data.token}`
}

// ─── END GODKJENNING MODULE ───────────────────────────────────────────────────

// ─── ANBUDSMODUL ──────────────────────────────────────────────────────────────

const TENDER_STATUS = {
  'Utkast':          { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', emoji: '📝' },
  'Sendt':           { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', emoji: '📤' },
  'Mottatt':         { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', emoji: '📥' },
  'Under vurdering': { bg: '#fffbeb', color: '#d97706', border: '#fde68a', emoji: '🔍' },
  'Tildelt':         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', emoji: '✅' },
  'Avslått':         { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', emoji: '❌' },
}

const UE_STATUS = {
  'Invitert': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Åpnet':    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Priset':   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Avslått':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

const tInp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }
const tCard = { background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

function TenderStatusBadge({ status }) {
  const cfg = TENDER_STATUS[status] || TENDER_STATUS['Utkast']
  return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{cfg.emoji} {status}</span>
}

function calcTenderChapter(ch) {
  const sum = (ch.posts||[]).reduce((acc,p) => acc + (parseFloat(p.qty)||0)*((parseFloat(p.unitCost)||0)), 0)
  const markup = parseFloat(ch.markup)||0
  return { cost: sum, price: sum*(1+markup/100) }
}

function calcTender(chapters, globalMarkup) {
  const totalCost = chapters.reduce((acc,ch) => acc + calcTenderChapter(ch).cost, 0)
  const totalPrice = chapters.reduce((acc,ch) => acc + calcTenderChapter(ch).price, 0)
  const gm = parseFloat(globalMarkup)||0
  return { totalCost, totalPrice, grandTotal: totalPrice*(1+gm/100) }
}

function fmtT(n) { return (Math.round(parseFloat(n)||0)).toLocaleString('nb-NO') + ' kr' }

function AnbudsPage() {
  const { user } = useAuth()
  const [tenders, setTenders] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterType, setFilterType] = useState('alle')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    try {
      const [t, p] = await Promise.all([
        supabase.from('tenders').select('*').order('created_at', { ascending: false }).then(r => r.data||[]),
        supabase.from('projects').select('id,name').order('name').then(r => r.data||[])
      ])
      setTenders(t); setProjects(p)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = tenders.filter(t => {
    if (filterStatus !== 'alle' && t.status !== filterStatus) return false
    if (filterType !== 'alle' && t.type !== filterType) return false
    if (search && ![t.title, t.tender_number, t.customer_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const incoming = tenders.filter(t => t.type === 'incoming')
  const outgoing = tenders.filter(t => t.type === 'outgoing')
  const tildelt = tenders.filter(t => t.status === 'Tildelt')
  const totalTildelt = tildelt.reduce((acc,t) => acc + (t.awarded_amount||calcTender(t.chapters||[], t.global_markup).grandTotal), 0)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:'system-ui,sans-serif' }}><div style={{ textAlign:'center' }}><div style={{ width:'36px', height:'36px', border:'3px solid #e2e8f0', borderTop:'3px solid #059669', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/><p style={{ color:'#94a3b8', fontSize:'14px' }}>Laster anbud...</p></div></div>

  if (selected) return <AnbudDetaljer tender={selected} projects={projects} user={user} onBack={() => { setSelected(null); load() }} />

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'24px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'bold', color:'#0f172a', margin:0 }}>📑 Anbudsportal</h1>
            <p style={{ color:'#64748b', marginTop:'4px', fontSize:'14px', marginBottom:0 }}>Innkommende forespørsler, utgående anbud til UE og kalkyle</p>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => { setNewType('incoming'); setShowNew(true) }} style={{ background:'#7c3aed', color:'white', border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>📥 Ny forespørsel</button>
            <button onClick={() => { setNewType('outgoing'); setShowNew(true) }} style={{ background:'#059669', color:'white', border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>📤 Send til UE</button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
          {[
            { label:'Innkommende', value:incoming.length, emoji:'📥', bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', filter:'incoming' },
            { label:'Utgående til UE', value:outgoing.length, emoji:'📤', bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe', filter:'outgoing' },
            { label:'Tildelt', value:tildelt.length, emoji:'✅', bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', filter:'Tildelt' },
          ].map(s => (
            <button key={s.label} onClick={() => s.filter === 'incoming' || s.filter === 'outgoing' ? setFilterType(filterType===s.filter?'alle':s.filter) : setFilterStatus(filterStatus===s.filter?'alle':s.filter)}
              style={{ background: (filterType===s.filter||filterStatus===s.filter)?s.bg:'white', border:`1px solid ${(filterType===s.filter||filterStatus===s.filter)?s.border:'#f1f5f9'}`, borderRadius:'14px', padding:'16px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'22px', marginBottom:'8px' }}>{s.emoji}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', color:(filterType===s.filter||filterStatus===s.filter)?s.color:'#0f172a' }}>{s.value}</div>
              <div style={{ fontSize:'11px', color:(filterType===s.filter||filterStatus===s.filter)?s.color:'#94a3b8', fontWeight:'500', marginTop:'2px' }}>{s.label}</div>
            </button>
          ))}
          <div style={{ background:'linear-gradient(135deg,#059669,#0891b2)', borderRadius:'14px', padding:'16px', color:'white' }}>
            <div style={{ fontSize:'20px', marginBottom:'8px' }}>💰</div>
            <div style={{ fontSize:'16px', fontWeight:'800' }}>{fmtT(totalTildelt)}</div>
            <div style={{ fontSize:'11px', opacity:0.85, fontWeight:'500', marginTop:'2px' }}>Total tildelt</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'14px 18px', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Søk anbud, kunde, nummer..." style={{ ...tInp, maxWidth:'260px', flex:1 }} />
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ ...tInp, maxWidth:'180px' }}>
            <option value="alle">Alle statuser</option>
            {Object.keys(TENDER_STATUS).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {(search||filterStatus!=='alle'||filterType!=='alle') && <button onClick={()=>{setSearch('');setFilterStatus('alle');setFilterType('alle')}} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', cursor:'pointer', color:'#64748b' }}>Nullstill</button>}
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#94a3b8' }}>{filtered.length} anbud</span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>📑</div>
            <h3 style={{ margin:'0 0 6px', color:'#0f172a' }}>Ingen anbud funnet</h3>
            <p style={{ margin:0, color:'#94a3b8', fontSize:'14px' }}>{tenders.length===0?'Opprett ditt første anbud.':'Prøv å endre søk eller filter.'}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filtered.map(t => {
              const cfg = TENDER_STATUS[t.status]
              const proj = projects.find(p=>p.id===t.project_id)
              const { grandTotal } = calcTender(t.chapters||[], t.global_markup)
              const isIncoming = t.type === 'incoming'
              const deadlineDays = t.deadline ? Math.ceil((new Date(t.deadline)-new Date())/(1000*60*60*24)) : null
              return (
                <div key={t.id} onClick={()=>setSelected(t)}
                  style={{ background:'white', borderRadius:'14px', border:`1px solid ${deadlineDays!==null&&deadlineDays<=3&&t.status==='Sendt'?'#fecaca':'#f1f5f9'}`, padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:'16px', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:isIncoming?'#f5f3ff':'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{isIncoming?'📥':'📤'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px' }}>{t.title}</span>
                      <span style={{ fontSize:'11px', color:'#94a3b8', fontFamily:'monospace' }}>{t.tender_number}</span>
                      <TenderStatusBadge status={t.status} />
                      <span style={{ background:isIncoming?'#f5f3ff':'#eff6ff', color:isIncoming?'#7c3aed':'#2563eb', fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'999px', border:`1px solid ${isIncoming?'#ddd6fe':'#bfdbfe'}` }}>{isIncoming?'Innkommende':'Utgående UE'}</span>
                    </div>
                    <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                      {t.customer_name && <span style={{ fontSize:'12px', color:'#64748b' }}>👤 {t.customer_name}</span>}
                      {proj && <span style={{ fontSize:'12px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                      {t.deadline && <span style={{ fontSize:'12px', color:deadlineDays!==null&&deadlineDays<=3?'#dc2626':'#64748b', fontWeight:deadlineDays!==null&&deadlineDays<=3?'700':'400' }}>⏰ Frist {t.deadline}{deadlineDays!==null&&deadlineDays<=3?` (${deadlineDays}d igjen)`:''}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:'800', fontSize:'15px', color:'#0f172a' }}>{fmtT(t.awarded_amount||grandTotal)}</div>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>eks. mva</div>
                  </div>
                  <span style={{ color:'#94a3b8', fontSize:'18px' }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {showNew && <AnbudEditorModal type={newType} projects={projects} user={user} onClose={()=>setShowNew(false)} onSaved={()=>{setShowNew(false);load()}} />}
    </div>
  )
}

function AnbudDetaljer({ tender: init, projects, user, onBack }) {
  const [t, setT] = useState(init)
  const [ues, setUes] = useState([])
  const [editing, setEditing] = useState(false)
  const [showInviteUE, setShowInviteUE] = useState(false)
  const [showAward, setShowAward] = useState(false)
  const cfg = TENDER_STATUS[t.status]
  const proj = projects.find(p=>p.id===t.project_id)
  const { totalCost, grandTotal } = calcTender(t.chapters||[], t.global_markup)
  const isIncoming = t.type === 'incoming'

  const load = async () => {
    const { data } = await supabase.from('tender_ues').select('*').eq('tender_id', t.id).order('created_at')
    setUes(data||[])
  }
  const refresh = async () => {
    const { data } = await supabase.from('tenders').select('*').eq('id', t.id).single()
    if (data) setT(data)
  }
  useEffect(() => { load() }, [])

  const updateStatus = async (status) => {
    await supabase.from('tenders').update({ status, updated_at: new Date().toISOString() }).eq('id', t.id)
    setT(v=>({...v, status}))
  }

  const handleDelete = async () => {
    if (!confirm('Slett dette anbudet?')) return
    await supabase.from('tenders').delete().eq('id', t.id)
    onBack()
  }

  const generateQuote = async () => {
    if (!confirm('Generer tilbud fra dette anbudet? Kapitlene og postene kopieres over.')) return
    try {
      const { data, error } = await supabase.from('quotes').insert({
        title: t.title, quote_number: `TB-${new Date().getFullYear()}-${Math.floor(Math.random()*900)+100}`,
        project_id: t.project_id||null, customer_name: t.customer_name, customer_email: t.customer_email,
        customer_address: t.customer_address, customer_orgnr: t.customer_orgnr,
        valid_until: t.valid_until, payment_terms: '30 dager netto',
        chapters: (t.chapters||[]).map(ch => ({
          ...ch,
          posts: (ch.posts||[]).map(p => ({ ...p, unitPriceWork: p.unitCost||0, unitPriceMaterial: 0 }))
        })),
        global_markup: t.global_markup||0, status: 'Utkast', created_by: user?.id,
      }).select().single()
      if (error) throw error
      await supabase.from('tenders').update({ generated_quote_id: data.id }).eq('id', t.id)
      alert('✅ Tilbud opprettet! Gå til Tilbud-modulen for å se det.')
    } catch(e) { alert('Feil: '+e.message) }
  }

  const pricedUes = ues.filter(u=>u.status==='Priset').sort((a,b)=>(a.total_amount||0)-(b.total_amount||0))

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'20px 32px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>← Tilbake til anbud</button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:isIncoming?'#f5f3ff':'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0 }}>{isIncoming?'📥':'📤'}</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'4px' }}>
                <h1 style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'#0f172a' }}>{t.title}</h1>
                <span style={{ fontSize:'13px', color:'#94a3b8', fontFamily:'monospace' }}>{t.tender_number}</span>
                <TenderStatusBadge status={t.status} />
              </div>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                {t.customer_name && <span style={{ fontSize:'13px', color:'#64748b' }}>👤 {t.customer_name}</span>}
                {proj && <span style={{ fontSize:'13px', color:'#2563eb', fontWeight:'500' }}>🏗️ {proj.name}</span>}
                {t.deadline && <span style={{ fontSize:'13px', color:'#64748b' }}>⏰ Frist {t.deadline}</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0, flexWrap:'wrap' }}>
            {!isIncoming && t.status==='Utkast' && <button onClick={()=>setShowInviteUE(true)} style={{ padding:'9px 14px', background:'#2563eb', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>📧 Inviter UE</button>}
            {t.status==='Under vurdering' && <button onClick={()=>setShowAward(true)} style={{ padding:'9px 14px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>🏆 Tildel anbud</button>}
            {isIncoming && <button onClick={generateQuote} style={{ padding:'9px 14px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>📋 Generer tilbud</button>}
            <button onClick={()=>setEditing(true)} style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'13px' }}>✏️ Rediger</button>
            <button onClick={handleDelete} style={{ padding:'9px 12px', border:'1px solid #fecaca', borderRadius:'10px', background:'white', cursor:'pointer', color:'#dc2626', fontSize:'13px' }}>🗑️</button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Description */}
          {t.description && <div style={tCard}><h3 style={{ margin:'0 0 10px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📄 Beskrivelse</h3><p style={{ margin:0, fontSize:'14px', color:'#475569', lineHeight:1.6 }}>{t.description}</p></div>}

          {/* Chapters / kalkyle */}
          {(t.chapters||[]).length > 0 && (
            <div style={tCard}>
              <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>📊 Kalkyle / Kapitler</h3>
              {(t.chapters||[]).map((ch,ci) => {
                const { cost, price } = calcTenderChapter(ch)
                return (
                  <div key={ci} style={{ marginBottom:'16px', background:'#f8fafc', borderRadius:'12px', padding:'14px', border:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                      <h4 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>{String(ci+1).padStart(2,'0')}. {ch.title}</h4>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'12px', color:'#94a3b8' }}>Kostnad: {fmtT(cost)}</div>
                        {ch.markup>0 && <div style={{ fontSize:'13px', fontWeight:'700', color:'#059669' }}>Pris: {fmtT(price)}</div>}
                      </div>
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                      <thead><tr style={{ background:'white' }}>
                        {['Beskrivelse','Mengde','Enhet','Kost/enh','Sum'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:h==='Sum'||h==='Kost/enh'?'right':'left', color:'#94a3b8', fontWeight:'600', fontSize:'11px', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(ch.posts||[]).map((p,pi) => {
                          const ls = (parseFloat(p.qty)||0)*(parseFloat(p.unitCost)||0)
                          return <tr key={pi} style={{ borderBottom:'1px solid #f8fafc' }}>
                            <td style={{ padding:'7px 8px', color:'#0f172a', fontWeight:'500' }}>{p.description||'—'}</td>
                            <td style={{ padding:'7px 8px', textAlign:'right', color:'#475569' }}>{p.qty}</td>
                            <td style={{ padding:'7px 8px', color:'#475569' }}>{p.unit}</td>
                            <td style={{ padding:'7px 8px', textAlign:'right', color:'#475569' }}>{fmtT(p.unitCost)}</td>
                            <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:'700', color:'#0f172a' }}>{fmtT(ls)}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
              <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'14px 18px', border:'1px solid #bbf7d0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'13px', color:'#16a34a', fontWeight:'600' }}>Total kalkylepris eks. mva</div>
                  {parseFloat(t.global_markup)>0 && <div style={{ fontSize:'12px', color:'#94a3b8' }}>Inkl. generelt påslag {t.global_markup}%</div>}
                </div>
                <div style={{ fontSize:'22px', fontWeight:'800', color:'#0f172a' }}>{fmtT(grandTotal)}</div>
              </div>
            </div>
          )}

          {/* UE Comparison */}
          {!isIncoming && ues.length > 0 && (
            <div style={tCard}>
              <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>🏢 UE-er og innkomne priser</h3>
              {pricedUes.length > 0 && (
                <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'12px 16px', border:'1px solid #bbf7d0', marginBottom:'14px', fontSize:'13px', color:'#16a34a', fontWeight:'600' }}>
                  🏆 Laveste pris: {pricedUes[0].company_name} — {fmtT(pricedUes[0].total_amount)}
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {ues.map(ue => {
                  const ucfg = UE_STATUS[ue.status]
                  const isLowest = pricedUes[0]?.id === ue.id
                  return (
                    <div key={ue.id} style={{ display:'flex', alignItems:'center', gap:'12px', background:isLowest?'#f0fdf4':'#f8fafc', borderRadius:'10px', padding:'12px 16px', border:`1px solid ${isLowest?'#bbf7d0':'#f1f5f9'}` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:'700', fontSize:'14px', color:'#0f172a' }}>{ue.company_name} {isLowest&&'🏆'}</div>
                        {ue.contact_name && <div style={{ fontSize:'12px', color:'#64748b' }}>{ue.contact_name} · {ue.email}</div>}
                        {ue.submitted_at && <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>Innlevert {new Date(ue.submitted_at).toLocaleDateString('nb-NO')}</div>}
                      </div>
                      <span style={{ background:ucfg.bg, color:ucfg.color, border:`1px solid ${ucfg.border}`, padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' }}>{ue.status}</span>
                      {ue.total_amount && <div style={{ fontWeight:'800', fontSize:'15px', color:isLowest?'#16a34a':'#0f172a', minWidth:'100px', textAlign:'right' }}>{fmtT(ue.total_amount)}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={tCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>🔄 Status</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {Object.keys(TENDER_STATUS).map(s => (
                <button key={s} onClick={()=>updateStatus(s)} disabled={t.status===s}
                  style={{ padding:'9px 14px', borderRadius:'10px', border:`1px solid ${t.status===s?TENDER_STATUS[s].border:'#e2e8f0'}`, background:t.status===s?TENDER_STATUS[s].bg:'white', color:t.status===s?TENDER_STATUS[s].color:'#475569', fontWeight:t.status===s?'700':'400', fontSize:'13px', cursor:t.status===s?'default':'pointer', textAlign:'left', width:'100%' }}>
                  {t.status===s?'✓ ':''}{TENDER_STATUS[s].emoji} {s}
                </button>
              ))}
            </div>
          </div>
          <div style={tCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>💰 Økonomi</h3>
            <div style={{ background:isIncoming?'#f5f3ff':'#f0fdf4', borderRadius:'10px', padding:'14px', textAlign:'center', border:`1px solid ${isIncoming?'#ddd6fe':'#bbf7d0'}` }}>
              <div style={{ fontSize:'11px', color:isIncoming?'#7c3aed':'#16a34a', fontWeight:'600', textTransform:'uppercase', marginBottom:'4px' }}>Kalkylepris eks. mva</div>
              <div style={{ fontSize:'20px', fontWeight:'800', color:'#0f172a' }}>{fmtT(t.awarded_amount||grandTotal)}</div>
            </div>
            {t.awarded_ue && <div style={{ marginTop:'10px', fontSize:'13px', color:'#064748' }}><strong>Tildelt:</strong> {t.awarded_ue}</div>}
          </div>
          <div style={tCard}>
            <h3 style={{ margin:'0 0 12px', fontSize:'14px', fontWeight:'600', color:'#0f172a' }}>ℹ️ Info</h3>
            {[['Kunde/byggherre',t.customer_name],['E-post',t.customer_email],['Prosjekt',proj?.name],['Frist',t.deadline],['Gyldig til',t.valid_until]].filter(r=>r[1]).map(([k,v],i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f8fafc', fontSize:'13px' }}>
                <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ fontWeight:'500', color:'#0f172a', textAlign:'right', maxWidth:'55%' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && <AnbudEditorModal type={t.type} projects={projects} user={user} initial={t} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);refresh()}} />}
      {showInviteUE && <InviterUEModal tender={t} user={user} onClose={()=>setShowInviteUE(false)} onSaved={()=>{setShowInviteUE(false);load();updateStatus('Sendt')}} />}
      {showAward && <TildelModal tender={t} ues={ues} projects={projects} user={user} onClose={()=>setShowAward(false)} onSaved={()=>{setShowAward(false);refresh()}} />}
    </div>
  )
}

function AnbudEditorModal({ type, projects, user, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const isIncoming = type === 'incoming'
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: initial?.title||'', tender_number: initial?.tender_number||`ANB-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`,
    project_id: initial?.project_id||'', customer_name: initial?.customer_name||'', customer_email: initial?.customer_email||'',
    customer_address: initial?.customer_address||'', customer_orgnr: initial?.customer_orgnr||'',
    deadline: initial?.deadline||'', valid_until: initial?.valid_until||'',
    description: initial?.description||'', global_markup: initial?.global_markup||0,
  })
  const [chapters, setChapters] = useState(initial?.chapters||[
    { id: Date.now(), title: 'Generelt', markup: 0, posts: [{ id: Date.now()+1, description:'', qty:1, unit:'stk', unitCost:0 }] }
  ])
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const addChapter = () => setChapters(c=>[...c,{ id:Date.now(), title:`Kapittel ${c.length+1}`, markup:0, posts:[{id:Date.now()+1,description:'',qty:1,unit:'stk',unitCost:0}] }])
  const removeChapter = (id) => setChapters(c=>c.filter(x=>x.id!==id))
  const updateChapter = (id,f,v) => setChapters(c=>c.map(x=>x.id===id?{...x,[f]:v}:x))
  const addPost = (chId) => setChapters(c=>c.map(x=>x.id===chId?{...x,posts:[...x.posts,{id:Date.now(),description:'',qty:1,unit:'stk',unitCost:0}]}:x))
  const removePost = (chId,pId) => setChapters(c=>c.map(x=>x.id===chId?{...x,posts:x.posts.filter(p=>p.id!==pId)}:x))
  const updatePost = (chId,pId,f,v) => setChapters(c=>c.map(x=>x.id===chId?{...x,posts:x.posts.map(p=>p.id===pId?{...p,[f]:v}:p)}:x))

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Tittel er påkrevd')
    setSaving(true)
    try {
      const payload = { ...form, type, chapters, project_id: form.project_id||null, updated_at: new Date().toISOString() }
      if (isEdit) { const {error}=await supabase.from('tenders').update(payload).eq('id',initial.id); if(error) throw error }
      else { const {error}=await supabase.from('tenders').insert({...payload,status:'Utkast',created_by:user?.id}); if(error) throw error }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  const lbl = t => <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>{t}</label>
  const { grandTotal } = calcTender(chapters, form.global_markup)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'900px', maxHeight:'94vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>{isIncoming?'📥':'📤'} {isEdit?'Rediger':'Nytt'} {isIncoming?'innkommende anbud':'utgående anbud til UE'}</h2>
            <div style={{ display:'flex', gap:'4px' }}>
              {[['1','Informasjon'],['2','Kalkyle / Poster']].map(([n,l])=>(
                <button key={n} onClick={()=>setStep(+n)} style={{ padding:'6px 14px', borderRadius:'8px', border:'none', background:step===+n?'#059669':'#f1f5f9', color:step===+n?'white':'#64748b', fontWeight:step===+n?'700':'500', fontSize:'13px', cursor:'pointer' }}>{n}. {l}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'13px', color:'#94a3b8' }}>Total: <strong style={{ color:'#059669' }}>{fmtT(grandTotal)}</strong></span>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'24px' }}>
          {step===1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div style={{ gridColumn:'1/-1' }}>{lbl('Tittel *')}<input value={form.title} onChange={e=>set('title',e.target.value)} placeholder={isIncoming?'F.eks. Anbudsforespørsel nybygg Storgata 12':'F.eks. Grunnarbeid – UE anbud'} style={tInp} /></div>
              <div>{lbl('Anbudsnummer')}<input value={form.tender_number} onChange={e=>set('tender_number',e.target.value)} style={tInp} /></div>
              <div>{lbl('Knytt til prosjekt')}<select value={form.project_id} onChange={e=>set('project_id',e.target.value)} style={tInp}><option value="">Ingen</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div style={{ gridColumn:'1/-1', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}><div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'12px' }}>👤 {isIncoming?'Byggherre / Oppdragsgiver':'Kontakt / UE-koordinator'}</div></div>
              <div>{lbl(isIncoming?'Byggherre':'Kontaktnavn')}<input value={form.customer_name} onChange={e=>set('customer_name',e.target.value)} placeholder="Navn / firma" style={tInp} /></div>
              <div>{lbl('E-post')}<input type="email" value={form.customer_email} onChange={e=>set('customer_email',e.target.value)} placeholder="epost@firma.no" style={tInp} /></div>
              <div>{lbl('Adresse')}<input value={form.customer_address} onChange={e=>set('customer_address',e.target.value)} placeholder="Gateadresse" style={tInp} /></div>
              <div>{lbl('Org.nr')}<input value={form.customer_orgnr} onChange={e=>set('customer_orgnr',e.target.value)} placeholder="123 456 789" style={tInp} /></div>
              <div style={{ gridColumn:'1/-1', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}><div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'12px' }}>📅 Frister og betingelser</div></div>
              <div>{lbl('Anbudsfrist')}<input type="date" value={form.deadline} onChange={e=>set('deadline',e.target.value)} style={tInp} /></div>
              <div>{lbl('Gyldig til')}<input type="date" value={form.valid_until} onChange={e=>set('valid_until',e.target.value)} style={tInp} /></div>
              <div>{lbl('Generelt påslag (%)')}<input type="number" value={form.global_markup} onChange={e=>set('global_markup',e.target.value)} placeholder="0" min="0" max="100" style={tInp} /></div>
              <div style={{ gridColumn:'1/-1' }}>{lbl('Beskrivelse / Omfang')}<textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={4} placeholder="Beskriv arbeidet, omfang, krav og betingelser..." style={{ ...tInp, resize:'none' }} /></div>
            </div>
          )}
          {step===2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {chapters.map((ch,ci) => {
                const { cost, price } = calcTenderChapter(ch)
                return (
                  <div key={ch.id} style={{ background:'white', borderRadius:'14px', border:'1px solid #f1f5f9', overflow:'hidden' }}>
                    <div style={{ background:'#f8fafc', padding:'12px 18px', display:'flex', alignItems:'center', gap:'12px', borderBottom:'1px solid #f1f5f9' }}>
                      <span style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#059669', color:'white', fontWeight:'800', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{ci+1}</span>
                      <input value={ch.title} onChange={e=>updateChapter(ch.id,'title',e.target.value)} placeholder="Kapitteltittel" style={{ ...tInp, flex:1, background:'transparent', fontWeight:'700' }} />
                      <input type="number" value={ch.markup} onChange={e=>updateChapter(ch.id,'markup',e.target.value)} placeholder="Påslag %" min="0" max="100" style={{ ...tInp, width:'100px' }} title="Påslag %" />
                      <span style={{ fontWeight:'700', color:'#059669', fontSize:'14px', whiteSpace:'nowrap' }}>{fmtT(price)}</span>
                      {chapters.length>1&&<button onClick={()=>removeChapter(ch.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer' }}>🗑️</button>}
                    </div>
                    <div style={{ padding:'14px 18px' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead><tr>{['Beskrivelse','Mengde','Enhet','Kostpris/enh','Sum',''].map((h,i)=><th key={i} style={{ padding:'6px 8px', textAlign:i>=3&&i<=4?'right':'left', fontSize:'11px', fontWeight:'600', color:'#94a3b8', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {ch.posts.map(p => {
                            const ls = (parseFloat(p.qty)||0)*(parseFloat(p.unitCost)||0)
                            return <tr key={p.id}>
                              <td style={{ padding:'6px 4px' }}><input value={p.description} onChange={e=>updatePost(ch.id,p.id,'description',e.target.value)} placeholder="Beskriv post" style={{ ...tInp, minWidth:'180px' }} /></td>
                              <td style={{ padding:'6px 4px' }}><input type="number" value={p.qty} onChange={e=>updatePost(ch.id,p.id,'qty',e.target.value)} style={{ ...tInp, width:'70px', textAlign:'right' }} /></td>
                              <td style={{ padding:'6px 4px' }}><input value={p.unit} onChange={e=>updatePost(ch.id,p.id,'unit',e.target.value)} placeholder="stk" style={{ ...tInp, width:'60px' }} /></td>
                              <td style={{ padding:'6px 4px' }}><input type="number" value={p.unitCost} onChange={e=>updatePost(ch.id,p.id,'unitCost',e.target.value)} style={{ ...tInp, width:'120px', textAlign:'right' }} /></td>
                              <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:'700', color:'#0f172a', whiteSpace:'nowrap' }}>{fmtT(ls)}</td>
                              <td style={{ padding:'6px 4px' }}>{ch.posts.length>1&&<button onClick={()=>removePost(ch.id,p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:'16px' }}>×</button>}</td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'10px' }}>
                        <button onClick={()=>addPost(ch.id)} style={{ background:'#f0fdf4', color:'#059669', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Legg til post</button>
                        <div style={{ fontSize:'13px', color:'#64748b' }}>Kostnad: <strong>{fmtT(cost)}</strong>{ch.markup>0?` → Pris: ${fmtT(price)}`:''}  </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button onClick={addChapter} style={{ background:'white', border:'2px dashed #e2e8f0', borderRadius:'14px', padding:'16px', cursor:'pointer', color:'#94a3b8', fontWeight:'600', fontSize:'14px', width:'100%' }}>+ Legg til kapittel</button>
              <div style={{ background:'#f0fdf4', borderRadius:'14px', padding:'18px 24px', border:'1px solid #bbf7d0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:'13px', color:'#16a34a', fontWeight:'600' }}>Total kalkylepris eks. mva</div>{parseFloat(form.global_markup)>0&&<div style={{ fontSize:'12px', color:'#94a3b8' }}>Inkl. generelt påslag {form.global_markup}%</div>}</div>
                <div style={{ fontSize:'24px', fontWeight:'800', color:'#0f172a' }}>{fmtT(grandTotal)}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>{step===2&&<button onClick={()=>setStep(1)} style={{ padding:'10px 18px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px' }}>← Tilbake</button>}</div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
            {step===1&&<button onClick={()=>setStep(2)} style={{ padding:'10px 24px', background:'#059669', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>Neste: Kalkyle →</button>}
            {step===2&&<button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':isEdit?'Lagre endringer':'Opprett anbud'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function InviterUEModal({ tender, user, onClose, onSaved }) {
  const [ues, setUes] = useState([{ id: Date.now(), company_name:'', contact_name:'', email:'' }])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const addUE = () => setUes(u=>[...u,{ id:Date.now(), company_name:'', contact_name:'', email:'' }])
  const removeUE = (id) => setUes(u=>u.filter(x=>x.id!==id))
  const updateUE = (id,f,v) => setUes(u=>u.map(x=>x.id===id?{...x,[f]:v}:x))

  const handleSend = async () => {
    const valid = ues.filter(u=>u.company_name.trim()&&u.email.trim())
    if (valid.length===0) return alert('Legg til minst én UE med navn og e-post.')
    setSending(true)
    try {
      for (const ue of valid) {
        const { data, error } = await supabase.from('tender_ues').insert({ tender_id:tender.id, company_name:ue.company_name.trim(), contact_name:ue.contact_name.trim()||null, email:ue.email.trim(), status:'Invitert' }).select().single()
        if (error) throw error
        const pricingUrl = `${window.location.origin}/anbud-pris?token=${data.token}`
        const { grandTotal } = calcTender(tender.chapters||[], tender.global_markup)
        const html = `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px">
            <h1 style="color:#0f172a;font-size:22px;margin-bottom:8px">Anbudsforespørsel: ${tender.title}</h1>
            <p style="color:#64748b;font-size:14px">Anbudsnummer: <strong>${tender.tender_number}</strong></p>
            ${tender.description?`<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0"><p style="margin:0;color:#475569;line-height:1.6">${tender.description}</p></div>`:''}
            ${tender.deadline?`<p style="color:#dc2626;font-weight:600;font-size:14px">⏰ Anbudsfrist: ${tender.deadline}</p>`:''}
            <p style="color:#64748b;font-size:14px">Vi ber om at du fyller inn dine priser for følgende poster.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${pricingUrl}" style="background:#2563eb;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">📝 Fyll inn priser</a>
            </div>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px">Sendt via En Plattform KS-system</p>
          </div>`
        const fnRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote`, {
          method:'POST', headers:{ 'Content-Type':'application/json', 'apikey':import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization':`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ to: ue.email.trim(), subject:`Anbudsforespørsel: ${tender.title} (${tender.tender_number})`, html })
        })
        if (!fnRes.ok) { const d=await fnRes.json(); throw new Error(d.error||'E-post feilet') }
      }
      setSent(true)
      setTimeout(()=>onSaved(), 1500)
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSending(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'560px', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>📧 Inviter underentreprenører</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'24px', display:'flex', flexDirection:'column', gap:'14px' }}>
          {sent ? (
            <div style={{ textAlign:'center', padding:'20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
              <h3 style={{ margin:'0 0 6px', color:'#0f172a' }}>Invitasjoner sendt!</h3>
              <p style={{ margin:0, color:'#64748b', fontSize:'14px' }}>UE-ene mottar e-post med lenke for å fylle inn priser.</p>
            </div>
          ) : (
            <>
              <div style={{ background:'#eff6ff', borderRadius:'10px', padding:'12px 16px', border:'1px solid #bfdbfe', fontSize:'13px', color:'#1d4ed8' }}>
                📋 <strong>{tender.title}</strong> — {tender.tender_number}{tender.deadline?` · Frist: ${tender.deadline}`:''}
              </div>
              {ues.map((ue,i)=>(
                <div key={ue.id} style={{ background:'#f8fafc', borderRadius:'12px', padding:'14px', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                    <span style={{ fontWeight:'700', fontSize:'13px', color:'#64748b' }}>UE {i+1}</span>
                    {ues.length>1&&<button onClick={()=>removeUE(ue.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Fjern</button>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div style={{ gridColumn:'1/-1' }}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Firmanavn *</label><input value={ue.company_name} onChange={e=>updateUE(ue.id,'company_name',e.target.value)} placeholder="UE Firma AS" style={tInp} /></div>
                    <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>Kontaktperson</label><input value={ue.contact_name} onChange={e=>updateUE(ue.id,'contact_name',e.target.value)} placeholder="Fullt navn" style={tInp} /></div>
                    <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'4px' }}>E-post *</label><input type="email" value={ue.email} onChange={e=>updateUE(ue.id,'email',e.target.value)} placeholder="ue@firma.no" style={tInp} /></div>
                  </div>
                </div>
              ))}
              <button onClick={addUE} style={{ background:'white', border:'2px dashed #e2e8f0', borderRadius:'12px', padding:'12px', cursor:'pointer', color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>+ Legg til flere UE-er</button>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
                <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
                <button onClick={handleSend} disabled={sending} style={{ padding:'10px 24px', background:sending?'#6ee7b7':'#2563eb', color:'white', border:'none', borderRadius:'10px', cursor:sending?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{sending?'Sender...':'📧 Send invitasjoner'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TildelModal({ tender, ues, projects, user, onClose, onSaved }) {
  const pricedUes = ues.filter(u=>u.status==='Priset').sort((a,b)=>(a.total_amount||0)-(b.total_amount||0))
  const [selectedUE, setSelectedUE] = useState(pricedUes[0]?.id||'')
  const [projectId, setProjectId] = useState(tender.project_id||'')
  const [saving, setSaving] = useState(false)

  const handleAward = async () => {
    const ue = ues.find(u=>u.id===selectedUE)
    if (!ue) return alert('Velg en UE')
    setSaving(true)
    try {
      await supabase.from('tenders').update({ status:'Tildelt', awarded_ue:ue.company_name, awarded_amount:ue.total_amount, project_id:projectId||null, updated_at:new Date().toISOString() }).eq('id', tender.id)
      await supabase.from('tender_ues').update({ status:'Avslått' }).eq('tender_id', tender.id).neq('id', selectedUE)
      if (user?.id) {
        await supabase.from('notifications').insert({ user_id:user.id, title:`Anbud tildelt: ${tender.title}`, message:`Tildelt til ${ue.company_name} for ${fmtT(ue.total_amount||0)}`, type:'success', link_page:'anbudsmodul' })
      }
      onSaved()
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'white', borderRadius:'20px', width:'100%', maxWidth:'500px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0f172a' }}>🏆 Tildel anbud</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
          {pricedUes.length===0 ? (
            <p style={{ color:'#94a3b8', fontSize:'14px', textAlign:'center', padding:'20px 0' }}>Ingen UE-er har levert pris ennå.</p>
          ) : (
            <>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'8px' }}>Velg vinnende UE</label>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {pricedUes.map((ue,i)=>(
                    <button key={ue.id} onClick={()=>setSelectedUE(ue.id)}
                      style={{ padding:'14px 16px', borderRadius:'12px', border:`2px solid ${selectedUE===ue.id?'#059669':'#e2e8f0'}`, background:selectedUE===ue.id?'#f0fdf4':'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontWeight:'700', color:'#0f172a', fontSize:'14px' }}>{ue.company_name} {i===0&&'🏆'}</div>
                        {ue.contact_name&&<div style={{ fontSize:'12px', color:'#64748b' }}>{ue.contact_name}</div>}
                      </div>
                      <div style={{ fontWeight:'800', color:i===0?'#16a34a':'#0f172a', fontSize:'16px' }}>{fmtT(ue.total_amount)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>Knytt til prosjekt</label>
                <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={tInp}>
                  <option value="">Ingen</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', borderTop:'1px solid #f1f5f9', paddingTop:'14px' }}>
                <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#374151' }}>Avbryt</button>
                <button onClick={handleAward} disabled={saving||!selectedUE} style={{ padding:'10px 24px', background:saving?'#6ee7b7':'#059669', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontSize:'14px', fontWeight:'600' }}>{saving?'Lagrer...':'🏆 Tildel anbud'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── UE PRISINGSSIDE ──────────────────────────────────────────────────────────
function UEPrisingsPage() {
  const [token, setToken] = useState(null)
  const [ueData, setUeData] = useState(null)
  const [tender, setTender] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) { setError('Ugyldig lenke.'); setLoading(false); return }
    setToken(t); loadData(t)
  }, [])

  const loadData = async (t) => {
    try {
      const { data: ue, error: ue_err } = await supabase.from('tender_ues').select('*').eq('token', t).single()
      if (ue_err||!ue) throw new Error('Lenken er ugyldig eller utløpt.')
      if (ue.status === 'Priset') { setDone(true); setLoading(false); return }
      const { data: td, error: td_err } = await supabase.from('tenders').select('*').eq('id', ue.tender_id).single()
      if (td_err||!td) throw new Error('Anbudet ble ikke funnet.')
      setUeData(ue); setTender(td)
      setChapters((td.chapters||[]).map(ch=>({ ...ch, posts:(ch.posts||[]).map(p=>({...p,uePrice:''})) })))
      await supabase.from('tender_ues').update({ status:'Åpnet' }).eq('id', ue.id)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const updatePrice = (chId, pId, val) => setChapters(c=>c.map(ch=>ch.id===chId?{...ch,posts:ch.posts.map(p=>p.id===pId?{...p,uePrice:val}:p)}:ch))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const totalAmount = chapters.reduce((acc,ch)=>acc+(ch.posts||[]).reduce((a,p)=>a+(parseFloat(p.qty)||0)*(parseFloat(p.uePrice)||0),0),0)
      await supabase.from('tender_ues').update({ status:'Priset', chapters, total_amount:totalAmount, submitted_at:new Date().toISOString() }).eq('id', ueData.id)
      if (tender.created_by) {
        await supabase.from('notifications').insert({ user_id:tender.created_by, title:`Ny anbудspris mottatt: ${tender.title}`, message:`${ueData.company_name} har levert pris: ${fmtT(totalAmount)}`, type:'success', link_page:'anbudsmodul' })
      }
      setDone(true)
    } catch(e) { alert('Feil: '+e.message) }
    finally { setSubmitting(false) }
  }

  const pageStyle = { minHeight:'100vh', background:'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', fontFamily:'system-ui,sans-serif' }

  if (loading) return <div style={pageStyle}><div style={{ textAlign:'center', marginTop:'20vh' }}><div style={{ width:'40px', height:'40px', border:'3px solid #e2e8f0', borderTop:'3px solid #2563eb', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 1s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><p style={{ color:'#64748b' }}>Laster anbudsforespørsel...</p></div></div>
  if (error) return <div style={pageStyle}><div style={{ background:'white', borderRadius:'20px', padding:'40px', maxWidth:'480px', width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' }}><div style={{ fontSize:'48px', marginBottom:'16px' }}>❌</div><h2 style={{ margin:'0 0 8px', color:'#0f172a' }}>Ugyldig lenke</h2><p style={{ margin:0, color:'#64748b' }}>{error}</p></div></div>
  if (done) return <div style={pageStyle}><div style={{ background:'white', borderRadius:'20px', padding:'40px', maxWidth:'480px', width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' }}><div style={{ fontSize:'64px', marginBottom:'16px' }}>✅</div><h2 style={{ margin:'0 0 8px', color:'#0f172a', fontSize:'24px' }}>Priser innlevert!</h2><p style={{ margin:'0 0 12px', color:'#64748b' }}>Oppdragsgiver er varslet og vil kontakte deg.</p><p style={{ margin:0, color:'#94a3b8', fontSize:'13px' }}>Du kan lukke denne siden.</p></div></div>

  const totalAmount = chapters.reduce((acc,ch)=>acc+(ch.posts||[]).reduce((a,p)=>a+(parseFloat(p.qty)||0)*(parseFloat(p.uePrice)||0),0),0)

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth:'720px', width:'100%', display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ background:'white', borderRadius:'20px', padding:'28px 32px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0 }}>📑</div>
            <div>
              <h1 style={{ margin:'0 0 4px', fontSize:'20px', fontWeight:'800', color:'#0f172a' }}>{tender.title}</h1>
              <p style={{ margin:0, color:'#64748b', fontSize:'13px' }}>Anbudsnummer: {tender.tender_number} · Invitert: {ueData.company_name}</p>
              {tender.deadline && <p style={{ margin:'6px 0 0', color:'#dc2626', fontWeight:'600', fontSize:'13px' }}>⏰ Frist: {tender.deadline}</p>}
            </div>
          </div>
          {tender.description && <p style={{ margin:'16px 0 0', fontSize:'14px', color:'#475569', lineHeight:1.6, background:'#f8fafc', borderRadius:'10px', padding:'12px 16px' }}>{tender.description}</p>}
        </div>

        {chapters.map((ch,ci)=>(
          <div key={ch.id} style={{ background:'white', borderRadius:'16px', padding:'20px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
            <h3 style={{ margin:'0 0 14px', fontSize:'15px', fontWeight:'700', color:'#0f172a' }}>{String(ci+1).padStart(2,'0')}. {ch.title}</h3>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead><tr style={{ background:'#f8fafc' }}>{['Beskrivelse','Mengde','Enhet','Din pris/enh','Sum'].map(h=><th key={h} style={{ padding:'8px 10px', textAlign:h==='Din pris/enh'||h==='Sum'?'right':'left', color:'#64748b', fontWeight:'600', fontSize:'12px', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}</tr></thead>
              <tbody>
                {(ch.posts||[]).map(p=>{
                  const ls=(parseFloat(p.qty)||0)*(parseFloat(p.uePrice)||0)
                  return <tr key={p.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                    <td style={{ padding:'10px', color:'#0f172a', fontWeight:'500' }}>{p.description||'—'}</td>
                    <td style={{ padding:'10px', textAlign:'right', color:'#475569' }}>{p.qty}</td>
                    <td style={{ padding:'10px', color:'#475569' }}>{p.unit}</td>
                    <td style={{ padding:'6px' }}><input type="number" value={p.uePrice} onChange={e=>updatePrice(ch.id,p.id,e.target.value)} placeholder="0" style={{ ...tInp, width:'120px', textAlign:'right', borderColor:'#2563eb' }} /></td>
                    <td style={{ padding:'10px', textAlign:'right', fontWeight:'700', color:'#0f172a' }}>{fmtT(ls)}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ background:'white', borderRadius:'16px', padding:'20px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <div><div style={{ fontSize:'13px', color:'#64748b', fontWeight:'600' }}>Din totalpris eks. mva</div></div>
            <div style={{ fontSize:'26px', fontWeight:'800', color:'#0f172a' }}>{fmtT(totalAmount)}</div>
          </div>
          <button onClick={handleSubmit} disabled={submitting||totalAmount===0}
            style={{ width:'100%', padding:'16px', background:submitting||totalAmount===0?'#94a3b8':'#2563eb', color:'white', border:'none', borderRadius:'14px', fontSize:'16px', fontWeight:'700', cursor:submitting||totalAmount===0?'not-allowed':'pointer' }}>
            {submitting?'Sender inn...':'📤 Lever priser'}
          </button>
          {totalAmount===0&&<p style={{ margin:'8px 0 0', fontSize:'13px', color:'#94a3b8', textAlign:'center' }}>Fyll inn priser for å levere</p>}
        </div>
        <p style={{ margin:0, fontSize:'12px', color:'#cbd5e1', textAlign:'center' }}>Sendt via En Plattform KS-system · enplattform.no</p>
      </div>
    </div>
  )
}

// ─── END ANBUDSMODUL ──────────────────────────────────────────────────────────




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
  const [checklistId, setChecklistId] = useState(null)

  const navigate = (p) => { setPage(p); setProjectId(null) }
  const openProject = (id) => { setPage('prosjekt_detaljer'); setProjectId(id) }

  // Show approval page without login if URL is /godkjenn
  if (window.location.pathname === '/godkjenn') return <GodkjenningsPage />
  if (window.location.pathname === '/anbud-pris') return <UEPrisingsPage />

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
  const activePage = page === 'prosjekt_detaljer' ? 'prosjekter' : page === 'avvik_detaljer' ? 'avvik' : page

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: sidebarWidth, background: 'white', borderRight: '1px solid #e2e8f0', transition: 'width 0.3s', zIndex: 40, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '0' : '0 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          {collapsed ? <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '18px' }}>EP</span> : <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>En Plattform</span>}
          {!collapsed && <NotifBell onNavigate={navigate} />}
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
        {page === 'prosjektfiler' && <ProsjektfilerPage />}
        {page === 'sjekklister' && <SjekklistePage onNavigateDetail={(id) => { setPage('sjekkliste_detaljer'); setChecklistId(id) }} />}
        {page === 'sjekkliste_detaljer' && <SjekklisteDetaljerPage checklistId={checklistId} onBack={() => setPage('sjekklister')} />}
        {page === 'prosjekt_detaljer' && <ProsjektDetaljerPage projectId={projectId} onBack={() => navigate('prosjekter')} />}
        {page === 'avvik' && <AvvikPage />}
        {page === 'hms' && <HmsPage />}
        {page === 'maskiner' && <MaskinPage />}
        {page === 'tilbud' && <TilbudPage />}
        {page === 'anbudsmodul' && <AnbudsPage />}
        {page !== 'dashboard' && page !== 'prosjekter' && page !== 'prosjektfiler' && page !== 'sjekklister' && page !== 'sjekkliste_detaljer' && page !== 'prosjekt_detaljer' && page !== 'avvik' && page !== 'hms' && page !== 'maskiner' && page !== 'tilbud' && page !== 'anbudsmodul' && (
          <ComingSoon title={navItems.find(n => n?.id === page)?.label || page} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><NotifProvider><AppContent /></NotifProvider></AuthProvider>
}
