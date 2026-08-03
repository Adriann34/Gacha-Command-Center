import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp, Axe, Crosshair, Droplet, Flame, Heart, Inbox, Leaf, Mountain,
  Orbit, RefreshCw, Search, Settings as SettingsIcon, SlidersHorizontal,
  Snowflake, Sparkles, Star, Sword, Wind, Zap,
} from 'lucide-react'
import { useCharacterList } from '../hooks/useCharacterList'
import { syncChronicle } from '../lib/hoyolab'
import type { CharacterEntry } from '../lib/hoyolab'

const ELEMENTS = ['Hydro', 'Pyro', 'Electro', 'Cryo', 'Anemo', 'Geo', 'Dendro']
const WEAPON_TYPES = [
  { label: 'Sword', value: 1, icon: Sword },
  { label: 'Claymore', value: 11, icon: Axe },
  { label: 'Polearm', value: 13, icon: Crosshair },
  { label: 'Bow', value: 12, icon: Crosshair },
  { label: 'Catalyst', value: 10, icon: Orbit },
]

const ELEMENT_ICONS: Record<string, typeof Droplet> = {
  Hydro: Droplet, Pyro: Flame, Electro: Zap, Cryo: Snowflake,
  Anemo: Wind, Geo: Mountain, Dendro: Leaf,
}
const ELEMENT_CLASS: Record<string, string> = {
  Hydro: 'hydro', Pyro: 'pyro', Electro: 'electro', Cryo: 'cryo',
  Anemo: 'anemo', Geo: 'geo', Dendro: 'dendro',
}

const WEAPON_LABELS: Record<number, string> = { 1: 'Sword', 10: 'Catalyst', 11: 'Claymore', 12: 'Bow', 13: 'Polearm' }

function PageHead({ total, fiveStars, averageLevel }: { total: number; fiveStars: number; averageLevel: number }) {
  return (
    <>
      <div className="characters-eyebrow">Your Characters</div>
      <div className="characters-title-row">
        <h1 className="page-title characters-title">My Characters</h1>
        <div className="roster-meta">
          <div className="meta-item"><div className="meta-num">{total}</div><div className="meta-label">Total</div></div>
          <div className="meta-item"><div className="meta-num">{fiveStars}</div><div className="meta-label">5★ Owned</div></div>
          <div className="meta-item"><div className="meta-num">{averageLevel || '—'}</div><div className="meta-label">Avg. Level</div></div>
        </div>
      </div>
      <div className="characters-divider" />
    </>
  )
}

function CharacterCard({ character, favorite, onFavorite, onClick }: {
  character: CharacterEntry
  favorite: boolean
  onFavorite: () => void
  onClick: () => void
}) {
  const [imageSource, setImageSource] = useState(character.image || character.icon || character.sideIcon)
  const elementClass = ELEMENT_CLASS[character.element] ?? 'unknown'
  const ElementIcon = ELEMENT_ICONS[character.element] ?? Sparkles

  return (
    <article className={`character-card rarity-${character.rarity} ${character.isChosen ? 'pinned' : ''}`} onClick={onClick}>
      {character.isChosen && <div className="pin-flag">Viewing</div>}
      <div className={`character-art art-${elementClass}`}>
        {imageSource ? (
          <img src={imageSource} alt={character.name} onError={() => setImageSource('')} />
        ) : (
          <span className="character-initial">{character.name.charAt(0)}</span>
        )}
        <div className="art-wash" />
      </div>
      <div className="card-corner-top">
        <div className={`element-chip el-${elementClass}`}><ElementIcon size={14} /></div>
        <div className="card-action-stack">
          <button
            className={`favorite-button ${favorite ? 'on' : ''}`}
            aria-label={`${favorite ? 'Remove' : 'Add'} ${character.name} ${favorite ? 'from' : 'to'} favorites`}
            onClick={(event) => { event.stopPropagation(); onFavorite() }}
          ><Star size={13} fill={favorite ? 'currentColor' : 'none'} /></button>
          <div className="weapon-chip" title={WEAPON_LABELS[character.weaponType] ?? 'Unknown weapon'}>
            {character.weaponType === 1 ? <Sword size={14} /> : character.weaponType === 11 ? <Axe size={14} /> : character.weaponType === 10 ? <Orbit size={14} /> : <Crosshair size={14} />}
          </div>
        </div>
      </div>
      <div className="character-scrim">
        <div className="character-name">{character.name}</div>
        <div className="rarity-stars">{Array.from({ length: character.rarity }, (_, index) => <Star key={index} size={9} fill="currentColor" />)}</div>
        <div className="character-sub">
          <span>Lv.{character.level}</span><i /> <strong>C{character.constellation}</strong>
          <span className="friendship"><Heart size={10} fill="currentColor" />{character.friendship}</span>
        </div>
      </div>
    </article>
  )
}

export default function CharactersPage() {
  const navigate = useNavigate()
  const { characters, loaded } = useCharacterList()
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [elements, setElements] = useState<string[]>([])
  const [weapons, setWeapons] = useState<number[]>([])
  const [rarity, setRarity] = useState<'all' | 4 | 5>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [sort, setSort] = useState('level-desc')
  const autoSynced = useRef(false)

  useEffect(() => {
    if (!loaded || characters.length > 0 || autoSynced.current) return
    autoSynced.current = true
    setSyncing(true)
    syncChronicle(false).catch(() => {}).finally(() => setSyncing(false))
  }, [loaded, characters.length])

  const filteredCharacters = useMemo(() => {
    const result = characters.filter((character) => {
      if (search && !character.name.toLowerCase().includes(search.toLowerCase())) return false
      if (elements.length > 0 && !elements.includes(character.element)) return false
      if (weapons.length > 0 && !weapons.includes(character.weaponType)) return false
      if (rarity !== 'all' && character.rarity !== rarity) return false
      if (favoritesOnly && !favorites.has(character.id)) return false
      return true
    })
    return result.sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name)
      if (sort === 'rarity-desc') return b.rarity - a.rarity || b.level - a.level
      if (sort === 'cons-desc') return b.constellation - a.constellation
      if (sort === 'friend-desc') return b.friendship - a.friendship
      return b.level - a.level
    })
  }, [characters, elements, favorites, favoritesOnly, rarity, search, sort, weapons])

  const fiveStars = characters.filter((character) => character.rarity === 5).length
  const averageLevel = characters.length ? Math.round(characters.reduce((sum, character) => sum + character.level, 0) / characters.length) : 0

  const toggleElement = (element: string) => setElements((current) => current.includes(element) ? current.filter((item) => item !== element) : [...current, element])
  const toggleWeapon = (weapon: number) => setWeapons((current) => current.includes(weapon) ? current.filter((item) => item !== weapon) : [...current, weapon])
  const toggleFavorite = (id: number) => setFavorites((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  if (!loaded) return <div className="fade-in"><PageHead total={0} fiveStars={0} averageLevel={0} /><div className="characters-loading">Loading your characters...</div></div>

  if (characters.length === 0) {
    return (
      <div className="fade-in"><PageHead total={0} fiveStars={0} averageLevel={0} />
        <div className="ornate characters-empty">
          {syncing ? <><RefreshCw size={36} className="spin" /><p>Syncing your characters...</p><span>Fetching your Genshin Impact roster from HoYoLAB.</span></> : <><Sparkles size={40} /><p>No characters synced yet</p><span>Link your HoYoLAB account in Settings to pull your characters, weapons, and builds.</span><button onClick={() => navigate('/settings')} className="btn-primary"><SettingsIcon size={16} /> Go to Settings</button></>}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in characters-page">
      <PageHead total={characters.length} fiveStars={fiveStars} averageLevel={averageLevel} />
      <div className="characters-toolbar">
        <label className="character-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a character…" /></label>
        <span className="toolbar-divider" />
        <div className="filter-pills">
          <button className={`filter-pill ${elements.length === 0 ? 'active' : ''}`} onClick={() => setElements([])}><SlidersHorizontal size={14} /> All</button>
          {ELEMENTS.map((element) => { const Icon = ELEMENT_ICONS[element]; return <button key={element} className={`filter-pill element-${ELEMENT_CLASS[element]} ${elements.includes(element) ? 'active' : ''}`} onClick={() => toggleElement(element)}><Icon size={14} /> {element}</button> })}
        </div>
        <span className="toolbar-divider" />
        <div className="filter-pills weapon-pills">
          {WEAPON_TYPES.map(({ label, value, icon: Icon }) => <button key={label} className={`filter-pill ${weapons.includes(value) ? 'active' : ''}`} onClick={() => toggleWeapon(value)}><Icon size={14} /> {label}</button>)}
        </div>
        <span className="toolbar-divider" />
        <div className="rarity-segmented">
          {(['all', 5, 4] as const).map((value) => <button key={value} className={rarity === value ? 'active' : ''} onClick={() => setRarity(value)}>{value === 'all' ? 'All' : `${value}★`}</button>)}
        </div>
        <button className={`favorite-toggle ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly((current) => !current)}><Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites</button>
        <div className="toolbar-right"><span className="result-count"><b>{filteredCharacters.length}</b> characters</span><label className="sort-select"><ArrowDownUp size={14} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="level-desc">Level: High to Low</option><option value="name-asc">Name: A–Z</option><option value="rarity-desc">Rarity</option><option value="cons-desc">Constellation</option><option value="friend-desc">Friendship</option></select></label></div>
      </div>
      <div className="characters-grid">
        {filteredCharacters.length > 0 ? filteredCharacters.map((character) => <CharacterCard key={character.id} character={character} favorite={favorites.has(character.id)} onFavorite={() => toggleFavorite(character.id)} onClick={() => navigate('/characters/' + character.id)} />) : <div className="characters-no-results"><Inbox size={34} /><h2>No characters match</h2><p>Try clearing a filter or searching a different name.</p></div>}
      </div>
    </div>
  )
}
