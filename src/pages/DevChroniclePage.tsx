import { useState } from 'react'
import { Terminal, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react'
import { fetchRawChronicle, fetchRawCalendar, HoyoError, type RawPayloadResult } from '../lib/hoyolab'

// Developer-only inspector: dumps HoYoLAB's full, untouched payloads so new dashboard features can be
// planned against real field data. The route is email-gated in App.tsx (DevRoute) AND each underlying
// Worker endpoint independently enforces the same email from the verified ID token — this page is
// just a convenient viewer for the linked developer's own account.
//
// Two tabs:
//   • Real-Time Notes — the dailyNote payload (resin, expeditions, commissions, transformer, …)
//   • Event Calendar  — the act_calendar payload (character/weapon banners + events + challenges),
//                        the source for a richer Events Overview on the dashboard.

type TabKey = 'notes' | 'calendar'

interface TabDef {
  key: TabKey
  label: string
  code: string
  fetcher: () => Promise<RawPayloadResult>
  description: string
}

const TABS: TabDef[] = [
  {
    key: 'notes',
    label: 'Real-Time Notes',
    code: 'dailyNote',
    fetcher: fetchRawChronicle,
    description:
      'The complete, unnormalized dailyNote response — resin, expeditions, daily commissions, weekly bosses, realm currency and the parametric transformer.',
  },
  {
    key: 'calendar',
    label: 'Event Calendar',
    code: 'act_calendar',
    fetcher: fetchRawCalendar,
    description:
      'The full act_calendar response — character/weapon/chronicled banners plus current events and permanent challenges (Abyss, Theater, Stygian), each with rewards, timestamps and countdowns. Source for a richer Events Overview.',
  },
]

/** One tab's fetch-and-inspect panel. Both panels stay mounted (hidden via CSS when inactive) so a
 *  fetched payload survives tab switches — avoiding a redundant live HoYoLAB call. */
function RawPayloadPanel({ tab, hidden }: { tab: TabDef; hidden: boolean }) {
  const [result, setResult] = useState<RawPayloadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await tab.fetcher())
    } catch (e) {
      setError(e instanceof HoyoError ? e.message : 'Could not fetch the raw payload.')
      setResult(null)
    }
    setLoading(false)
  }

  const copy = async () => {
    if (result == null) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.raw, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <div style={{ display: hidden ? 'none' : 'block' }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem', maxWidth: 720, lineHeight: 1.6 }}>
        {tab.description} Calls HoYoLAB live via <code>{tab.code}</code> — it is not rate-limited by the
        dashboard's sync TTL, so use it sparingly.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={load} disabled={loading} className="btn-primary" style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem',
          borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
          <RefreshCw size={15} className={loading ? 'spin' : undefined} /> {loading ? 'Fetching…' : 'Fetch raw payload'}
        </button>
        {result != null && (
          <button onClick={copy} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
            borderRadius: '0.75rem', background: 'rgba(13,17,28,0.6)', border: '1px solid var(--gold-line-soft)',
            color: 'var(--color-gold)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy JSON</>}
          </button>
        )}
        {result != null && (
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            UID {result.gameUid} · {result.server}
          </span>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--color-red-400)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
        </div>
      )}

      {result != null && (
        <pre style={{
          background: 'var(--color-surface-900, #0b0e18)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
          padding: '1.25rem', overflowX: 'auto', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--color-text-secondary)',
          fontFamily: 'monospace', maxHeight: '65vh',
        }}>
          {JSON.stringify(result.raw, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function DevChroniclePage() {
  const [active, setActive] = useState<TabKey>('notes')

  return (
    <div className="fade-in">
      <div className="eyebrow" style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Terminal size={13} /> Developer tools
      </div>
      <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>Battle Chronicle — Raw Payload</h1>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.5rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const isActive = t.key === active
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.6rem', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
                background: isActive ? 'rgba(211,188,142,0.14)' : 'rgba(13,17,28,0.6)',
                border: `1px solid ${isActive ? 'var(--gold-line)' : 'var(--gold-line-soft)'}`,
                color: isActive ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Both panels stay mounted; the inactive one is hidden so its fetched payload persists. */}
      {TABS.map((t) => <RawPayloadPanel key={t.key} tab={t} hidden={t.key !== active} />)}
    </div>
  )
}
