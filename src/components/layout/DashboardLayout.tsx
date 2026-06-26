import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, ListChecks, UserCircle2, Settings,
  Sparkles, Bell, Search, Menu, X, LogOut, ChevronDown,
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

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/signin')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0c14' }}>
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
          width: 240,
          background: '#0f1220',
          borderRight: '1px solid #1e2640',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? 0 : '-260px',
          bottom: 0,
          zIndex: 50,
          transition: 'left 0.25s ease',
        }}
        className="lg-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid #1e2640' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={18} color="white" fill="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#f0f2ff', lineHeight: 1.2 }}>
                Gacha Command Center
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4a5578' }}>Genshin Impact Tracker</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4a5578', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
            Main Menu
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid #1e2640' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.5rem 0.625rem', borderRadius: '0.75rem',
              cursor: 'pointer', transition: 'background 0.2s',
              position: 'relative',
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#141729' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f2ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName ?? 'User'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4a5578', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <ChevronDown size={14} color="#4a5578" />

            {userMenuOpen && (
              <div style={{
                position: 'absolute', bottom: '110%', left: 0, right: 0,
                background: '#141729', border: '1px solid #1e2640',
                borderRadius: '0.75rem', padding: '0.375rem',
                zIndex: 100,
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                    background: 'none', border: 'none', color: '#f87171',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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
      }} className="main-content">
        {/* Top bar */}
        <header style={{
          height: 64,
          background: 'rgba(15, 18, 32, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e2640',
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
              background: 'none', border: 'none', color: '#8892b0', cursor: 'pointer',
              padding: '0.375rem', borderRadius: '0.5rem', display: 'flex',
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#4a5578' }} />
            <input
              type="text"
              placeholder="Search characters, tasks..."
              className="input-dark"
              style={{
                paddingLeft: '2.25rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                fontSize: '0.8rem',
                borderRadius: '0.625rem',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Notif bell */}
          <button style={{
            position: 'relative', background: '#141729', border: '1px solid #1e2640',
            borderRadius: '0.75rem', padding: '0.5rem', cursor: 'pointer', color: '#8892b0',
            display: 'flex', alignItems: 'center',
          }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 7, height: 7,
              borderRadius: '50%', background: '#8b5cf6', border: '1.5px solid #0f1220',
            }} />
          </button>

          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0,
          }}>
            {initials}
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
          .main-content { margin-left: 240px !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
