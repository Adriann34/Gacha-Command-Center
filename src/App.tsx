import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import TrackerPage from './pages/TrackerPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'
import DevChroniclePage from './pages/DevChroniclePage'
import CharactersPage from './pages/CharactersPage'
import CharacterDetailPage from './pages/CharacterDetailPage'
import DashboardLayout from './components/layout/DashboardLayout'
import { isDevUser } from './lib/devAccess'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-900)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--color-gold-bright)',
          borderRightColor: 'var(--color-gold-deep)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/signin" replace />
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

// Email-gated route for developer-only pages. This is a client-side convenience gate (hides the
// page from other users); the sensitive Worker endpoint it calls independently enforces the same
// email from the verified Firebase ID token, so this is not the security boundary.
function DevRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/signin" replace />
  return isDevUser(user) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Unconditional redirect: anyone hitting "/" goes to /dashboard, which itself
              enforces auth via ProtectedRoute below. This intentionally runs before auth
              is checked, so it's a single hop to /dashboard (then to /signin if logged out)
              rather than a separate redirect path for "/" itself. */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tracker" element={<TrackerPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="characters/:id" element={<CharacterDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="dev/chronicle" element={<DevRoute><DevChroniclePage /></DevRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
