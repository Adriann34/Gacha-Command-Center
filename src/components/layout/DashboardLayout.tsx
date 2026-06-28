import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../Avatar'
import NotificationBell from '../NotificationBell'
import GlobalSearch from '../GlobalSearch'
import {
  LayoutDashboard, ListChecks, UserCircle2, Settings,
  Menu, X, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tracker', icon: ListChecks, label: 'Tracker' },
  { to: '/account', icon: UserCircle2, label: 'My Account' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const SIDEBAR_COLLAPSE_KEY = 'gcc:sidebarCollapsed'
const SIDEBAR_WIDTH_OPEN = 240
const SIDEBAR_WIDTH_COLLAPSED = 76

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // Desktop-only "collapse to icon rail" state, independent of the mobile open/close
  // drawer above. Persisted so the choice survives a refresh.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage may be unavailable (e.g. private browsing) — collapse still
      // works for the session, it just won't persist across reloads.
    }
  }, [collapsed])

  const handleLogout = async () => {
    await logout()
    navigate('/signin')
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_OPEN

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface-900)' }}>
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          background: 'var(--color-surface-800)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? 0 : '-260px',
          bottom: 0,
          zIndex: 50,
          transition: 'left 0.25s ease, width 0.2s ease',
          overflow: 'hidden',
        }}
        className="lg-sidebar"
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '1.5rem 0' : '1.5rem 1.25rem', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img src="/branding/logo.png" alt="Logo" style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }} />
            {!collapsed && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-primary)', lineHeight: 1.25 }}>
                  Gacha Command Center
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Genshin Impact Tracker</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '1rem 0.5rem' : '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
              Main Menu
            </div>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : undefined}
            >
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle — desktop only, hidden on the mobile drawer */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="sidebar-collapse-btn"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.625rem', margin: '0 0.75rem', padding: '0.55rem 0.75rem',
            background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
            color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'var(--color-surface-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'none' }}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && 'Collapse'}
        </button>

        {/* User section */}
        <div style={{ padding: collapsed ? '1rem 0.5rem' : '1rem 0.75rem', borderTop: '1px solid var(--color-border)', marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: collapsed ? '0.5rem' : '0.5rem 0.625rem', borderRadius: '0.75rem',
              cursor: 'pointer', transition: 'background 0.2s',
              position: 'relative', justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Avatar size={34} />
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.displayName ?? 'User'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--color-text-muted)" />
              </>
            )}

            {userMenuOpen && (
              <div style={{
                position: 'absolute', bottom: '110%', left: 0, right: collapsed ? 'auto' : 0,
                width: collapsed ? 180 : undefined,
                background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
                borderRadius: '0.75rem', padding: '0.375rem',
                zIndex: 100,
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                    background: 'none', border: 'none', color: 'var(--color-red-400)',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{
        flex: 1,
        marginLeft: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.2s ease',
      }} className="main-content" data-collapsed={collapsed ? '1' : '0'}>
        {/* Top bar */}
        <header style={{
          height: 64,
          background: 'rgba(15, 18, 32, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
              padding: '0.375rem', borderRadius: '0.5rem', display: 'flex',
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <GlobalSearch />

          <div style={{ flex: 1 }} />

          {/* Notif bell */}
          <NotificationBell />

          {/* Avatar */}
          <div style={{ cursor: 'pointer' }}>
            <Avatar size={36} />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-sidebar { left: 0 !important; }
          .main-content { margin-left: ${sidebarWidth}px !important; }
          .mobile-menu-btn { display: none !important; }
          .sidebar-collapse-btn { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: flex !important; }
          .sidebar-collapse-btn { display: none !important; }
        }
      `}</style>
    </div>
  )
}
