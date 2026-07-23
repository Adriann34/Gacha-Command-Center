import { useState } from 'react'
import { Terminal, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react'
import { fetchRawChronicle, HoyoError } from '../lib/hoyolab'

// Developer-only inspector: dumps HoYoLAB's full, untouched dailyNote payload so new dashboard
// features can be planned against real field data. The route is email-gated in App.tsx (DevRoute)
// AND the underlying /hoyolab/raw Worker endpoint independently enforces the same email from the
// verified ID token — this page is just a convenient viewer for the linked developer's own account.

export default function DevChroniclePage() {
  const [raw, setRaw] = useState<unknown>(null)
  const [meta, setMeta] = useState<{ gameUid: string; server: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRawChronicle()
      setRaw(result.raw)
      setMeta({ gameUid: result.gameUid, server: result.server })
    } catch (e) {
      setError(e instanceof HoyoError ? e.message : 'Could not fetch the raw payload.')
      setRaw(null)
    }
    setLoading(false)
  }

  const copy = async () => {
    if (raw == null) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(raw, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <div className="fade-in">
      <div className="eyebrow" style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Terminal size={13} /> Developer tools
      </div>
      <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>Battle Chronicle — Raw Payload</h1>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.5rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem', maxWidth: 720, lineHeight: 1.6 }}>
        Fetches the complete, unnormalized <code>dailyNote</code> response from HoYoLAB for your own
        linked account, so you can inspect every available field (resin, expeditions, statistics,
        transformer, etc.) and decide what to surface next. This calls HoYoLAB live — it is not
        rate-limited by the dashboard's sync TTL, so use it sparingly.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={load} disabled={loading} className="btn-primary" style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem',
          borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
          <RefreshCw size={15} className={loading ? 'spin' : undefined} /> {loading ? 'Fetching…' : 'Fetch raw payload'}
        </button>
        {raw != null && (
          <button onClick={copy} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
            borderRadius: '0.75rem', background: 'rgba(13,17,28,0.6)', border: '1px solid var(--gold-line-soft)',
            color: 'var(--color-gold)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy JSON</>}
          </button>
        )}
        {meta && (
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            UID {meta.gameUid} · {meta.server}
          </span>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--color-red-400)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
        </div>
      )}

      {raw != null && (
        <pre style={{
          background: 'var(--color-surface-900, #0b0e18)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
          padding: '1.25rem', overflowX: 'auto', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--color-text-secondary)',
          fontFamily: 'monospace', maxHeight: '65vh',
        }}>
          {JSON.stringify(raw, null, 2)}
        </pre>
      )}
    </div>
  )
}
