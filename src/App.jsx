import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import Layout from './Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
  import Prosjekter from './pages/Prosjekter'
import ProsjektDetaljer from './pages/ProsjektDetaljer'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

      {/* Protected routes */}
      <Route path="/prosjekter" element={<ProtectedRoute><Prosjekter /></ProtectedRoute>} />
<Route path="/prosjekter/:id" element={<ProtectedRoute><ProsjektDetaljer /></ProtectedRoute>} />
      <Route path="/prosjekter" element={<ProtectedRoute><Prosjekter /></ProtectedRoute>} />
   <Route path="/prosjekter/:id" element={<ProtectedRoute><ProsjektDetaljer /></ProtectedRoute>} />
      <Route path="/prosjektfiler" element={<ProtectedRoute><Placeholder title="Prosjektfiler" /></ProtectedRoute>} />
      <Route path="/sjekklister" element={<ProtectedRoute><Placeholder title="Sjekklister" /></ProtectedRoute>} />
      <Route path="/avvik" element={<ProtectedRoute><Placeholder title="Avvik" /></ProtectedRoute>} />
      <Route path="/hms" element={<ProtectedRoute><Placeholder title="HMS & Risiko" /></ProtectedRoute>} />
      <Route path="/maskiner" element={<ProtectedRoute><Placeholder title="Maskiner" /></ProtectedRoute>} />
      <Route path="/tilbud" element={<ProtectedRoute><Placeholder title="Tilbud" /></ProtectedRoute>} />
      <Route path="/anbudsmodul" element={<ProtectedRoute><Placeholder title="Anbudsmodul" /></ProtectedRoute>} />
      <Route path="/ordre" element={<ProtectedRoute><Placeholder title="Ordre" /></ProtectedRoute>} />
      <Route path="/endringsmeldinger" element={<ProtectedRoute><Placeholder title="Endringsmeldinger" /></ProtectedRoute>} />
      <Route path="/faktura" element={<ProtectedRoute><Placeholder title="Faktura" /></ProtectedRoute>} />
      <Route path="/ansatte" element={<ProtectedRoute><Placeholder title="Ansatte" /></ProtectedRoute>} />
      <Route path="/timelister" element={<ProtectedRoute><Placeholder title="Timelister" /></ProtectedRoute>} />
      <Route path="/ressursplan" element={<ProtectedRoute><Placeholder title="Ressursplanlegger" /></ProtectedRoute>} />
      <Route path="/kalender" element={<ProtectedRoute><Placeholder title="Kalender" /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Placeholder title="Intern Chat" /></ProtectedRoute>} />
      <Route path="/befaring" element={<ProtectedRoute><Placeholder title="Befaring" /></ProtectedRoute>} />
      <Route path="/bildedok" element={<ProtectedRoute><Placeholder title="Bildedokumentasjon" /></ProtectedRoute>} />
      <Route path="/fdv" element={<ProtectedRoute><Placeholder title="FDV" /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><Placeholder title="CRM" /></ProtectedRoute>} />
      <Route path="/minbedrift" element={<ProtectedRoute><Placeholder title="Min bedrift" /></ProtectedRoute>} />
      <Route path="/brukeradmin" element={<ProtectedRoute><Placeholder title="Brukeradmin" /></ProtectedRoute>} />
      <Route path="/kompetanser" element={<ProtectedRoute><Placeholder title="Kompetanser" /></ProtectedRoute>} />
      <Route path="/varsler" element={<ProtectedRoute><Placeholder title="Varsler" /></ProtectedRoute>} />
      <Route path="/sja" element={<ProtectedRoute><Placeholder title="SJA" /></ProtectedRoute>} />
      <Route path="/ruh" element={<ProtectedRoute><Placeholder title="RUH" /></ProtectedRoute>} />
      <Route path="/risikoanalyse" element={<ProtectedRoute><Placeholder title="Risikoanalyse" /></ProtectedRoute>} />
      <Route path="/hmshandbok" element={<ProtectedRoute><Placeholder title="HMS-håndbok" /></ProtectedRoute>} />
      <Route path="/mottakskontroll" element={<ProtectedRoute><Placeholder title="Mottakskontroll" /></ProtectedRoute>} />
      <Route path="/bestillinger" element={<ProtectedRoute><Placeholder title="Bestillinger" /></ProtectedRoute>} />
      <Route path="/innstillinger" element={<ProtectedRoute><Placeholder title="Innstillinger" /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}
