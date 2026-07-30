import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../Avatar'
import NotificationBell from '../NotificationBell'
import GlobalSearch from '../GlobalSearch'
import {
  LayoutDashboard, ListChecks, UserCircle2, Settings,
  Menu, X, LogOut, ChevronDown, Terminal, Users,
} from 'lucide-react'
import { isDevUser } from '../../lib/devAccess'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/characters', icon: Users, label: 'My Characters' },
  { to: '/tracker', icon: ListChecks, label: 'Tracker' },
  { to: '/account', icon: UserCircle2, label: 'My Account' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

// Developer-only nav entry (Battle Chronicle raw payload inspector). Appended only for the dev
// account; the route + Worker endpoint enforce access independently (see devAccess.ts).
const devNavItem: NavItem = { to: '/dev/chronicle', icon: Terminal, label: 'Dev · Chronicle' }

const SIDEBAR_WIDTH_OPEN = 284
const SIDEBAR_WIDTH_COLLAPSED = 76

/** The eight-pointed gold sigil used as the app mark — an unmistakably Teyvat glyph
 *  that reads at any size and needs no external asset. */
function Sigil({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(211,188,142,.55))' }}>
      <defs>
        <linearGradient id="sigil-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0dcac" />
          <stop offset="1" stopColor="#a4854c" />
        </linearGradient>
      </defs>
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="url(#sigil-grad)" />
      <path d="M20 9 L22 18 L31 20 L22 22 L20 31 L18 22 L9 20 L18 18 Z" fill="#12182a" opacity=".55" />
    </svg>
  )
}

export default function DashboardLayout() {
  // Mobile off-canvas drawer state (toggled by the header menu button).
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // Desktop hover-to-expand: the sidebar sits as a slim icon rail by default and
  // widens into the full labelled sidebar only while the cursor is over it. There
  // is no manual collapse toggle anymore — collapsed IS the resting state.
  const [hovered, setHovered] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // "Expanded" = show the full labelled sidebar. On desktop that happens on hover;
  // on mobile the drawer always opens fully, so its open state forces expansion.
  const expanded = hovered || sidebarOpen

  const handleLogout = async () => {
    await logout()
    navigate('/signin')
  }

  const sidebarWidth = expanded ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_COLLAPSED

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarWidth,
          background: 'linear-gradient(180deg, rgba(18,24,41,0.98), rgba(13,17,28,0.98))',
          borderRight: '1px solid var(--gold-line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? 0 : '-280px',
          bottom: 0,
          zIndex: 50,
          transition: 'left 0.25s ease, width 0.2s ease',
          overflow: 'hidden',
          backdropFilter: 'blur(6px)',
          boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
        }}
        className="lg-sidebar"
      >
        {/* Logo */}
        <div style={{
          padding: expanded ? '1.375rem 1.25rem' : '1.375rem 0',
          display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sigil size={38} />
            {expanded && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-gold-bright)', lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  Gacha Command Center
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Genshin Impact Companion</div>
              </div>
            )}
          </div>
        </div>

        {/* Diamond divider */}
        {expanded && (
          <div style={{ position: 'relative', height: 1, margin: '0.25rem 1.25rem 1rem', background: 'linear-gradient(90deg, transparent, var(--gold-line), transparent)' }}>
            <span style={{ position: 'absolute', left: '50%', top: -3, width: 7, height: 7, transform: 'translateX(-50%) rotate(45deg)', border: '1px solid var(--gold-line)', background: 'var(--color-surface-800)' }} />
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: expanded ? '0 0.85rem' : '0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: expanded ? 0 : '0.5rem' }}>
          {expanded && (
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.22em', textTransform: 'uppercase', padding: '0 0.5rem 0.65rem', whiteSpace: 'nowrap' }}>
              Main Menu
            </div>
          )}
          {(isDevUser(user) ? [...navItems, devNavItem] : navItems).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              title={!expanded ? label : undefined}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={!expanded ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : undefined}
            >
              <Icon size={19} strokeWidth={1.7} style={{ flexShrink: 0 }} />
              {expanded && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: expanded ? '1rem 0.85rem' : '1rem 0.5rem', marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: expanded ? '0.55rem 0.625rem' : '0.5rem', borderRadius: '0.5rem',
              cursor: 'pointer', transition: 'background 0.2s',
              position: 'relative', justifyContent: expanded ? 'flex-start' : 'center',
              border: '1px solid var(--gold-line-soft)', background: 'rgba(255,255,255,0.02)',
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(211,188,142,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
          >
            <Avatar size={34} />
            {expanded && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.displayName ?? 'Traveler'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
              </>
            )}

            {userMenuOpen && (
              <div className="card" style={{
                position: 'absolute', bottom: '110%', left: 0, right: expanded ? 0 : 'auto',
                width: expanded ? undefined : 180,
                padding: '0.375rem',
                zIndex: 100,
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                    background: 'none', border: 'none', color: 'var(--color-red-400)',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,128,113,0.1)' }}
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
        minWidth: 0,
      }} className="main-content">
        {/* Top bar */}
        <header className="topbar" style={{
          height: 64,
          background: 'rgba(15, 18, 32, 0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--gold-line-soft)',
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
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer',
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

          {/* Game logo — Genshin Impact. The user's own photo already lives in the
              sidebar footer, so the top-right shows the game mark instead. */}
          <img
            src="/branding/genshin-logo.png"
            alt="Genshin Impact"
            style={{
              width: 36, height: 36, borderRadius: '0.4rem', objectFit: 'cover', flexShrink: 0,
              border: '1px solid var(--gold-line)', background: 'rgba(13,17,28,0.6)',
            }}
          />
        </header>

        {/* Page content */}
        <main className="page-main" style={{ flex: 1, padding: '2rem 1.75rem 4rem', maxWidth: 1500, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-sidebar { left: 0 !important; }
          .main-content { margin-left: ${SIDEBAR_WIDTH_COLLAPSED}px !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 640px) {
          .topbar { padding: 0 1rem !important; gap: 0.65rem !important; }
          .page-main { padding: 1.25rem 1rem 3rem !important; }
        }
      `}</style>
    </div>
  )
}
