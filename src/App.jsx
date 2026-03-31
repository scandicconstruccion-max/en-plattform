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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {moduleCards.map(m => (
            <button key={m.id} onClick={() => onNavigate(m.id)}
              style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '12px' }}>
                {m.emoji}
              </div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>{m.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
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
            const isActive = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)} title={collapsed ? item.label : undefined}
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

      {/* Main */}
      <main style={{ marginLeft: sidebarWidth, flex: 1, transition: 'margin-left 0.3s', minHeight: '100vh' }}>
        {page === 'dashboard' ? <Dashboard onNavigate={setPage} user={user} /> : <ComingSoon title={navItems.find(n => n?.id === page)?.label || page} />}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
