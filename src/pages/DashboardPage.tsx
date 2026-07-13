import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Swords, Trophy, Sparkles, AlertTriangle,
  Settings as SettingsIcon, ExternalLink, Clock, Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGenshinProfile } from '../hooks/useGenshinProfile'
import { useGameSchedule, type GameBanner, type GameEvent } from '../hooks/useGameSchedule'
import { useCountdown, useCountdownWithSeconds } from '../hooks/useCountdown'
import { getNextAbyssReset, getNextTheaterReset } from '../lib/genshinResets'

/** Parses an ISO string into a Date, or null if it's missing/unparsable — never "Invalid Date". */
function safeDate(iso: string | undefined | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

function daysUntil(iso: string | undefined | null): number | null {
  const target = safeDate(iso)
  if (!target) return null
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000))
}

/** Section heading: Cinzel gold text with a leading diamond and an optional right-side link. */
function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '1rem' }}>
      <h2 className="section-heading" style={{ fontSize: '1.05rem' }}>{title}</h2>
      {action}
    </div>
  )
}

/** Ornate reset-countdown card — glyph + Cinzel timer, tinted by an elemental accent. */
function ResetCard({ icon: Icon, label, target, accent, periodNote, footNote, serverIsGuessed }: {
  icon: React.ElementType; label: string; target: Date; accent: string; periodNote: string; footNote: string; serverIsGuessed: boolean
}) {
  const countdown = useCountdown(target)
  return (
    <div className="ornate stat-card" style={{ padding: '1.25rem 1.375rem', flex: 1, minWidth: 240, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}28, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '0.5rem', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--gold-line)', color: accent,
          boxShadow: `inset 0 0 20px ${accent}22`,
        }}>
          <Icon size={21} strokeWidth={1.6} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{periodNote}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 700, color: accent, letterSpacing: '0.02em', position: 'relative' }}>
        {countdown}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{footNote}</div>
      {serverIsGuessed && (
        <div style={{ fontSize: '0.68rem', color: 'var(--color-gold)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={11} style={{ flexShrink: 0 }} />
          Assuming America server — set yours in Settings
        </div>
      )}
    </div>
  )
}

interface FeaturedItem { name: string; icon?: string; kind: 'character' | 'weapon' }

/** Every featured 5★ on a banner — characters AND weapons, in that order. A Chronicled/Lightrace
 *  pool can carry both at once, so we never drop one list in favour of the other. */
function bannerFeatured(banner: GameBanner): FeaturedItem[] {
  const chars = banner.characters.map((name, i) => ({ name, icon: banner.characterIcons?.[i], kind: 'character' as const }))
  const weps = banner.weapons.map((name, i) => ({ name, icon: banner.weaponIcons?.[i], kind: 'weapon' as const }))
  return [...chars, ...weps]
}

/** The wish category label, derived dynamically. We first trust any wish-type wording the worker
 *  stored on the doc (`name`, or an optional `type`) — so a banner literally titled "Lightrace
 *  Wish" shows exactly that — and only fall back to a structural guess when the doc just holds the
 *  featured item name(s). */
function bannerCategory(banner: GameBanner): string {
  const raw = `${banner.name ?? ''} ${(banner as { type?: string }).type ?? ''}`.toLowerCase()
  if (raw.includes('lightrace')) return 'Lightrace Wish'
  if (raw.includes('chronicled')) return 'Chronicled Wish'
  if (raw.includes('weapon')) return 'Weapon Event Wish'
  if (raw.includes('character')) return 'Character Event Wish'
  // Structural fallback: 2 weapons = weapon banner, a bigger/mixed 5★ pool = chronicled.
  const nc = banner.characters.length, nw = banner.weapons.length
  if (nc === 0 && nw > 0) return 'Weapon Event Wish'
  if (nc + nw > 2 || (nc > 0 && nw > 0)) return 'Chronicled Wish'
  return 'Character Event Wish'
}

/** Chronicled/Lightrace pools (and any banner with more than two featured 5★) get the wide,
 *  show-everything layout instead of the compact single/pair card. */
function isPoolBanner(banner: GameBanner): boolean {
  const cat = bannerCategory(banner)
  if (cat === 'Chronicled Wish' || cat === 'Lightrace Wish') return true
  return bannerFeatured(banner).length > 2
}

/** A featured item's portrait art, with an initials/glyph fallback when the icon is missing or 404s. */
function PortraitImg({ item }: { item: FeaturedItem }) {
  const [failed, setFailed] = useState(false)
  if (item.icon && !failed) {
    return <img src={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setFailed(true)} />
  }
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
      {item.kind === 'weapon' ? '⚔' : (item.name.slice(0, 2).toUpperCase() || '★')}
    </span>
  )
}

/** Wish-screen style banner card for a standard 1–2 featured banner (character or weapon event). */
function BannerCard({ banner }: { banner: GameBanner }) {
  const endDate = safeDate(banner.endDate)
  const countdown = useCountdownWithSeconds(endDate)
  const days = daysUntil(banner.endDate)
  const urgent = days !== null && days <= 3
  const items = bannerFeatured(banner)
  const category = bannerCategory(banner)
  const portraitSize = items.length <= 1 ? 72 : 56

  return (
    <div className="stat-card" style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--gold-line)', background: 'var(--color-card)', display: 'flex', flexDirection: 'column' }}>
      {/* Rarity splash — one portrait per featured 5★ */}
      <div style={{
        height: 118, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
        background: 'radial-gradient(circle at 50% 15%, var(--r5-a), var(--r5-b) 70%, #7c5c2e)',
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            width: portraitSize, height: portraitSize, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 0 0 3px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.35)',
            display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)',
          }}>
            <PortraitImg item={it} />
          </div>
        ))}
      </div>
      {/* Parchment plate */}
      <div className="parchment" style={{ border: 'none', borderRadius: 0, padding: '0.75rem 0.875rem 0.875rem', flex: 1 }}>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-parch-ink-dim)', fontWeight: 700, marginBottom: '0.2rem' }}>
          {category}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-parch-ink)', marginBottom: '0.35rem', lineHeight: 1.2 }}>
          {items.map((i) => i.name).join(' · ') || banner.name}
        </div>
        <div style={{ color: '#e0a52e', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '0.55rem' }}>★★★★★</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-parch-ink-dim)', gap: '0.4rem', flexWrap: 'wrap', rowGap: '0.35rem' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{endDate ? `Ends ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'End date unavailable'}</span>
          <span style={{
            fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 20, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            color: urgent ? '#a63a2a' : '#8a5a2a', background: urgent ? 'rgba(166,58,42,0.12)' : 'rgba(138,90,42,0.1)',
          }}>
            {countdown ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Wide banner card for a Chronicled/Lightrace pool: a gold header plus every featured 5★
 *  (characters and weapons) with its name — nothing hidden behind a "+N" badge. */
function PoolBannerCard({ banner }: { banner: GameBanner }) {
  const endDate = safeDate(banner.endDate)
  const countdown = useCountdownWithSeconds(endDate)
  const items = bannerFeatured(banner)
  const category = bannerCategory(banner)

  return (
    <div className="stat-card" style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--gold-line)', background: 'var(--color-card)' }}>
      {/* Gold header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.6rem 0.95rem',
        background: 'linear-gradient(90deg, var(--r5-b), var(--r5-a))',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: '#3a2c12', letterSpacing: '0.02em' }}>{category}</span>
        <span style={{ fontWeight: 800, fontSize: '0.72rem', color: '#3a2c12', background: 'rgba(255,255,255,0.35)', padding: '0.2rem 0.55rem', borderRadius: 20, fontVariantNumeric: 'tabular-nums' }}>
          {countdown ?? '—'}
        </span>
      </div>
      {/* Parchment body — every featured item + name */}
      <div className="parchment" style={{ border: 'none', borderRadius: 0, padding: '0.9rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {items.map((it, i) => (
            <div key={i} style={{ width: 66, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,0,0,0.15)',
                display: 'grid', placeItems: 'center',
                background: it.kind === 'weapon'
                  ? 'radial-gradient(circle at 40% 30%, #d9c48f, #9c7c3e)'
                  : 'radial-gradient(circle at 40% 30%, var(--r5-a), var(--r5-b))',
              }}>
                <PortraitImg item={it} />
              </div>
              <span style={{
                fontSize: '0.63rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-parch-ink)',
                textAlign: 'center', lineHeight: 1.15, maxWidth: 66,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {it.name}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--color-parch-ink-dim)' }}>
          {endDate ? `Ends ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'End date unavailable'} · {items.length} featured 5★
        </div>
      </div>
    </div>
  )
}

/** Renders a set of banners: compact 1–2 featured cards in a grid, plus any wide Chronicled/
 *  Lightrace pool cards stacked full-width below. */
function BannerGroup({ banners }: { banners: GameBanner[] }) {
  const compact = banners.filter((b) => !isPoolBanner(b))
  const pools = banners.filter((b) => isPoolBanner(b))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {compact.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {compact.map((b) => <BannerCard key={b.id} banner={b} />)}
        </div>
      )}
      {pools.map((b) => <PoolBannerCard key={b.id} banner={b} />)}
    </div>
  )
}

function EventCard({ event, upcoming }: { event: GameEvent; upcoming: boolean }) {
  const relevantDate = safeDate(upcoming ? event.startDate : event.endDate)
  const countdown = useCountdownWithSeconds(relevantDate)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.813rem', padding: '0.813rem 0',
      borderBottom: '1px solid var(--gold-line-soft)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '0.5rem', flexShrink: 0,
        border: '1px solid var(--gold-line)', color: 'var(--color-hydro)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={17} strokeWidth={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{event.name}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          {relevantDate
            ? `${upcoming ? 'Starts' : 'Ends'} ${relevantDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : 'Date unavailable'}
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', flexShrink: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {countdown ?? '—'}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { genshinUid, server } = useGenshinProfile()
  const { schedule, loading, notConfigured } = useGameSchedule()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState('Welcome back')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler'
  const abyssReset = getNextAbyssReset(server ?? 'os_usa')
  const theaterReset = getNextTheaterReset(server ?? 'os_usa')

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>{greeting}, {firstName}</div>
          <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>Teyvat Overview</h1>
        </div>
        {schedule?.currentVersion && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.6rem 1.125rem',
            borderRadius: '0.5rem', background: 'linear-gradient(90deg, rgba(211,188,142,0.16), rgba(211,188,142,0.04))',
            border: '1px solid var(--gold-line)',
          }}>
            <Star size={15} color="var(--color-gold)" fill="var(--color-gold)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gold-bright)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              v{schedule.currentVersion.version} · {schedule.currentVersion.name}
            </span>
          </div>
        )}
      </div>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.75rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>

      {!genshinUid && (
        <div className="ornate" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <Sparkles size={18} color="var(--color-gold)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Connect your Genshin UID to see your character showcase on the <strong style={{ color: 'var(--color-text-primary)' }}>My Account</strong> page.
          </div>
          <button onClick={() => navigate('/settings')} style={{
            padding: '0.45rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(13,17,28,0.6)',
            border: '1px solid var(--gold-line)', color: 'var(--color-gold)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, flexShrink: 0,
          }}>
            Set up
          </button>
        </div>
      )}

      {notConfigured && (
        <div className="ornate" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '0.25rem' }}>
              Live schedule not connected yet
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Version, banner, and event data populates here once the Cloudflare Worker is deployed and has run at least once. Abyss and Theater countdowns below work regardless, since those follow a fixed in-game schedule.
            </div>
          </div>
        </div>
      )}

      {/* Reset countdowns — always available, computed locally */}
      <SectionHeading title="Reset Countdowns" />
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <ResetCard
          icon={Swords} label="Spiral Abyss" target={abyssReset.nextReset} accent="var(--color-electro)"
          periodNote="Resets on the 16th"
          footNote={`Resets ${abyssReset.nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · 04:00 server`}
          serverIsGuessed={!server}
        />
        <ResetCard
          icon={Trophy} label="Imaginarium Theater" target={theaterReset.nextReset} accent="var(--color-pyro)"
          periodNote="Resets on the 1st"
          footNote={`Resets ${theaterReset.nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · 04:00 server`}
          serverIsGuessed={!server}
        />
      </div>

      {/* Banners + Events row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.75rem' }} className="dash-two-col">
        {/* Banners */}
        <div>
          <SectionHeading
            title="Current Banners"
            action={
              <a href="https://genshin.hoyoverse.com/en/news" target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--color-hydro)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                Official news <ExternalLink size={12} />
              </a>
            }
          />
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading...</div>
          ) : !schedule?.currentBanners?.length ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No banner data yet</div>
          ) : (
            <BannerGroup banners={schedule.currentBanners} />
          )}

          {!!schedule?.upcomingBanners?.length && (
            <>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '1.5rem 0 0.875rem' }}>
                Upcoming
              </div>
              <BannerGroup banners={schedule.upcomingBanners} />
            </>
          )}
        </div>

        {/* Events */}
        <div>
          <SectionHeading title="Events" />
          <div className="ornate" style={{ padding: '0.5rem 1.125rem 1rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Loading...</div>
            ) : !schedule?.currentEvents?.length && !schedule?.upcomingEvents?.length ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No event data yet</div>
            ) : (
              <>
                {schedule?.currentEvents?.map((e) => <EventCard key={e.id} event={e} upcoming={false} />)}
                {!!schedule?.upcomingEvents?.length && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '1rem 0 0.25rem' }}>
                    Upcoming
                  </div>
                )}
                {schedule?.upcomingEvents?.map((e) => <EventCard key={e.id} event={e} upcoming />)}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Next version */}
      {schedule?.nextVersion && (
        <div className="ornate" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: '0.5rem', flexShrink: 0, border: '1px solid var(--gold-line)', color: 'var(--color-hydro)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} strokeWidth={1.6} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              Next: v{schedule.nextVersion.version} · {schedule.nextVersion.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Expected {new Date(schedule.nextVersion.releaseDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gold-bright)', fontFamily: 'var(--font-display)' }}>
            {daysUntil(schedule.nextVersion.releaseDate) ?? '—'}d
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/settings')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none',
          color: 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          <SettingsIcon size={13} /> Server region: {server ?? 'America'}
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
