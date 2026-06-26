import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, AlertCircle, Swords, Shield, Sparkles,
  Trophy, Drama, Settings as SettingsIcon, ExternalLink,
} from 'lucide-react'
import { useGenshinProfile } from '../hooks/useGenshinProfile'
import {
  fetchEnkaProfile, enkaIconUrl, EnkaError,
  type EnkaResponse, type EnkaAvatarInfo,
} from '../lib/enka'
import { getCharacterMeta, ELEMENT_COLORS } from '../lib/genshinCharacters'
import { formatFightProp, fightPropLabel } from '../lib/genshinStats'

const REFRESH_KEYS = [
  'FIGHT_PROP_HP_MAX', 'FIGHT_PROP_ATTACK_MAX', 'FIGHT_PROP_DEFENSE_MAX',
  'FIGHT_PROP_ELEMENT_MASTERY', 'FIGHT_PROP_CRITICAL', 'FIGHT_PROP_CRITICAL_HURT',
  'FIGHT_PROP_CHARGE_EFFICIENCY',
]

function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
      padding: '0.75rem 0.5rem', borderRadius: '0.75rem', background: '#141729', border: '1px solid #1e2640', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#4a5578', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{label}</div>
    </div>
  )
}

function CharacterCard({ avatar }: { avatar: EnkaAvatarInfo }) {
  const meta = getCharacterMeta(avatar.avatarId)
  const accent = ELEMENT_COLORS[meta.element]
  const level = avatar.propMap?.['4001']?.val ?? avatar.propMap?.['4001']?.ival
  const weaponEquip = avatar.equipList.find((e) => e.weapon)
  const artifacts = avatar.equipList.filter((e) => e.reliquary)
  const constellations = avatar.talentIdList?.length ?? 0
  const friendship = avatar.fetterInfo?.expLevel ?? 0

  return (
    <div className="card stat-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '0.875rem', flexShrink: 0,
          background: `${accent}18`, border: `1.5px solid ${accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {meta.iconKey ? (
            <img
              src={enkaIconUrl(meta.iconKey)}
              alt={meta.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <Sparkles size={22} color={accent} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f0f2ff' }}>{meta.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span style={{ fontSize: '0.72rem', color: accent, fontWeight: 600 }}>{meta.element}</span>
            <span style={{ fontSize: '0.7rem', color: '#4a5578' }}>· {meta.weapon}</span>
            <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>{'★'.repeat(meta.rarity)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#f0f2ff' }}>Lv.{level ?? '?'}</div>
          <div style={{ fontSize: '0.68rem', color: '#4a5578' }}>C{constellations} · Friend {friendship}</div>
        </div>
      </div>

      {weaponEquip?.weapon && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem', borderRadius: '0.625rem', background: '#0f1220' }}>
          <Swords size={14} color="#8892b0" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.78rem', color: '#8892b0' }}>
            Weapon Lv.{weaponEquip.weapon.level}{weaponEquip.weapon.affixMap ? ` · R${(Object.values(weaponEquip.weapon.affixMap)[0] ?? 0) + 1}` : ''}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>{'★'.repeat(weaponEquip.flat.rankLevel)}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Shield size={14} color="#4a5578" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: '0.75rem', color: '#4a5578' }}>{artifacts.length}/5 artifact pieces equipped</span>
      </div>

      {avatar.fightPropMap && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {REFRESH_KEYS.filter((k) => avatar.fightPropMap[k] !== undefined).slice(0, 4).map((k) => (
            <div key={k} style={{ fontSize: '0.7rem', color: '#8892b0', background: '#0f1220', padding: '0.25rem 0.5rem', borderRadius: '0.4rem' }}>
              {fightPropLabel(k)}: <span style={{ color: '#f0f2ff', fontWeight: 600 }}>{formatFightProp(k, avatar.fightPropMap[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { genshinUid, loading: profileLoading } = useGenshinProfile()
  const [data, setData] = useState<EnkaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchEnkaProfile(uid)
      setData(result)
      setLastFetched(new Date())
    } catch (e) {
      setError(e instanceof EnkaError ? e.message : 'Something went wrong fetching your profile.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (genshinUid) void load(genshinUid)
  }, [genshinUid, load])

  if (profileLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#4a5578' }}>Loading...</div>
  }

  if (!genshinUid) {
    return (
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#8892b0', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>Your character showcase</p>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 700, color: '#f0f2ff', margin: 0 }}>My Account</h1>
        </div>
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Sparkles size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, color: '#8b5cf6' }} />
          <p style={{ fontSize: '1rem', color: '#f0f2ff', marginBottom: '0.5rem', fontWeight: 600 }}>No Genshin UID connected yet</p>
          <p style={{ fontSize: '0.85rem', color: '#8892b0', marginBottom: '1.5rem', maxWidth: 420, marginInline: 'auto' }}>
            Add your in-game UID in Settings to pull your characters, builds, weapons, and artifacts from your public Character Showcase.
          </p>
          <button onClick={() => navigate('/settings')} className="btn-primary" style={{
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.875rem',
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'Inter, sans-serif',
          }}>
            <SettingsIcon size={16} /> Go to Settings
          </button>
        </div>
      </div>
    )
  }

  const player = data?.playerInfo
  const avatars = data?.avatarInfoList ?? []

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#8892b0', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>Your character showcase</p>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 700, color: '#f0f2ff', margin: 0 }}>My Account</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastFetched && (
            <span style={{ fontSize: '0.75rem', color: '#4a5578' }}>
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => load(genshinUid)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem',
              borderRadius: '0.75rem', background: '#141729', border: '1px solid #1e2640',
              color: '#a78bfa', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: '0.875rem', marginBottom: '1.5rem',
        }}>
          <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.875rem', color: '#f0f2ff', fontWeight: 500, marginBottom: '0.2rem' }}>Couldn't load your profile</div>
            <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>{error}</div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#4a5578' }}>Loading your showcase...</div>
      )}

      {player && (
        <>
          {/* Player summary */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700, color: 'white',
              }}>
                {player.nickname?.[0]?.toUpperCase() ?? 'T'}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#f0f2ff' }}>
                  {player.nickname}
                </div>
                {player.signature && <div style={{ fontSize: '0.8rem', color: '#8892b0', marginTop: '0.15rem' }}>{player.signature}</div>}
                <div style={{ fontSize: '0.75rem', color: '#4a5578', marginTop: '0.3rem' }}>UID {data?.uid} · AR {player.level} · World Level {player.worldLevel ?? '—'}</div>
              </div>
              <a
                href={`https://enka.network/u/${data?.uid}/`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#a78bfa', textDecoration: 'none' }}
              >
                View on Enka.Network <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <StatPill label="Achievements" value={player.finishAchievementNum ?? 0} accent="#fbbf24" />
              <StatPill label="Abyss Floor" value={player.towerFloorIndex ? `${Math.floor(player.towerFloorIndex / 10) || player.towerFloorIndex}-${player.towerLevelIndex ?? ''}` : '—'} accent="#a78bfa" />
              <StatPill label="Abyss Stars" value={player.towerStarIndex ?? 0} accent="#22d3ee" />
              <StatPill label="Theater Act" value={player.theaterActIndex ?? '—'} accent="#f472b6" />
              <StatPill label="Theater Stars" value={player.theaterStarIndex ?? 0} accent="#34d399" />
            </div>
          </div>

          {/* Showcase note */}
          {avatars.length === 0 && (
            <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <Drama size={32} style={{ margin: '0 auto 0.875rem', opacity: 0.4, color: '#8b5cf6' }} />
              <p style={{ fontSize: '0.9rem', color: '#8892b0', marginBottom: '0.375rem' }}>No characters in your showcase</p>
              <p style={{ fontSize: '0.8rem', color: '#4a5578' }}>
                In-game, go to Profile → Character Showcase, add some characters, and make sure your profile is set to public. Then hit Refresh here.
              </p>
            </div>
          )}

          {avatars.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#f0f2ff', margin: 0 }}>
                  Character Showcase
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#4a5578' }}>{avatars.length} character{avatars.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {avatars.map((a) => <CharacterCard key={a.avatarId} avatar={a} />)}
              </div>
            </>
          )}

          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: '0.875rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: '#4a5578', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={13} />
              Data from your in-game Character Showcase via Enka.Network — refresh in-game and tap Refresh here to update.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
