import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, AlertCircle, Swords, Shield, Sparkles,
  Trophy, Drama, Settings as SettingsIcon, ExternalLink,
} from 'lucide-react'
import { useGenshinProfile } from '../hooks/useGenshinProfile'
import { useCharacterRoster } from '../hooks/useCharacterRoster'
import Avatar from '../components/Avatar'
import {
  fetchEnkaProfile, enkaIconUrl, EnkaError,
  type EnkaResponse, type EnkaAvatarInfo,
} from '../lib/enka'
import { getCharacterMeta, ELEMENT_COLORS, type CharacterMeta } from '../lib/genshinCharacters'
import { formatFightProp, fightPropLabel } from '../lib/genshinStats'

const REFRESH_KEYS = [
  'FIGHT_PROP_HP_MAX', 'FIGHT_PROP_ATTACK_MAX', 'FIGHT_PROP_DEFENSE_MAX',
  'FIGHT_PROP_ELEMENT_MASTERY', 'FIGHT_PROP_CRITICAL', 'FIGHT_PROP_CRITICAL_HURT',
  'FIGHT_PROP_CHARGE_EFFICIENCY',
]

/** Small glowing elemental Vision gem. */
function ElementGem({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 65%)`,
      boxShadow: `0 0 8px ${color}`, border: '1px solid rgba(255,255,255,0.35)',
    }} />
  )
}

/** Dark stat pill used on the ornate player-summary panel. */
function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
      padding: '0.75rem 0.5rem', borderRadius: '0.5rem', background: 'rgba(13,17,28,0.4)', border: '1px solid var(--gold-line-soft)', flex: '1 1 88px', minWidth: 88,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{label}</div>
    </div>
  )
}

/** Parchment character card in the wish-showcase style. */
function CharacterCard({ avatar, roster }: { avatar: EnkaAvatarInfo; roster: Record<string, CharacterMeta> }) {
  const meta = getCharacterMeta(avatar.avatarId, roster)
  const accent = ELEMENT_COLORS[meta.element]
  const level = avatar.propMap?.['4001']?.val ?? avatar.propMap?.['4001']?.ival
  const weaponEquip = avatar.equipList.find((e) => e.weapon)
  const artifacts = avatar.equipList.filter((e) => e.reliquary)
  const constellations = avatar.talentIdList?.length ?? 0
  const friendship = avatar.fetterInfo?.expLevel ?? 0
  const [iconFailed, setIconFailed] = useState(false)
  const showIconImage = meta.iconKey && !iconFailed
  const isR5 = meta.rarity === 5

  return (
    <div className="parchment stat-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '0.813rem', padding: '0.875rem 0.875rem 0.7rem', position: 'relative' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '0.5rem', flexShrink: 0, overflow: 'hidden',
          display: 'grid', placeItems: 'center',
          background: isR5
            ? 'radial-gradient(circle at 40% 30%, var(--r5-a), var(--r5-b))'
            : 'radial-gradient(circle at 40% 30%, var(--r4-a), var(--r4-b))',
          border: '1px solid rgba(0,0,0,0.15)',
        }}>
          {showIconImage ? (
            <img src={enkaIconUrl(meta.iconKey)} alt={meta.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setIconFailed(true)} />
          ) : (
            <Sparkles size={22} color="rgba(255,255,255,0.85)" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-parch-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meta.name}
            {!meta.resolved && (
              <span style={{ fontSize: '0.62rem', color: 'var(--color-parch-ink-dim)', fontWeight: 600, marginLeft: '0.4rem' }}>(unrecognized)</span>
            )}
          </div>
          {meta.resolved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.2rem 0', fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-parch-ink)' }}>
              <ElementGem color={accent} /> {meta.element} · {meta.weapon}
            </div>
          )}
          <div style={{ color: '#c9962e', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
            {meta.resolved ? '★'.repeat(meta.rarity) : ''}
            <span style={{ color: 'var(--color-parch-ink-dim)', marginLeft: meta.resolved ? '0.4rem' : 0 }}>C{constellations}</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-parch-ink)', flexShrink: 0 }}>Lv.{level ?? '?'}</div>
      </div>

      {!meta.resolved && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-parch-ink-dim)', padding: '0.5rem 0.875rem', background: 'rgba(74,66,49,0.06)' }}>
          Character ID {avatar.avatarId} isn't in the live database yet — usually resolves within a day.
        </div>
      )}

      {weaponEquip?.weapon && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.55rem 0.875rem', background: 'rgba(74,66,49,0.08)', fontSize: '0.75rem', color: 'var(--color-parch-ink)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, minWidth: 0 }}>
            <Swords size={13} style={{ flexShrink: 0, color: 'var(--color-gold-deep)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Weapon Lv.{weaponEquip.weapon.level}{weaponEquip.weapon.affixMap ? ` · R${(Object.values(weaponEquip.weapon.affixMap)[0] ?? 0) + 1}` : ''}
            </span>
          </span>
          <span style={{ color: '#c9962e', flexShrink: 0 }}>{'★'.repeat(weaponEquip.flat.rankLevel)}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', fontSize: '0.72rem', color: 'var(--color-parch-ink-dim)', borderTop: '1px solid rgba(74,66,49,0.12)' }}>
        <Shield size={13} style={{ flexShrink: 0 }} />
        {artifacts.length}/5 artifacts · Friendship {friendship}
      </div>

      {avatar.fightPropMap && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0 0.875rem 0.75rem' }}>
          {REFRESH_KEYS.filter((k) => avatar.fightPropMap[k] !== undefined).slice(0, 4).map((k) => (
            <div key={k} style={{ fontSize: '0.68rem', color: 'var(--color-parch-ink)', background: 'rgba(74,66,49,0.1)', padding: '0.2rem 0.45rem', borderRadius: '0.35rem' }}>
              {fightPropLabel(k)}: <span style={{ fontWeight: 700 }}>{formatFightProp(k, avatar.fightPropMap[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Reused page header: eyebrow + Cinzel title + title-rule. */
function PageHead({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>{eyebrow}</div>
          <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>{title}</h1>
        </div>
        {right}
      </div>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.75rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>
    </>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { genshinUid, loading: profileLoading } = useGenshinProfile()
  const { roster, loading: rosterLoading, unavailable: rosterUnavailable } = useCharacterRoster()
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
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Loading...</div>
  }

  if (!genshinUid) {
    return (
      <div className="fade-in">
        <PageHead eyebrow="Your character showcase" title="My Account" />
        <div className="ornate" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Sparkles size={40} style={{ margin: '0 auto 1rem', opacity: 0.6, color: 'var(--color-gold)' }} />
          <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>No Genshin UID connected yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 420, marginInline: 'auto' }}>
            Add your in-game UID in Settings to pull your characters, builds, weapons, and artifacts from your public Character Showcase.
          </p>
          <button onClick={() => navigate('/settings')} className="btn-primary" style={{
            padding: '0.65rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-body)',
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
      <PageHead
        eyebrow="Your character showcase"
        title="My Account"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastFetched && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => load(genshinUid)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem',
                borderRadius: '0.5rem', background: 'rgba(13,17,28,0.6)', border: '1px solid var(--gold-line)',
                color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="ornate" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} color="var(--color-red-400)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>Couldn't load your profile</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{error}</div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Loading your showcase...</div>
      )}

      {player && (
        <>
          {/* Player summary */}
          <div className="ornate" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, var(--color-gold-bright), var(--color-gold-deep))' }}>
                <Avatar size={64} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {player.nickname}
                </div>
                {player.signature && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>{player.signature}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', marginTop: '0.3rem', fontWeight: 700, letterSpacing: '0.02em' }}>UID {data?.uid} · AR {player.level} · World Level {player.worldLevel ?? '—'}</div>
              </div>
              <a
                href={`https://enka.network/u/${data?.uid}/`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--color-hydro)', textDecoration: 'none', fontWeight: 700 }}
              >
                View on Enka.Network <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <StatPill label="Achievements" value={player.finishAchievementNum ?? 0} accent="var(--color-gold-bright)" />
              <StatPill label="Abyss Floor" value={player.towerFloorIndex ? `${player.towerFloorIndex}-${player.towerLevelIndex ?? ''}` : '—'} accent="var(--color-electro)" />
              <StatPill label="Abyss Stars" value={player.towerStarIndex ?? 0} accent="var(--color-hydro)" />
              <StatPill label="Theater Act" value={player.theaterActIndex ?? '—'} accent="var(--color-pyro)" />
              <StatPill label="Theater Stars" value={player.theaterStarIndex ?? 0} accent="var(--color-anemo)" />
            </div>
          </div>

          {/* Showcase note */}
          {avatars.length === 0 && (
            <div className="ornate" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <Drama size={32} style={{ margin: '0 auto 0.875rem', opacity: 0.5, color: 'var(--color-gold)' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>No characters in your showcase</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                In-game, go to Profile → Character Showcase, add some characters, and make sure your profile is set to public. Then hit Refresh here.
              </p>
            </div>
          )}

          {avatars.length > 0 && (
            <>
              {!rosterLoading && rosterUnavailable && (
                <div className="ornate" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 1.125rem', marginBottom: '1.25rem' }}>
                  <AlertCircle size={16} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    The live character database hasn't synced yet, so names/elements below may show as
                    "unrecognized" until it does. This updates automatically — no action needed.
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                <h2 className="section-heading" style={{ fontSize: '1.05rem' }}>Character Showcase</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{avatars.length} character{avatars.length !== 1 ? 's' : ''}</span>
              </div>
              {avatars.length >= 12 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>
                  This is your in-game Character Showcase, capped at 12 slots by Genshin itself — to feature a
                  different roster, change which characters are showcased in-game (Profile → Edit Profile →
                  Character Showcase), then hit Refresh here.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginTop: avatars.length >= 12 ? 0 : '0.5rem' }}>
                {avatars.map((a) => <CharacterCard key={a.avatarId} avatar={a} roster={roster} />)}
              </div>
            </>
          )}

          <div className="ornate" style={{ marginTop: '1.75rem', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={13} color="var(--color-gold)" />
              Data from your in-game Character Showcase via Enka.Network — refresh in-game and tap Refresh here to update.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
