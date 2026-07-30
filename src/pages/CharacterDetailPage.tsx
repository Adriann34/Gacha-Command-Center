import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useCharacterList } from '../hooks/useCharacterList'
import { ELEMENT_COLORS } from '../lib/genshinCharacters'
import {
  fetchCharacterDetails,
  type CharacterEntry,
  type HoyoDetailCharacter,
  type HoyoPropInfo,
  type HoyoDetailArtifact,
  type HoyoCharacterSkill,
} from '../lib/hoyolab'

const WEAPON_TYPE_LABELS: Record<number, string> = {
  1: 'Sword', 10: 'Catalyst', 11: 'Claymore', 12: 'Bow', 13: 'Polearm',
}

function elementAccent(element: string): string {
  return ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] ?? ELEMENT_COLORS.Unknown
}

function statsBg(propertyType: number): string {
  if (propertyType === 20 || propertyType === 22 || propertyType === 23) return 'rgba(211,188,142,0.08)'
  return 'rgba(255,255,255,0.03)'
}

function statsColor(propertyType: number): string {
  if (propertyType === 20 || propertyType === 22 || propertyType === 23) return 'var(--color-gold-bright)'
  return 'var(--color-text-primary)'
}

function ArtifactCard({ artifact, propMap }: { artifact: HoyoDetailArtifact; propMap: Record<string, HoyoPropInfo> }) {
  const label = propMap[String(artifact.main_property.property_type)]?.name ?? `Stat #${artifact.main_property.property_type}`
  return (
    <div className="card" style={{ padding: '0.75rem', display: 'flex', gap: '0.625rem' }}>
      <img
        src={artifact.icon}
        alt={artifact.set.name}
        style={{ width: 48, height: 48, borderRadius: '0.4rem', flexShrink: 0, objectFit: 'cover', background: 'rgba(0,0,0,0.2)' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.375rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {artifact.set.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              {artifact.pos_name}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: elementAccent(artifact.main_property.property_type === 20 || artifact.main_property.property_type === 22 || artifact.main_property.property_type === 23 ? 'Pyro' : 'Unknown') }}>
              {label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {artifact.main_property.value}+{artifact.level}
            </div>
          </div>
        </div>
        {artifact.sub_property_list.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.5rem', marginTop: '0.375rem' }}>
            {artifact.sub_property_list.map((sp, i) => {
              const spLabel = propMap[String(sp.property_type)]?.name ?? `Stat #${sp.property_type}`
              const isGold = sp.property_type === 20 || sp.property_type === 22
              const dotCount = Math.min(sp.times, 6)
              return (
                <div key={i} style={{ fontSize: '0.65rem', color: isGold ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span>{spLabel} <strong>{sp.value}</strong></span>
                  {dotCount > 0 && (
                    <span style={{ display: 'inline-flex', gap: '0.1rem' }}>
                      {Array.from({ length: dotCount }, (_, d) => (
                        <span key={d} style={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: isGold ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                          display: 'inline-block',
                        }} />
                      ))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TalentCard({ skill }: { skill: HoyoCharacterSkill }) {
  return (
    <div className="card" style={{ padding: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flex: '1 1 0' }}>
      {skill.icon ? (
        <img
          src={skill.icon}
          alt={skill.name}
          style={{ width: 40, height: 40, borderRadius: '0.35rem', flexShrink: 0, objectFit: 'cover', background: 'rgba(0,0,0,0.2)' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: '0.35rem', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {skill.name}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)' }}>
          Lv. {skill.level}
        </div>
      </div>
    </div>
  )
}

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { characters, loaded } = useCharacterList()
  const characterId = Number(id)

  const listEntry: CharacterEntry | undefined = useMemo(
    () => characters.find((c) => c.id === characterId),
    [characters, characterId],
  )

  const [detail, setDetail] = useState<HoyoDetailCharacter | null>(null)
  const [propMap, setPropMap] = useState<Record<string, HoyoPropInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = (id: number) => {
    setLoading(true)
    setError(null)
    fetchCharacterDetails([id]).then((res) => {
      setDetail(res.list?.[0] ?? null)
      setPropMap(res.property_map ?? {})
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }

  useEffect(() => {
    if (!id || isNaN(characterId)) return
    loadDetail(characterId)
  }, [characterId])

  const totalFriendship = listEntry?.friendship ?? 0
  const accent = listEntry ? elementAccent(listEntry.element) : 'var(--color-gold)'

  function resolvePropLabel(propType: number): string {
    return propMap[String(propType)]?.name ?? `Stat #${propType}`
  }

  if (!loaded) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    )
  }

  if (!listEntry) {
    return (
      <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingTop: '3rem' }}>
        <Sparkles size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-gold)' }} />
        <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Character not found
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          This character isn't in your roster. Your data may need to sync — check My Characters.
        </p>
        <button onClick={() => navigate('/characters')} className="btn-primary" style={{
          padding: '0.65rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem',
          fontWeight: 700, fontFamily: 'var(--font-body)',
        }}>
          <ArrowLeft size={16} style={{ marginRight: '0.375rem' }} /> Back to My Characters
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <button
        onClick={() => navigate('/characters')}
        style={{
          background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem',
          fontWeight: 700, padding: 0, fontFamily: 'var(--font-body)', marginBottom: '1rem',
        }}
      >
        <ArrowLeft size={15} /> Back to My Characters
      </button>

      {characters.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          {characters.map((c) => {
            const isCurrent = c.id === characterId
            const chipAccent = elementAccent(c.element)
            return (
              <button
                key={c.id}
                onClick={() => navigate('/characters/' + c.id)}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0, padding: 0,
                  border: isCurrent ? `2px solid var(--color-gold-bright)` : `1px solid var(--gold-line)`,
                  background: isCurrent ? `radial-gradient(circle at 35% 30%, #ffffffcc, ${chipAccent} 65%)` : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer', overflow: 'hidden', boxShadow: isCurrent ? `0 0 10px ${chipAccent}` : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                title={c.name}
              >
                <img
                  src={c.icon}
                  alt={c.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isCurrent ? 1 : 0.5 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="ornate" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={18} color="var(--color-red-400)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>Couldn't load character details</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{error}</div>
          </div>
          <button
            onClick={() => loadDetail(characterId)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem',
              borderRadius: '0.4rem', background: 'rgba(211,188,142,0.1)', border: '1px solid var(--gold-line)',
              color: 'var(--color-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)', flexShrink: 0,
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      <section style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 15%, var(--color-surface-900)), var(--color-surface-800))`,
        borderRadius: 'var(--radius-card)', border: '1px solid var(--gold-line-soft)',
        padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40%', right: '-10%', width: '60%', height: '120%',
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 12%, transparent), transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ flexShrink: 0, width: 160, height: 160, borderRadius: '0.75rem', overflow: 'hidden', position: 'relative' }}>
          {detail?.base?.image ? (
            <img
              src={detail.base.image}
              alt={listEntry.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (detail?.base?.side_icon) img.src = detail.base.side_icon
                else img.style.display = 'none'
              }}
            />
          ) : listEntry.sideIcon ? (
            <img
              src={listEntry.sideIcon}
              alt={listEntry.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <Sparkles size={32} color="var(--color-gold)" style={{ opacity: 0.5 }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.45rem',
              borderRadius: '0.3rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              background: `color-mix(in srgb, ${accent} 25%, transparent)`, color: accent,
              border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }} />
              {listEntry.element}
            </span>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
              Lv. {detail?.base?.level ?? listEntry.level}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
            color: 'var(--color-text-primary)', margin: '0.25rem 0 0.15rem',
          }}>
            {listEntry.name}
          </h1>
          <div style={{ color: '#c9962e', fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            {'★'.repeat(listEntry.rarity)}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>
              {listEntry.element}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
              {WEAPON_TYPE_LABELS[detail?.base?.weapon_type ?? listEntry.weaponType] ?? 'Unknown'}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Friendship</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-gold)' }}>Lv. {totalFriendship}</span>
            </div>
            <div className="progress-bar" style={{ height: 6, maxWidth: 300 }}>
              <div className="progress-fill" style={{ width: `${Math.min((totalFriendship / 10) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      {detail && !loading && (
        <>
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Stats</h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem',
            }}>
              {detail.selected_properties.map((prop) => {
                const addVal = prop.add ? Number(prop.add) : 0
                return (
                  <div
                    key={prop.property_type}
                    className="card"
                    style={{
                      padding: '0.625rem 0.75rem', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', background: statsBg(prop.property_type),
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                        {resolvePropLabel(prop.property_type)}
                      </div>
                      {addVal > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-anemo)' }}>
                          {prop.base} + <span style={{ color: 'var(--color-anemo)' }}>{prop.add}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: statsColor(prop.property_type) }}>
                      {prop.final}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {detail.weapon?.name && (
            <section style={{ marginBottom: '1.75rem' }}>
              <h2 className="section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Weapon</h2>
              <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={detail.weapon.icon}
                  alt={detail.weapon.name}
                  style={{ width: 76, height: 76, borderRadius: '0.5rem', flexShrink: 0, objectFit: 'cover', background: 'rgba(0,0,0,0.2)' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {detail.weapon.name}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>
                      R{detail.weapon.affix_level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    {detail.weapon.type_name} · ★×{detail.weapon.rarity} · Lv. {detail.weapon.level}/{detail.weapon.promote_level * 10}
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                        {resolvePropLabel(detail.weapon.main_property.property_type)}
                      </span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {detail.weapon.main_property.final}
                      </div>
                    </div>
                    {detail.weapon.sub_property?.final && (
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                          {resolvePropLabel(detail.weapon.sub_property.property_type)}
                        </span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {detail.weapon.sub_property.final}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Artifacts</h2>
            {detail.relics.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No artifacts equipped
              </div>
            ) : (
              <>
                {(() => {
                  const setCounts: Record<string, { count: number; set: typeof detail.relics[0]['set'] }> = {}
                  for (const r of detail.relics) {
                    if (!setCounts[r.set.name]) setCounts[r.set.name] = { count: 0, set: r.set }
                    setCounts[r.set.name].count++
                  }
                  const entries = Object.entries(setCounts)
                  const mainStatChips = detail.relics
                    .filter((r) => r.pos === 3 || r.pos === 4 || r.pos === 5)
                    .map((r) => ({
                      pos: r.pos,
                      label: propMap[String(r.main_property.property_type)]?.name ?? `Stat #${r.main_property.property_type}`,
                    }))
                  return (
                    <>
                      {entries.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          {entries.map(([name, { count, set }]) => (
                            <div key={name} className="card" style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                                {name} ({count})
                              </div>
                              {set.affixes
                                .filter((a) => a.activation_number <= count)
                                .map((a) => (
                                  <div key={a.activation_number} style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem' }}>
                                    {a.activation_number}-Pc: {a.effect}
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {mainStatChips.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          {mainStatChips.map((chip) => (
                            <span key={chip.pos} className="badge badge-violet" style={{ fontSize: '0.6rem' }}>
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {detail.relics
                          .sort((a, b) => a.pos - b.pos)
                          .map((r) => (
                            <ArtifactCard key={r.id} artifact={r} propMap={propMap} />
                          ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </section>

          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Talents</h2>
            {detail.skills.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No talent data available
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {detail.skills
                  .filter((s) => s.skill_type === 1)
                  .slice(0, 3)
                  .map((s) => (
                    <TalentCard key={s.skill_id} skill={s} />
                  ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Constellations</h2>
            {detail.constellations.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No constellations unlocked
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 0, marginBottom: '0.5rem',
                }}>
                  {detail.constellations
                    .sort((a, b) => a.pos - b.pos)
                    .map((c, i) => {
                      const isActive = c.is_actived
                      const isLast = i === detail.constellations.length - 1
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                            display: 'grid', placeItems: 'center',
                            border: isActive ? '2px solid var(--color-gold-bright)' : '1px solid var(--color-text-muted)',
                            background: isActive
                              ? `radial-gradient(circle at 35% 30%, rgba(240,220,172,0.3), rgba(240,220,172,0.05))`
                              : 'rgba(0,0,0,0.3)',
                            boxShadow: isActive ? '0 0 12px rgba(240,220,172,0.4)' : 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                          }}>
                            <img
                              src={c.icon}
                              alt={c.name}
                              style={{
                                width: 26, height: 26, objectFit: 'contain',
                                opacity: isActive ? 1 : 0.35,
                                filter: isActive ? 'none' : 'grayscale(0.8)',
                              }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                          {!isLast && (
                            <div style={{
                              width: 24, height: 2,
                              background: isActive && detail.constellations[i + 1]?.is_actived
                                ? 'linear-gradient(90deg, var(--color-gold-bright), var(--color-gold-deep))'
                                : 'var(--color-text-muted)',
                              opacity: isActive && detail.constellations[i + 1]?.is_actived ? 1 : 0.3,
                            }} />
                          )}
                        </div>
                      )
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {detail.constellations.sort((a, b) => a.pos - b.pos).map((c) => (
                    <div key={c.id} style={{
                      fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace',
                      color: c.is_actived ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                      fontWeight: 700, textAlign: 'center', width: 44,
                    }}>
                      C{c.pos}
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-gold)', fontWeight: 700 }}>
                  C{detail.base?.actived_constellation_num ?? 0} Unlocked
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {loading && !detail && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading character details...
        </div>
      )}
    </div>
  )
}
