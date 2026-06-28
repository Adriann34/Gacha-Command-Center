import { useState, useRef, useEffect } from 'react'
import { Bell, Swords, Trophy, Sparkles, Calendar, X, BellOff } from 'lucide-react'
import { useReminders, type Reminder, type ReminderKind } from '../hooks/useReminders'

const KIND_ICON: Record<ReminderKind, React.ElementType> = {
  abyss: Swords,
  theater: Trophy,
  banner: Sparkles,
  event: Calendar,
}

const KIND_ACCENT: Record<ReminderKind, string> = {
  abyss: '#a78bfa',
  theater: '#f472b6',
  banner: 'var(--color-violet-400)',
  event: 'var(--color-cyan-400)',
}

function ReminderRow({ reminder, onDismiss }: { reminder: Reminder; onDismiss: (id: string) => void }) {
  const Icon = KIND_ICON[reminder.kind]
  const accent = KIND_ACCENT[reminder.kind]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '0.625rem', flexShrink: 0, marginTop: 1,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {reminder.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: accent, fontFamily: 'var(--font-display)', marginTop: '0.2rem' }}>
          {reminder.detail}
        </div>
      </div>
      <button
        onClick={() => onDismiss(reminder.id)}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
          padding: '0.25rem', borderRadius: '0.4rem', flexShrink: 0, display: 'flex',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { reminders, dismiss } = useReminders()
  const containerRef = useRef<HTMLDivElement>(null)

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

  const hasReminders = reminders.length > 0

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: 'relative', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
          borderRadius: '0.75rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Bell size={18} />
        {hasReminders && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 7, height: 7,
            borderRadius: '50%', background: 'var(--color-violet-500)', border: '1.5px solid var(--color-surface-800)',
          }} />
        )}
      </button>

      {open && (
        <div className="fade-in" style={{
          position: 'absolute', top: 'calc(100% + 0.625rem)', right: 0, width: 340, maxWidth: '90vw',
          background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '0.875rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Reminders
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              2 days or less
            </div>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {!hasReminders ? (
              <div style={{
                padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--color-text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem',
              }}>
                <BellOff size={22} style={{ opacity: 0.5 }} />
                <div style={{ fontSize: '0.8rem' }}>Nothing closing in soon. You're all caught up.</div>
              </div>
            ) : (
              reminders.map((r) => <ReminderRow key={r.id} reminder={r} onDismiss={dismiss} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
