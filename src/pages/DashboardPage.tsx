import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Swords, Trophy, Sparkles, Calendar, AlertTriangle,
  Settings as SettingsIcon, ExternalLink, Clock,
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

function ResetCard({ icon: Icon, label, target, accent, periodNote }: {
  icon: React.ElementType; label: string; target: Date; accent: string; periodNote: string
}) {
  const countdown = useCountdown(target)
  return (
    <div className="card stat-card" style={{ padding: '1.5rem', flex: 1, minWidth: 240 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '0.75rem',
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={accent} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0f2ff' }}>{label}</div>
          <div style={{ fontSize: '0.72rem', color: '#4a5578' }}>{periodNote}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: accent }}>
        {countdown}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#4a5578', marginTop: '0.25rem' }}>
        Resets {target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at 4:00 AM server time
      </div>
    </div>
  )
}

function BannerCard({ banner }: { banner: GameBanner }) {
  const endDate = safeDate(banner.endDate)
  const countdown = useCountdownWithSeconds(endDate)
  const days = daysUntil(banner.endDate)
  const urgent = days !== null && days <= 3

  return (
    <div className="card stat-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f0f2ff' }}>{banner.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#a78bfa', marginTop: '0.2rem' }}>{banner.characters.join(' · ')}</div>
        </div>
        {banner.imageUrl && (
          <img src={banner.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: '0.625rem', objectFit: 'cover', flexShrink: 0 }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#4a5578' }}>
          {endDate ? `Ends ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'End date unavailable'}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px',
          background: urgent ? 'rgba(248,113,113,0.12)' : 'rgba(139,92,246,0.12)',
          color: urgent ? '#f87171' : '#a78bfa',
          fontFamily: 'Space Grotesk, sans-serif',
        }}>
          {countdown ?? '—'}
        </span>
      </div>
    </div>
  )
}

function EventCard({ event, upcoming }: { event: GameEvent; upcoming: boolean }) {
  const relevantDate = safeDate(upcoming ? event.startDate : event.endDate)
  const countdown = useCountdownWithSeconds(relevantDate)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 0',
      borderBottom: '1px solid #1e2640',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '0.625rem', flexShrink: 0,
        background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={16} color="#22d3ee" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f0f2ff' }}>{event.name}</div>
        <div style={{ fontSize: '0.72rem', color: '#4a5578' }}>
          {relevantDate
            ? `${upcoming ? 'Starts' : 'Ends'} ${relevantDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : 'Date unavailable'}
        </div>
      </div>
      <span style={{ fontSize: '0.72rem', color: '#8892b0', flexShrink: 0, fontFamily: 'Space Grotesk, sans-serif' }}>
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
  const [greeting, setGreeting] = useState('')

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
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#8892b0', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>{greeting}, {firstName}</p>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 700, color: '#f0f2ff', margin: 0 }}>
            Teyvat Overview
          </h1>
        </div>
        {schedule?.currentVersion && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1.125rem',
            borderRadius: '0.875rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}>
            <Sparkles size={16} color="#a78bfa" />
            <span style={{ fontSize: '0.85rem', color: '#f0f2ff', fontWeight: 600 }}>
              v{schedule.currentVersion.version} {schedule.currentVersion.name}
            </span>
          </div>
        )}
      </div>

      {!genshinUid && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem',
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '0.875rem', marginBottom: '1.5rem',
        }}>
          <Sparkles size={18} color="#a78bfa" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: '#8892b0' }}>
            Connect your Genshin UID to see your character showcase on the <strong style={{ color: '#f0f2ff' }}>My Account</strong> page.
          </div>
          <button onClick={() => navigate('/settings')} style={{
            padding: '0.45rem 0.875rem', borderRadius: '0.625rem', background: '#141729',
            border: '1px solid #1e2640', color: '#a78bfa', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}>
            Set up
          </button>
        </div>
      )}

      {notConfigured && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1.25rem',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: '0.875rem', marginBottom: '1.5rem',
        }}>
          <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.875rem', color: '#f0f2ff', fontWeight: 500, marginBottom: '0.25rem' }}>
              Live schedule not connected yet
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>
              Version, banner, and event data populates here once the Cloudflare Worker is deployed and has run at least once. Abyss and Theater countdowns below work regardless, since those follow a fixed in-game schedule.
            </div>
          </div>
        </div>
      )}

      {/* Reset countdowns — always available, computed locally */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <ResetCard icon={Swords} label="Spiral Abyss" target={abyssReset.nextReset} accent="#a78bfa" periodNote="Resets on the 16th" />
        <ResetCard icon={Trophy} label="Imaginarium Theater" target={theaterReset.nextReset} accent="#f472b6" periodNote="Resets on the 1st" />
      </div>

      {/* Banners + Events row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Banners */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#f0f2ff', margin: 0 }}>
              Current Banners
            </h3>
            <a href="https://genshin.hoyoverse.com/en/news" target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Official news <ExternalLink size={12} />
            </a>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#4a5578', fontSize: '0.85rem' }}>Loading...</div>
          ) : !schedule?.currentBanners?.length ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#4a5578', fontSize: '0.85rem' }}>No banner data yet</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {schedule.currentBanners.map((b) => <BannerCard key={b.id} banner={b} />)}
            </div>
          )}

          {!!schedule?.upcomingBanners?.length && (
            <>
              <div style={{ fontSize: '0.78rem', color: '#4a5578', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.5rem 0 0.875rem' }}>
                Upcoming
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {schedule.upcomingBanners.map((b) => <BannerCard key={b.id} banner={b} />)}
              </div>
            </>
          )}
        </div>

        {/* Events */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#f0f2ff', margin: 0 }}>
              Events
            </h3>
            <Calendar size={16} color="#4a5578" />
          </div>
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4a5578', fontSize: '0.82rem' }}>Loading...</div>
            ) : !schedule?.currentEvents?.length && !schedule?.upcomingEvents?.length ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4a5578', fontSize: '0.82rem' }}>No event data yet</div>
            ) : (
              <>
                {schedule?.currentEvents?.map((e) => <EventCard key={e.id} event={e} upcoming={false} />)}
                {!!schedule?.upcomingEvents?.length && (
                  <div style={{ fontSize: '0.72rem', color: '#4a5578', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1rem 0 0.25rem' }}>
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
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <Clock size={20} color="#22d3ee" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0f2ff' }}>
              Next: v{schedule.nextVersion.version} {schedule.nextVersion.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4a5578' }}>
              Expected {new Date(schedule.nextVersion.releaseDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22d3ee', fontFamily: 'Space Grotesk, sans-serif' }}>
            {daysUntil(schedule.nextVersion.releaseDate) ?? '—'}d
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/settings')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none',
          color: '#4a5578', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
          <SettingsIcon size={13} /> Server region: {server ?? 'America'}
        </button>
      </div>
    </div>
  )
}
