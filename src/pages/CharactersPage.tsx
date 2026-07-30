import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Sparkles, RefreshCw } from 'lucide-react'
import { useCharacterList } from '../hooks/useCharacterList'
import { ELEMENT_COLORS } from '../lib/genshinCharacters'
import { syncChronicle } from '../lib/hoyolab'
import type { CharacterEntry } from '../lib/hoyolab'

function PageHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>{eyebrow}</div>
          <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>{title}</h1>
        </div>
      </div>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.75rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>
    </>
  )
}

function CharacterCard({ character, onClick }: { character: CharacterEntry; onClick: () => void }) {
  const [iconFailed, setIconFailed] = useState(false)
  const accent = ELEMENT_COLORS[character.element as keyof typeof ELEMENT_COLORS] ?? ELEMENT_COLORS.Unknown

  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 10%, var(--color-surface-900)), var(--color-surface-800))`,
        border: '1px solid var(--gold-line)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--gold-line)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.28)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.borderColor = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div style={{ position: 'relative', paddingTop: '75%', background: 'rgba(0,0,0,0.15)' }}>
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${accent} 20%, transparent), transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'grid', placeItems: 'center' }}>
          {!iconFailed ? (
            <img
              src={character.icon}
              alt={character.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setIconFailed(true)}
            />
          ) : (
            <img
              src={character.sideIcon}
              alt={character.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        <div style={{
          position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent} 65%)`,
          boxShadow: `0 0 6px ${accent}`, border: '1px solid rgba(255,255,255,0.35)',
        }} />
      </div>
      <div style={{ padding: '0.5rem 0.625rem 0.6rem' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
          color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', marginBottom: '0.2rem',
        }}>
          {character.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Lv.{character.level}
          </span>
          <span style={{ color: '#c9962e', fontSize: '0.65rem', letterSpacing: '1px' }}>
            {'★'.repeat(character.rarity)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CharactersPage() {
  const navigate = useNavigate()
  const { characters, loaded } = useCharacterList()
  const [syncing, setSyncing] = useState(false)
  const autoSynced = useRef(false)

  useEffect(() => {
    if (!loaded || characters.length > 0 || autoSynced.current) return
    autoSynced.current = true
    setSyncing(true)
    syncChronicle(false).catch(() => {}).finally(() => setSyncing(false))
  }, [loaded, characters.length])

  if (!loaded) {
    return (
      <div className="fade-in">
        <PageHead eyebrow="Your characters" title="My Characters" />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          Loading your characters...
        </div>
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className="fade-in">
        <PageHead eyebrow="Your characters" title="My Characters" />
        <div className="ornate" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          {syncing ? (
            <>
              <RefreshCw size={36} className="spin" style={{ margin: '0 auto 1rem', opacity: 0.6, color: 'var(--color-gold)' }} />
              <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Syncing your characters...
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: 420, marginInline: 'auto' }}>
                Fetching your Genshin Impact roster from HoYoLAB.
              </p>
            </>
          ) : (
            <>
              <Sparkles size={40} style={{ margin: '0 auto 1rem', opacity: 0.6, color: 'var(--color-gold)' }} />
              <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                No characters synced yet
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 420, marginInline: 'auto' }}>
                Link your HoYoLAB account in Settings to pull your characters, weapons, and builds.
              </p>
              <button onClick={() => navigate('/settings')} className="btn-primary" style={{
                padding: '0.65rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem',
                fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-body)',
              }}>
                <SettingsIcon size={16} /> Go to Settings
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <PageHead eyebrow="Your characters" title="My Characters" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '0.75rem',
      }}>
        {characters.map((c) => (
          <CharacterCard key={c.id} character={c} onClick={() => navigate('/characters/' + c.id)} />
        ))}
      </div>
    </div>
  )
}
