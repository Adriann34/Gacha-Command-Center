import { useEffect, useState } from 'react'
import { Clock, Check, ChevronRight, Timer, Gift } from 'lucide-react'
import type { CalendarEvent } from '../lib/hoyolab'

// The Events Overview list, powered by HoYoLAB's official act_calendar data (per-user, via the
// Battle Chronicle). Event end times are ABSOLUTE epoch timestamps, so "time remaining" is computed
// directly against the wall clock — no sync-age extrapolation needed (only progress values like Abyss
// stars are as-of-sync, and those don't tick). Renders limited-time events (act_list); the permanent
// challenges (Abyss / Theater) are surfaced by the enriched Reset Countdown cards instead.

/** A Date that ticks every `intervalMs` to keep the "time remaining" labels live. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** "8 d 2 h 55 min" / "2 h 55 min" / "55 min" / "<1 min" / "Ended" — matches the in-game wording. */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d} d`)
  if (h > 0) parts.push(`${h} h`)
  if (d === 0) parts.push(`${m} min`) // only show minutes when under a day, like the game
  return parts.join(' ') || '<1 min'
}

const GOLD = 'var(--color-gold-bright)'
const GREEN = 'var(--color-dendro)'
const MUTED = 'var(--color-text-muted)'

/** Left-edge accent + the right-hand status cell both key off the event's lifecycle state. */
function eventAccent(e: CalendarEvent): string {
  if (e.isFinished) return GREEN
  if (e.status === 1) return 'var(--gold-line-soft)'
  return GOLD
}

/** The reward chip (headline reward icon + amount), mirroring the in-game event card. */
function RewardChip({ event }: { event: CalendarEvent }) {
  const r = event.headlineReward
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', width: 46, flexShrink: 0 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '0.5rem', display: 'grid', placeItems: 'center',
        border: '1px solid var(--gold-line-soft)', background: 'rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {r?.icon
          ? <img src={r.icon} alt={r.name} title={r.name} style={{ width: 34, height: 34, objectFit: 'contain' }} />
          : <Gift size={18} color={MUTED} />}
      </div>
      {r && r.num > 0 && (
        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {r.num.toLocaleString()}
        </span>
      )}
    </div>
  )
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
function toRoman(n: number): string {
  return ROMAN[n] ?? String(n)
}

// Stygian Onslaught ships one medal per difficulty tier (numeral baked into the art). We host them
// under /public and map the payload's `difficulty` (1..6) to the matching medal. Tiers outside this
// range render nothing (the medal is omitted; the clear time still shows).
const STYGIAN_MEDALS: Record<number, string> = {
  1: '/icons/stygian/stygian-1.webp',
  2: '/icons/stygian/stygian-2.webp',
  3: '/icons/stygian/stygian-3.webp',
  4: '/icons/stygian/stygian-4.webp',
  5: '/icons/stygian/stygian-5.webp',
  6: '/icons/stygian/stygian-6.webp',
}

/** The Stygian Onslaught difficulty tier, drawn as the in-game medal icon for that tier. */
function DifficultyMedal({ tier }: { tier: number }) {
  const src = STYGIAN_MEDALS[tier]
  if (!src) return null
  return (
    <img
      src={src}
      alt={`Cleared Difficulty ${toRoman(tier)}`}
      title={`Cleared Difficulty ${toRoman(tier)}`}
      style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

/** The right-hand status cell: done / not-yet-available / best-time / doubles-left / in-progress. */
function StatusCell({ event }: { event: CalendarEvent }) {
  const base: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }

  if (event.isFinished) {
    return <span style={{ ...base, color: GREEN }}><Check size={18} strokeWidth={3} /></span>
  }
  if (event.status === 1) {
    return <span style={{ ...base, color: MUTED, fontWeight: 600 }}>Not Yet Available <ChevronRight size={14} /></span>
  }
  if (event.type === 'ActTypeHardChallenge' && (event.hardChallengeSeconds ?? 0) > 0) {
    // The app shows the cleared difficulty tier (a roman-numeral medal) beside the best clear time.
    // The payload's `icon` is empty, so we render the medal from `difficulty` ourselves.
    const tier = event.hardChallengeDifficulty ?? 0
    return (
      <span style={{ ...base, color: GOLD }}>
        {tier > 0 ? <DifficultyMedal tier={tier} /> : <Timer size={14} />}
        {event.hardChallengeSeconds}s <ChevronRight size={14} color={MUTED} />
      </span>
    )
  }
  if (event.type === 'ActTypeDouble' && event.doubleTotal) {
    return (
      <span style={{ ...base, color: GOLD }}>
        {event.doubleRemaining}<span style={{ color: MUTED, fontWeight: 400 }}>/{event.doubleTotal}</span> left <ChevronRight size={14} color={MUTED} />
      </span>
    )
  }
  return <span style={{ ...base, color: 'var(--color-text-secondary)' }}>In Progress <ChevronRight size={14} color={MUTED} /></span>
}

/** Sort key: active first, finished next, not-yet-available last — matching the in-game ordering. */
function lifecycleRank(e: CalendarEvent): number {
  if (e.status === 1) return 2
  if (e.isFinished) return 1
  return 0
}

const COLLAPSED_COUNT = 5

export default function EventsOverview({ events }: { events: CalendarEvent[] }) {
  const now = useNow(30_000)
  const [expanded, setExpanded] = useState(false)

  const sorted = [...events].sort((a, b) => lifecycleRank(a) - lifecycleRank(b))
  const canCollapse = sorted.length > COLLAPSED_COUNT
  const visible = expanded || !canCollapse ? sorted : sorted.slice(0, COLLAPSED_COUNT)

  if (events.length === 0) {
    return (
      <div className="ornate" style={{ padding: '2rem', textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
        No active events right now.
      </div>
    )
  }

  return (
    <div className="ornate" style={{ padding: '0.4rem 0.75rem' }}>
      {visible.map((e) => {
        const remaining = Math.max(0, Math.floor((e.endTimestamp * 1000 - now.getTime()) / 1000))
        const accent = eventAccent(e)
        return (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.7rem 0.6rem',
            borderBottom: '1px solid var(--gold-line-soft)', borderLeft: `3px solid ${accent}`,
            borderRadius: '0.3rem', marginBottom: '0.15rem',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: MUTED, marginTop: '0.15rem' }}>
                <Clock size={12} />
                {e.status === 1 ? 'Not started yet' : `Time Remaining: ${formatTimeRemaining(remaining)}`}
              </div>
            </div>
            <RewardChip event={e} />
            <div style={{ minWidth: 96, display: 'flex', justifyContent: 'flex-end' }}>
              <StatusCell event={e} />
            </div>
          </div>
        )
      })}

      {canCollapse && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            width: '100%', padding: '0.6rem', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-gold)', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
          }}
        >
          {expanded ? 'Collapse' : `Expand (${sorted.length - COLLAPSED_COUNT} more)`}
          <ChevronRight size={13} style={{ transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
        </button>
      )}
    </div>
  )
}

/** Small helper reused by the dashboard to describe a fixed challenge's progress (stars / act). */
export function challengeProgressLabel(challenge: CalendarEvent): { text: string; icon: 'star' | null; sub?: string } | null {
  if (challenge.type === 'ActTypeTower' && challenge.towerUnlocked) {
    return { text: `${challenge.towerMaxStar ?? 0}/${challenge.towerTotalStar ?? 0}`, icon: 'star' }
  }
  if (challenge.type === 'ActTypeRoleCombat' && challenge.theaterUnlocked) {
    return { text: `Act ${challenge.theaterMaxRound ?? 0}`, icon: null, sub: `Arcana ${challenge.theaterTarotFinished ?? 0}` }
  }
  return null
}
