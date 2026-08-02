import { useEffect, useState, useMemo, type ElementType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, RefreshCw, Sparkles, Heart, Star,
  Droplet, Flame, Snowflake, Wind, Zap, Leaf, Mountain,
  Sword, Axe, Crosshair, Anchor, Orbit, Gem, Swords,
  Flower, Feather, Hourglass, Wine, Crown, Shield, Lock, Layers,
} from 'lucide-react'
import { useCharacterList } from '../hooks/useCharacterList'
import { ELEMENT_COLORS } from '../lib/genshinCharacters'
import {
  fetchCharacterDetails,
  type CharacterEntry,
  type HoyoDetailCharacter,
  type HoyoPropInfo,
  type HoyoDetailArtifact,
} from '../lib/hoyolab'

const WEAPON_TYPE_LABELS: Record<number, string> = {
  1: 'Sword', 10: 'Catalyst', 11: 'Claymore', 12: 'Bow', 13: 'Polearm',
}

const WEAPON_ICONS: Record<number, ElementType> = {
  1: Sword, 10: Orbit, 11: Axe, 12: Crosshair, 13: Anchor,
}

const ELEMENT_ICONS: Record<string, ElementType> = {
  Pyro: Flame, Hydro: Droplet, Anemo: Wind, Electro: Zap, Dendro: Leaf, Cryo: Snowflake, Geo: Mountain,
}

const SKILL_TYPE_ICONS: Record<number, ElementType> = {
  1: Swords, 2: Zap, 3: Sparkles,
}

const ARTIFACT_SLOT_ICONS: Record<number, ElementType> = {
  1: Flower, 2: Feather, 3: Hourglass, 4: Wine, 5: Crown,
}

function elementAccent(element: string): string {
  return ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] ?? ELEMENT_COLORS.Unknown
}

function stripColorTags(text: string): string {
  return text.replace(/<color=#[0-9A-Fa-f]+>/g, '').replace(/<\/color>/g, '').replace(/\\n/g, '\n')
}

function ElementIcon({ element, size = 14 }: { element: string; size?: number }) {
  const Icon = ELEMENT_ICONS[element] ?? Sparkles
  return <Icon size={size} strokeWidth={1.7} />
}

function WeaponTypeIcon({ type, size = 16 }: { type: number; size?: number }) {
  const Icon = WEAPON_ICONS[type] ?? Gem
  return <Icon size={size} strokeWidth={1.7} />
}

function SkillFallbackIcon({ skillType, size = 14 }: { skillType: number; size?: number }) {
  const Icon = SKILL_TYPE_ICONS[skillType] ?? Star
  return <Icon size={size} strokeWidth={1.7} />
}

function skillKindLabel(skillType: number): string {
  if (skillType === 1) return 'Normal Attack'
  if (skillType === 2) return 'Elemental Skill'
  if (skillType === 3) return 'Elemental Burst'
  return 'Passive Talent'
}

function ArtifactCard({ artifact, propMap }: { artifact: HoyoDetailArtifact; propMap: Record<string, HoyoPropInfo> }) {
  const label = propMap[String(artifact.main_property.property_type)]?.name ?? `Stat #${artifact.main_property.property_type}`
  const SlotIcon = ARTIFACT_SLOT_ICONS[artifact.pos] ?? Gem
  return (
    <div className="detail-art">
      <div className="detail-art-top">
        <div className="detail-art-icon">
          {artifact.icon ? (
            <img
              src={artifact.icon}
              alt={artifact.set.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <SlotIcon size={17} strokeWidth={1.7} />
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="detail-art-stars">{'★'.repeat(artifact.rarity)}</div>
          <div className="detail-art-lv">Lv. {artifact.level}</div>
        </div>
      </div>
      <div className="detail-art-set">{artifact.set.name}</div>
      <div className="detail-art-mainlabel">{label}</div>
      <div className="detail-art-mainvalue">{artifact.main_property.value}</div>
      <div className="detail-art-divider" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {artifact.sub_property_list.map((sp, i) => {
          const spLabel = propMap[String(sp.property_type)]?.name ?? `Stat #${sp.property_type}`
          const gold = sp.property_type === 20 || sp.property_type === 22
          const dotCount = Math.min(sp.times, 6)
          return (
            <div key={i} className="detail-substat">
              <span
                className="detail-substat-name"
                style={{ color: gold ? 'var(--color-gold-bright)' : 'var(--color-text-muted)', fontWeight: gold ? 700 : 600 }}
              >
                {spLabel}
              </span>
              {dotCount > 0 && (
                <span
                  style={{
                    fontSize: '0.55rem', fontWeight: 700, color: 'var(--color-text-muted)', lineHeight: 1,
                    padding: '0.08rem 0.25rem', borderRadius: '0.2rem', flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {dotCount}
                </span>
              )}
              <span
                className="detail-substat-value"
                style={{ color: gold ? 'var(--color-gold-bright)' : 'var(--color-text-primary)', fontWeight: gold ? 700 : 600 }}
              >
                {sp.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const LAYOUT_CSS = `
.detail-page { max-width:1360px; margin:0 auto; width:100%; }

.detail-back {
  display:inline-flex; align-items:center; gap:8px; color:var(--color-gold);
  font-size:13.5px; font-weight:700; text-decoration:none; margin-bottom:20px;
  letter-spacing:.2px; background:none; border:none; cursor:pointer; padding:0;
  font-family:var(--font-body);
}
.detail-back:hover { color:var(--color-gold-bright); }

/* avatar rail */
.detail-rail-wrap { position:relative; margin-bottom:30px; }
.detail-rail { display:flex; gap:10px; overflow-x:auto; padding:4px 4px 14px; }
.detail-rail-item {
  flex:0 0 auto; width:56px; display:flex; flex-direction:column; align-items:center; gap:7px;
  cursor:pointer; position:relative; background:none; border:none; padding:0; font-family:inherit;
}
.detail-rail-avatar {
  width:52px; height:52px; border-radius:50%; overflow:hidden; position:relative;
  display:flex; align-items:center; justify-content:center; padding:0; margin:0; border:none; outline:none;
  transition:transform .18s ease, box-shadow .18s ease;
}
.detail-rail-item:hover .detail-rail-avatar { transform:translateY(-2px); }
.detail-rail-name {
  font-size:9.5px; color:var(--color-text-muted); text-align:center; line-height:1.1;
  max-width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.detail-rail-item.active .detail-rail-name { color:var(--color-gold-bright); }

/* hero */
.detail-hero {
  display:grid; grid-template-columns:300px 1fr; gap:24px;
  background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.55rem;
  padding:22px; margin-bottom:26px; overflow:hidden; position:relative;
}
.detail-hero::before {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(500px 320px at -10% 10%, rgba(63,189,241,0.08), transparent 60%);
}
.detail-portrait {
  position:relative; border-radius:0.5rem; overflow:hidden;
  border:1px solid var(--gold-line-soft); min-height:340px;
  display:flex; align-items:center; justify-content:center;
}
.detail-hero-badges { position:absolute; top:14px; left:14px; display:flex; gap:8px; z-index:2; }
.detail-hero-lv { position:absolute; top:14px; right:14px; z-index:2; }
.detail-pill {
  display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:9999px;
  font-size:11.5px; font-weight:700; letter-spacing:.4px; text-transform:uppercase;
  border:1px solid var(--gold-line); background:rgba(10,14,22,0.6); backdrop-filter:blur(4px);
}
.detail-pill-lv { color:var(--color-gold-bright); }
.detail-hero-info { display:flex; flex-direction:column; min-width:0; position:relative; z-index:1; }
.detail-eyebrow { color:var(--color-text-muted); font-size:12px; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }
.detail-char-name {
  font-family:var(--font-display); font-weight:700; font-size:2.5rem; letter-spacing:.5px;
  color:var(--color-text-primary); line-height:1.05; margin:0;
}
.detail-stars { display:flex; gap:3px; margin:14px 0 12px; color:#c9962e; font-size:1rem; letter-spacing:2px; }
.detail-tag-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
.detail-tag {
  display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:0.5rem;
  font-size:12px; font-weight:700; letter-spacing:.3px;
}
.detail-tag-weapon { background:rgba(211,188,142,0.12); color:var(--color-gold-bright); }

.detail-cv {
  margin-top:16px; display:flex; align-items:center; gap:14px;
  background:linear-gradient(135deg, rgba(211,188,142,0.10), rgba(63,189,241,0.06));
  border:1px solid var(--gold-line); border-radius:0.55rem; padding:14px 16px;
}
.detail-cv-icon {
  width:38px; height:38px; border-radius:0.5rem; flex:0 0 auto;
  background:var(--color-surface-800); display:flex; align-items:center; justify-content:center; color:var(--color-gold-bright);
}
.detail-cv-num { font-family:"JetBrains Mono", monospace; font-weight:700; font-size:21px; color:var(--color-gold-bright); line-height:1; }
.detail-cv-label { font-size:11.5px; color:var(--color-text-muted); margin-top:3px; letter-spacing:.3px; }

.detail-friendship { margin-top:auto; padding-top:16px; border-top:1px solid var(--gold-line-soft); }
.detail-friendship-head { display:flex; align-items:center; gap:8px; margin-bottom:9px; }
.detail-friendship-label { font-size:12.5px; color:var(--color-text-muted); }
.detail-friendship-lv { margin-left:auto; font-family:"JetBrains Mono", monospace; font-size:12.5px; color:var(--color-gold-bright); font-weight:600; }

/* section headers */
.detail-section { margin-bottom:26px; }
.detail-section-head { display:flex; align-items:baseline; gap:10px; margin-bottom:14px; }
.detail-section-head .dia { color:var(--color-gold); font-size:11px; }
.detail-section-title {
  font-family:var(--font-display); font-weight:600; font-size:1.15rem; letter-spacing:1.5px;
  text-transform:uppercase; color:var(--color-gold-bright);
}

/* stats grid */
.detail-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; grid-auto-rows:1fr; }
.detail-stats > * { min-width:0; }
.detail-stat {
  background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.5rem;
  padding:14px 16px; position:relative; overflow:hidden;
}
.detail-stat.accent { border-color:var(--gold-line); background:linear-gradient(160deg, rgba(211,188,142,0.08), var(--color-card) 60%); }
.detail-stat.accent::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--color-gold); }
.detail-stat-label { font-size:11px; color:var(--color-text-muted); letter-spacing:.4px; text-transform:uppercase; display:flex; align-items:center; gap:6px; }
.detail-stat-label svg { opacity:.7; }
.detail-stat-value { font-family:"JetBrains Mono", monospace; font-weight:600; font-size:21px; color:var(--color-text-primary); margin-top:7px; }
.detail-stat.accent .detail-stat-value { color:var(--color-gold-bright); }
.detail-stat-breakdown { font-size:10.5px; color:var(--color-text-muted); margin-top:5px; font-family:"JetBrains Mono", monospace; min-height:1.3em; }

/* loadout */
.detail-loadout { display:grid; grid-template-columns:1.1fr 1.4fr; gap:16px; }
.detail-loadout.single { grid-template-columns:1fr; }
.detail-panel { background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.55rem; padding:18px; min-width:0; }
.detail-weapon { display:flex; gap:16px; align-items:center; height:100%; }
.detail-weapon-icon {
  width:64px; height:64px; border-radius:0.6rem; flex:0 0 auto; overflow:hidden;
  background:linear-gradient(160deg, rgba(63,189,241,0.14), var(--color-surface-800));
  border:1px solid var(--gold-line); display:flex; align-items:center; justify-content:center; color:var(--color-gold-bright);
}
.detail-weapon-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px; }
.detail-weapon-name { font-family:var(--font-display); font-weight:600; font-size:1.15rem; color:var(--color-text-primary); }
.detail-refine { font-size:10.5px; font-weight:800; color:#0e1a12; background:var(--color-gold-bright); padding:2px 7px; border-radius:0.3rem; }
.detail-weapon-meta { font-size:11.5px; color:var(--color-text-muted); margin-bottom:10px; }
.detail-weapon-stats { display:flex; gap:22px; flex-wrap:wrap; }
.detail-weapon-stat .l { font-size:10.5px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.3px; }
.detail-weapon-stat .v { font-family:"JetBrains Mono", monospace; font-weight:600; font-size:15.5px; color:var(--color-text-primary); margin-top:2px; }
.detail-set-title { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:12px; }
.detail-set-block { display:flex; gap:12px; padding:12px; border-radius:0.5rem; border:1px solid var(--gold-line-soft); margin-bottom:10px; }
.detail-set-block:last-child { margin-bottom:0; }
.detail-set-block.active { border-color:var(--gold-line); background:rgba(211,188,142,0.05); }
.detail-set-block.inactive { opacity:.55; }
.detail-set-icon { width:38px; height:38px; border-radius:0.5rem; flex:0 0 auto; background:var(--color-surface-800); display:flex; align-items:center; justify-content:center; color:var(--color-gold); }
.detail-set-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.detail-set-name { font-weight:700; font-size:13.5px; color:var(--color-text-primary); }
.detail-set-count { font-size:10.5px; color:var(--color-gold-bright); font-family:"JetBrains Mono", monospace; }
.detail-set-desc { font-size:11.5px; color:var(--color-text-muted); line-height:1.5; margin-top:4px; }
.detail-set-desc b { color:var(--color-gold-bright); font-weight:600; }
.detail-set-need { font-size:11px; color:var(--color-text-muted); font-style:italic; margin-top:2px; }

/* artifacts */
.detail-artifacts { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; grid-auto-rows:1fr; }
.detail-artifacts > * { min-width:0; }
.detail-art { background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.5rem; padding:14px; display:flex; flex-direction:column; }
.detail-art-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; gap:8px; }
.detail-art-icon {
  width:34px; height:34px; border-radius:0.5rem; overflow:hidden; flex:0 0 auto;
  background:var(--color-surface-800); color:var(--color-gold-bright);
  display:flex; align-items:center; justify-content:center;
}
.detail-art-stars { color:#c9962e; font-size:10px; letter-spacing:1px; text-align:right; white-space:nowrap; }
.detail-art-lv { font-size:10px; color:var(--color-text-muted); font-family:"JetBrains Mono", monospace; margin-top:3px; text-align:right; }
.detail-art-set { font-size:10.5px; color:var(--color-text-muted); line-height:1.3; margin-bottom:10px; min-height:26px; }
.detail-art-mainlabel { font-size:10.5px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.3px; }
.detail-art-mainvalue { font-family:"JetBrains Mono", monospace; font-weight:700; font-size:24px; color:var(--color-gold-bright); margin:3px 0 12px; }
.detail-art-divider { height:1px; background:var(--gold-line-soft); margin-bottom:10px; }
.detail-substat { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
.detail-substat:last-child { margin-bottom:0; }
.detail-substat-name { font-size:11.5px; color:var(--color-text-muted); min-width:0; }
.detail-substat-value { font-family:"JetBrains Mono", monospace; font-size:12px; color:var(--color-text-primary); font-weight:600; flex-shrink:0; }

/* talents */
.detail-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
.detail-tab {
  display:flex; align-items:center; gap:9px; padding:9px 14px; border-radius:0.5rem;
  background:var(--color-card); border:1px solid var(--gold-line-soft); cursor:pointer;
  transition:border-color .15s ease, background .15s ease; font-family:inherit; color:inherit; text-align:left;
}
.detail-tab:hover { border-color:var(--gold-line); }
.detail-tab.active { background:linear-gradient(160deg, rgba(211,188,142,0.14), var(--color-surface-800)); border-color:var(--gold-line); }
.detail-tab-icon {
  width:26px; height:26px; border-radius:0.4rem; overflow:hidden; background:var(--color-surface-800);
  display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); flex:0 0 auto;
}
.detail-tab.active .detail-tab-icon { color:var(--color-gold-bright); }
.detail-tab-text { min-width:0; }
.detail-tab-name { font-size:12px; font-weight:700; color:var(--color-text-muted); line-height:1.2; white-space:nowrap; }
.detail-tab.active .detail-tab-name { color:var(--color-text-primary); }
.detail-tab-lv { font-size:10px; color:var(--color-text-muted); font-family:"JetBrains Mono", monospace; }
.detail-talent-panel { background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.55rem; padding:24px; }
.detail-talent-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.detail-tab-icon-lg { width:40px; height:40px; border-radius:0.6rem; color:var(--color-gold-bright); }
.detail-talent-title { font-family:var(--font-display); font-weight:600; font-size:1.3rem; color:var(--color-text-primary); line-height:1.2; }
.detail-talent-sub { font-size:11.5px; color:var(--color-text-muted); margin-top:2px; }
.detail-talent-body { font-size:13.5px; color:var(--color-text-secondary); line-height:1.7; margin-bottom:18px; white-space:pre-wrap; }
.detail-combo { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--gold-line-soft); border:1px solid var(--gold-line-soft); border-radius:0.5rem; overflow:hidden; }
.detail-combo-cell { background:var(--color-surface-800); padding:12px 14px; min-width:0; }
.detail-combo-label { font-size:10.5px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.3px; margin-bottom:5px; }
.detail-combo-value { font-family:"JetBrains Mono", monospace; font-weight:600; font-size:14.5px; color:var(--color-gold-bright); }

/* constellations */
.detail-const-path { background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.55rem; padding:28px 30px 22px; margin-bottom:16px; }
.detail-const-track { position:relative; display:flex; justify-content:space-between; margin-bottom:10px; }
.detail-const-line-bg { position:absolute; left:0; right:0; top:20px; height:2px; background:var(--gold-line-soft); z-index:0; }
.detail-const-line-fill { position:absolute; left:0; top:20px; height:2px; background:linear-gradient(90deg, var(--color-gold-deep), var(--color-gold-bright)); z-index:1; transition:width .3s ease; }
.detail-const-node {
  position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:9px;
  cursor:pointer; background:none; border:none; padding:0; font-family:inherit;
}
.detail-const-circle {
  width:40px; height:40px; border-radius:50%; overflow:hidden; background:var(--color-surface-800);
  border:2px solid var(--gold-line-soft); display:flex; align-items:center; justify-content:center;
  color:var(--color-text-muted); transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.detail-const-node.unlocked .detail-const-circle { border-color:var(--color-gold); color:var(--color-gold-bright); box-shadow:0 0 0 4px rgba(211,188,142,0.10), 0 0 18px rgba(211,188,142,0.25); }
.detail-const-node.active .detail-const-circle { background:var(--color-gold); color:#191207; }
.detail-const-node:hover .detail-const-circle { transform:translateY(-2px); }
.detail-const-label { font-size:11px; font-weight:700; color:var(--color-text-muted); white-space:nowrap; }
.detail-const-node.unlocked .detail-const-label { color:var(--color-gold-bright); }
.detail-const-status { text-align:center; font-size:12px; color:var(--color-text-secondary); margin-top:6px; }
.detail-const-status b { color:var(--color-gold-bright); }
.detail-const-panel { background:var(--color-card); border:1px solid var(--gold-line-soft); border-radius:0.55rem; padding:22px 24px; }
.detail-const-panel-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.detail-const-icon {
  width:42px; height:42px; border-radius:0.5rem; overflow:hidden; flex:0 0 auto;
  background:var(--color-surface-800); display:flex; align-items:center; justify-content:center; color:var(--color-gold-bright);
}
.detail-const-title { font-family:var(--font-display); font-weight:600; font-size:1.1rem; color:var(--color-text-primary); line-height:1.3; }
.detail-const-badge { font-size:10px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; padding:3px 8px; border-radius:0.35rem; margin-left:auto; white-space:nowrap; flex-shrink:0; }
.detail-const-badge.on { background:rgba(211,188,142,0.16); color:var(--color-gold-bright); }
.detail-const-badge.off { background:rgba(255,255,255,0.04); color:var(--color-text-muted); }
.detail-const-desc { font-size:13.5px; color:var(--color-text-secondary); line-height:1.75; white-space:pre-wrap; }

@media (max-width: 1180px) {
  .detail-stats { grid-template-columns:repeat(3,1fr); }
  .detail-artifacts { grid-template-columns:repeat(3,1fr); }
  .detail-loadout, .detail-loadout.single { grid-template-columns:1fr; }
  .detail-combo { grid-template-columns:repeat(2,1fr); }
}
@media (max-width: 760px) {
  .detail-hero { grid-template-columns:1fr; }
  .detail-portrait { min-height:240px; }
  .detail-stats { grid-template-columns:repeat(2,1fr); }
  .detail-artifacts { grid-template-columns:repeat(2,1fr); }
  .detail-char-name { font-size:2rem; }
}
@media (max-width: 360px) {
  .detail-artifacts { grid-template-columns:1fr; }
  .detail-const-circle { width:32px; height:32px; }
  .detail-const-line-bg, .detail-const-line-fill { top:16px; }
}
`

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

  const critInfo = useMemo(() => {
    if (!detail) return null
    const parseNum = (s?: string): number | null => {
      if (!s) return null
      const n = parseFloat(s)
      return Number.isNaN(n) ? null : n
    }
    const findProp = (pt: number, keyword: string) =>
      detail.selected_properties.find(
        (p) => p.property_type === pt || (propMap[String(p.property_type)]?.name ?? '').toLowerCase().includes(keyword),
      )
    const crProp = findProp(20, 'crit rate')
    const cdProp = findProp(22, 'crit dmg')
    const cr = crProp ? parseNum(crProp.final) : null
    const cd = cdProp ? parseNum(cdProp.final) : null
    if (cr === null || cd === null) return null
    return { cr, cd, cv: Math.round((cr * 2 + cd) * 10) / 10 }
  }, [detail, propMap])

  const isCritStat = (propertyType: number): boolean => {
    if (propertyType === 20 || propertyType === 22) return true
    return (propMap[String(propertyType)]?.name ?? '').toLowerCase().includes('crit')
  }

  const setEntries = useMemo(() => {
    if (!detail) return []
    const setCounts: Record<string, { count: number; set: HoyoDetailArtifact['set'] }> = {}
    for (const r of detail.relics) {
      if (!setCounts[r.set.name]) setCounts[r.set.name] = { count: 0, set: r.set }
      setCounts[r.set.name].count++
    }
    return Object.entries(setCounts)
  }, [detail])

  const sortedConsts = useMemo(
    () => (detail ? [...detail.constellations].sort((a, b) => a.pos - b.pos) : []),
    [detail],
  )

  const unlockedConstCount = sortedConsts.filter((c) => c.is_actived).length
  const constFillPct = sortedConsts.length <= 1 || unlockedConstCount <= 1
    ? 0
    : ((unlockedConstCount - 1) / (sortedConsts.length - 1)) * 100

  const lastUnlockedConst = useMemo(() => [...sortedConsts].reverse().find((c) => c.is_actived), [sortedConsts])

  const defaultConstIdx = useMemo(() => {
    let last = -1
    sortedConsts.forEach((c, i) => { if (c.is_actived) last = i })
    return last >= 0 ? last : 0
  }, [sortedConsts])

  const [activeTalent, setActiveTalent] = useState(0)
  const [selectedConst, setSelectedConst] = useState<number | null>(null)
  useEffect(() => { setActiveTalent(0); setSelectedConst(null) }, [detail])

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

  const talentIdx = detail && detail.skills.length > 0 ? Math.min(activeTalent, detail.skills.length - 1) : -1
  const activeSkill = talentIdx >= 0 ? detail!.skills[talentIdx] : null
  const activeConst = sortedConsts.length > 0
    ? sortedConsts[Math.min(selectedConst ?? defaultConstIdx, sortedConsts.length - 1)]
    : null

  const hasWeapon = Boolean(detail?.weapon?.name)
  const loadoutPanels = (hasWeapon ? 1 : 0) + (setEntries.length > 0 ? 1 : 0)

  return (
    <div className="fade-in detail-page">
      <style>{LAYOUT_CSS}</style>

      <button
        onClick={() => navigate('/characters')}
        className="detail-back"
      >
        <ArrowLeft size={15} /> Back to My Characters
      </button>

      {characters.length > 1 && (
        <div className="detail-rail-wrap">
          <div className="detail-rail">
            {characters.map((c) => {
              const isCurrent = c.id === characterId
              const chipAccent = elementAccent(c.element)
              return (
                <button
                  key={c.id}
                  onClick={() => navigate('/characters/' + c.id)}
                  className={`detail-rail-item ${isCurrent ? 'active' : ''}`}
                  title={c.name}
                >
                  <span
                    className="detail-rail-avatar"
                    style={isCurrent
                      ? {
                          background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${chipAccent} 45%, #ffffff), ${chipAccent} 70%, color-mix(in srgb, ${chipAccent} 75%, #000000))`,
                          boxShadow: `0 0 0 3px var(--color-gold-bright), 0 6px 16px color-mix(in srgb, ${chipAccent} 35%, transparent)`,
                        }
                      : {
                          background: '#151B2F',
                          boxShadow: 'none',
                        }}
                  >
                    {c.icon ? (
                      <img
                        src={c.icon}
                        alt={c.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : null}
                  </span>
                  <span className="detail-rail-name">{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="ornate" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={18} color="var(--color-red-400)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ minWidth: 0 }}>
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

      <section className="detail-hero">
        <div
          className="detail-portrait"
          style={{
            background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${accent} 22%, transparent), transparent 60%), linear-gradient(180deg, var(--color-surface-800), var(--color-surface-900) 70%)`,
          }}
        >
          <div className="detail-hero-badges">
            <span
              className="detail-pill"
              style={{
                color: accent,
                borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
                background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              }}
            >
              <ElementIcon element={listEntry.element} size={12} />
              {listEntry.element}
            </span>
          </div>
          <span className="detail-pill detail-pill-lv detail-hero-lv">
            Lv. {detail?.base?.level ?? listEntry.level}
          </span>
          {detail?.base?.image ? (
            <img
              src={detail.base.image}
              alt={listEntry.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Sparkles size={32} color="var(--color-gold)" style={{ opacity: 0.5 }} />
            </div>
          )}
        </div>

        <div className="detail-hero-info">
          <div className="detail-eyebrow">Character Details</div>
          <h1 className="detail-char-name">{listEntry.name}</h1>

          <div className="detail-stars">{'★'.repeat(listEntry.rarity)}</div>

          <div className="detail-tag-row">
            <span className="detail-tag" style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}>
              <ElementIcon element={listEntry.element} />
              {listEntry.element}
            </span>
            <span className="detail-tag detail-tag-weapon">
              <WeaponTypeIcon type={detail?.base?.weapon_type ?? listEntry.weaponType} />
              {WEAPON_TYPE_LABELS[detail?.base?.weapon_type ?? listEntry.weaponType] ?? 'Unknown'}
            </span>
          </div>

          {critInfo && (
            <div className="detail-cv">
              <div className="detail-cv-icon"><Sparkles size={18} /></div>
              <div>
                <div className="detail-cv-num">{critInfo.cv}</div>
                <div className="detail-cv-label">Crit Ratio · {critInfo.cr}% CR / {critInfo.cd}% CD</div>
              </div>
            </div>
          )}

          <div className="detail-friendship">
            <div className="detail-friendship-head">
              <Heart size={15} color="var(--color-pink-400)" />
              <span className="detail-friendship-label">Friendship</span>
              <span className="detail-friendship-lv">Lv. {totalFriendship}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min((totalFriendship / 10) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      {loading && !detail && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading character details...
        </div>
      )}

      {detail && !loading && (
        <>
          <section className="detail-section">
            <div className="detail-section-head"><span className="dia">◆</span><span className="detail-section-title">Stats</span></div>
            <div className="detail-stats">
              {detail.selected_properties.map((prop) => {
                const addVal = prop.add ? Number(prop.add) : 0
                const accentCard = isCritStat(prop.property_type)
                return (
                  <div key={prop.property_type} className={`detail-stat ${accentCard ? 'accent' : ''}`}>
                    <div className="detail-stat-label">
                      {prop.property_type === 2000 && <Heart size={12} />}
                      {prop.property_type === 2001 && <Swords size={12} />}
                      {prop.property_type === 2002 && <Shield size={12} />}
                      {resolvePropLabel(prop.property_type)}
                    </div>
                    <div className="detail-stat-value">{prop.final}</div>
                    <div className="detail-stat-breakdown">
                      {addVal > 0 ? `${prop.base} + ${prop.add}` : '\u00A0'}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {loadoutPanels > 0 && (
            <section className="detail-section">
              <div className="detail-section-head"><span className="dia">◆</span><span className="detail-section-title">Loadout</span></div>
              <div className={`detail-loadout ${loadoutPanels === 1 ? 'single' : ''}`}>
                {hasWeapon && (
                  <div className="detail-panel detail-weapon">
                    <div className="detail-weapon-icon">
                      {detail!.weapon.icon ? (
                        <img
                          src={detail!.weapon.icon}
                          alt={detail!.weapon.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <WeaponTypeIcon type={detail!.weapon.type} size={28} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="detail-weapon-name-row">
                        <span className="detail-weapon-name">{detail!.weapon.name}</span>
                        <span className="detail-refine">R{detail!.weapon.affix_level}</span>
                      </div>
                      <div className="detail-weapon-meta">
                        {detail!.weapon.type_name} · ★×{detail!.weapon.rarity} · Lv. {detail!.weapon.level}/{detail!.weapon.promote_level * 10}
                      </div>
                      <div className="detail-weapon-stats">
                        <div className="detail-weapon-stat">
                          <div className="l">{resolvePropLabel(detail!.weapon.main_property.property_type)}</div>
                          <div className="v">{detail!.weapon.main_property.final}</div>
                        </div>
                        {detail!.weapon.sub_property?.final && (
                          <div className="detail-weapon-stat">
                            <div className="l">{resolvePropLabel(detail!.weapon.sub_property.property_type)}</div>
                            <div className="v">{detail!.weapon.sub_property.final}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {setEntries.length > 0 && (
                  <div className="detail-panel">
                    <div className="detail-set-title">Artifact Sets</div>
                    {setEntries.map(([name, { count, set }]) => {
                      const active = count >= 2
                      const needsTwo = count >= 1 && count < 2
                      return (
                        <div key={name} className={`detail-set-block ${active ? 'active' : 'inactive'}`}>
                          <div className="detail-set-icon"><Layers size={18} strokeWidth={1.7} /></div>
                          <div style={{ minWidth: 0 }}>
                            <div className="detail-set-name-row">
                              <span className="detail-set-name">{name}</span>
                              <span className="detail-set-count">{count}/4 equipped</span>
                            </div>
                            {set.affixes
                              .filter((a) => a.activation_number <= count)
                              .map((a) => (
                                <div key={a.activation_number} className="detail-set-desc">
                                  <b>{a.activation_number}-Pc</b>: {a.effect}
                                </div>
                              ))}
                            {needsTwo && (
                              <div className="detail-set-need">
                                Needs {2 - count} more piece{2 - count > 1 ? 's' : ''} for the 2-Pc bonus.
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="detail-section">
            <div className="detail-section-head"><span className="dia">◆</span><span className="detail-section-title">Artifacts</span></div>
            {detail.relics.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No artifacts equipped
              </div>
            ) : (
              <div className="detail-artifacts">
                {[...detail.relics]
                  .sort((a, b) => a.pos - b.pos)
                  .map((r) => (
                    <ArtifactCard key={r.id} artifact={r} propMap={propMap} />
                  ))}
              </div>
            )}
          </section>

          <section className="detail-section">
            <div className="detail-section-head"><span className="dia">◆</span><span className="detail-section-title">Talents</span></div>
            {detail.skills.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No talent data available
              </div>
            ) : (
              <>
                <div className="detail-tabs">
                  {detail.skills.map((s, i) => (
                    <button
                      key={s.skill_id}
                      className={`detail-tab ${i === talentIdx ? 'active' : ''}`}
                      onClick={() => setActiveTalent(i)}
                    >
                      <span className="detail-tab-icon">
                        {s.icon ? (
                          <img
                            src={s.icon}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <SkillFallbackIcon skillType={s.skill_type} />
                        )}
                      </span>
                      <span className="detail-tab-text">
                        <span className="detail-tab-name">{s.name}</span>
                        <span className="detail-tab-lv">Lv. {s.level}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {activeSkill && (
                  <div className="detail-talent-panel">
                    <div className="detail-talent-head">
                      <span className="detail-tab-icon detail-tab-icon-lg">
                        {activeSkill.icon ? (
                          <img
                            src={activeSkill.icon}
                            alt={activeSkill.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <SkillFallbackIcon skillType={activeSkill.skill_type} size={20} />
                        )}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="detail-talent-title">{activeSkill.name}</div>
                        <div className="detail-talent-sub">{skillKindLabel(activeSkill.skill_type)} · Level {activeSkill.level}</div>
                      </div>
                    </div>
                    <div className="detail-talent-body">{stripColorTags(activeSkill.desc)}</div>
                    {activeSkill.skill_affix_list.length > 0 && (
                      <div className="detail-combo">
                        {activeSkill.skill_affix_list.map((a, i) => (
                          <div key={i} className="detail-combo-cell">
                            <div className="detail-combo-label">{a.name}</div>
                            <div className="detail-combo-value">{a.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="detail-section">
            <div className="detail-section-head"><span className="dia">◆</span><span className="detail-section-title">Constellations</span></div>
            {sortedConsts.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No constellations unlocked
              </div>
            ) : (
              <>
                <div className="detail-const-path">
                  <div className="detail-const-track">
                    <div className="detail-const-line-bg" />
                    <div className="detail-const-line-fill" style={{ width: `${constFillPct}%` }} />
                    {sortedConsts.map((c, i) => (
                      <button
                        key={c.id}
                        className={`detail-const-node ${c.is_actived ? 'unlocked' : 'locked'} ${i === (selectedConst ?? defaultConstIdx) ? 'active' : ''}`}
                        onClick={() => setSelectedConst(i)}
                      >
                        <span className="detail-const-circle">
                          {c.icon ? (
                            <img
                              src={c.icon}
                              alt={c.name}
                              style={{
                                width: '100%', height: '100%', objectFit: 'contain',
                                opacity: c.is_actived ? 1 : 0.35, filter: c.is_actived ? 'none' : 'grayscale(0.8)',
                              }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <Lock size={16} />
                          )}
                        </span>
                        <span className="detail-const-label">C{c.pos}</span>
                      </button>
                    ))}
                  </div>
                  <div className="detail-const-status">
                    {lastUnlockedConst ? (
                      <>Unlocked through <b>C{lastUnlockedConst.pos} — {lastUnlockedConst.name}</b></>
                    ) : (
                      <>No constellations unlocked</>
                    )}
                  </div>
                </div>

                {activeConst && (
                  <div className="detail-const-panel">
                    <div className="detail-const-panel-head">
                      <span className="detail-const-icon">
                        {activeConst.icon ? (
                          <img
                            src={activeConst.icon}
                            alt={activeConst.name}
                            style={{
                              width: '100%', height: '100%', objectFit: 'contain',
                              opacity: activeConst.is_actived ? 1 : 0.4, filter: activeConst.is_actived ? 'none' : 'grayscale(0.8)',
                            }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <Lock size={20} />
                        )}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="detail-const-title">C{activeConst.pos} — {activeConst.name}</div>
                      </div>
                      <span className={`detail-const-badge ${activeConst.is_actived ? 'on' : 'off'}`}>
                        {activeConst.is_actived ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                    <div className="detail-const-desc">{stripColorTags(activeConst.effect)}</div>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
