import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import {
  Search, LayoutDashboard, ListChecks, UserCircle2,
  Settings as SettingsIcon, X, CornerDownLeft,
} from 'lucide-react'

interface PageEntry {
  to: string
  icon: React.ElementType
  label: string
  keywords: string
}

const PAGES: PageEntry[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', keywords: 'home overview teyvat banners events version abyss theater reset' },
  { to: '/tracker', icon: ListChecks, label: 'Tracker', keywords: 'goals todo tasks farming wish planning exploration event' },
  { to: '/account', icon: UserCircle2, label: 'My Account', keywords: 'profile characters roster showcase uid' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings', keywords: 'server region notifications preferences genshin uid' },
]

interface GoalHit {
  id: string
  name: string
  description: string
  status: string
}

/** Lightweight shape of a goal doc as stored in Firestore — only the fields this
 * component actually reads, so we don't need to import the full Goal type from TrackerPage. */
interface GoalDocData {
  name?: string
  description?: string
  status?: string
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [goalHits, setGoalHits] = useState<GoalHit[]>([])
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Keyboard shortcut: Cmd/Ctrl+K focuses the search from anywhere. Setting `open`
  // here doesn't show the dropdown by itself (that also requires a non-empty term),
  // it just lets goals start prefetching right away instead of waiting for a keystroke.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lazily fetch goals the first time the search becomes active (typing, or the
  // Cmd/Ctrl+K shortcut) and the user is signed in — avoids a Firestore read on
  // every page load for a feature that may go unused.
  useEffect(() => {
    if (!open || goalsLoaded || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const q = query(collection(db, 'goals'), where('uid', '==', user.uid))
        const snap = await getDocs(q)
        if (cancelled) return
        const hits = snap.docs.map((d) => {
          const data = d.data() as GoalDocData
          return {
            id: d.id,
            name: data.name ?? '',
            description: data.description ?? '',
            status: data.status ?? 'Planned',
          }
        })
        setGoalHits(hits)
        setGoalsLoaded(true)
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { cancelled = true }
  }, [open, goalsLoaded, user])

  const handleChange = (value: string) => {
    setTerm(value)
    setOpen(value.trim().length > 0)
  }

  const matchedPages = useMemo(() => {
    const t = term.trim().toLowerCase()
    if (!t) return []
    return PAGES.filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(t))
  }, [term])

  const matchedGoals = useMemo(() => {
    const t = term.trim().toLowerCase()
    if (!t) return []
    return goalHits
      .filter((g) => g.name.toLowerCase().includes(t) || g.description.toLowerCase().includes(t))
      .slice(0, 6)
  }, [term, goalHits])

  const results = useMemo(
    () => [
      ...matchedPages.map((p) => ({ type: 'page' as const, page: p })),
      ...matchedGoals.map((g) => ({ type: 'goal' as const, goal: g })),
    ],
    [matchedPages, matchedGoals],
  )

  useEffect(() => { setActiveIndex(0) }, [term])

  const goToPage = (to: string) => {
    navigate(to)
    setOpen(false)
    setTerm('')
  }

  const goToGoal = (goalName: string) => {
    // Tracker reads ?q= on mount to pre-fill its own search box, so picking a
    // goal here jumps straight to it filtered, not just to a blank Tracker page.
    navigate(`/tracker?q=${encodeURIComponent(goalName)}`)
    setOpen(false)
    setTerm('')
  }

  const handleKeyNav = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (!r) return
      if (r.type === 'page') goToPage(r.page.to)
      else goToGoal(r.goal.name)
    }
  }

  return (
    <div ref={containerRef} style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
      <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        type="text"
        value={term}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyNav}
        placeholder="Search pages, goals..."
        className="input-dark"
        style={{
          paddingLeft: '2.25rem',
          paddingRight: term ? '2.25rem' : '3.25rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          fontSize: '0.8rem',
          borderRadius: '0.625rem',
        }}
      />
      {term ? (
        <button
          onClick={() => { setTerm(''); setOpen(false); inputRef.current?.focus() }}
          aria-label="Clear search"
          style={{
            position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
            padding: '0.2rem', display: 'flex', borderRadius: '0.4rem',
          }}
        >
          <X size={14} />
        </button>
      ) : (
        <kbd style={{
          position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-600)',
          border: '1px solid var(--color-border)', borderRadius: '0.35rem', padding: '0.1rem 0.35rem',
          fontFamily: 'var(--font-body)', pointerEvents: 'none',
        }}>
          ⌘K
        </kbd>
      )}

      {open && term.trim() && (
        <div className="fade-in" style={{
          position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0, minWidth: 280,
          background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '0.875rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 100, overflow: 'hidden',
          maxHeight: 360, overflowY: 'auto',
        }}>
          {matchedPages.length > 0 && (
            <div style={{ padding: '0.5rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.4rem 0.5rem' }}>
                Pages
              </div>
              {matchedPages.map((p, i) => {
                const Icon = p.icon
                const idx = i
                const active = idx === activeIndex
                return (
                  <button
                    key={p.to}
                    onClick={() => goToPage(p.to)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.55rem 0.625rem', borderRadius: '0.6rem', textAlign: 'left',
                      background: active ? 'var(--color-surface-600)' : 'none', border: 'none',
                      color: 'var(--color-text-primary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Icon size={15} color="var(--color-violet-400)" />
                    {p.label}
                    {active && <CornerDownLeft size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ padding: '0.5rem', borderTop: matchedPages.length > 0 ? '1px solid var(--color-border)' : 'none' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.4rem 0.5rem' }}>
              Tracker Goals
            </div>
            {!user ? (
              <div style={{ padding: '0.5rem 0.625rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Sign in to search your goals.
              </div>
            ) : matchedGoals.length === 0 ? (
              <div style={{ padding: '0.5rem 0.625rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {goalsLoaded ? 'No matching goals.' : 'Loading goals...'}
              </div>
            ) : (
              matchedGoals.map((g, i) => {
                const idx = matchedPages.length + i
                const active = idx === activeIndex
                return (
                  <button
                    key={g.id}
                    onClick={() => goToGoal(g.name)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.55rem 0.625rem', borderRadius: '0.6rem', textAlign: 'left',
                      background: active ? 'var(--color-surface-600)' : 'none', border: 'none',
                      color: 'var(--color-text-primary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <ListChecks size={15} color="var(--color-cyan-400)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{g.status}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
