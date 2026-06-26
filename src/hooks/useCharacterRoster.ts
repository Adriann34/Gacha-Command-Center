import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CharacterMeta, Element, WeaponType } from '../lib/genshinCharacters'

// Reads the dynamic character roster written by the Cloudflare Worker at
// characterRoster/current. The Worker builds this fresh on every run from Enka.Network's own
// datamined character table (characters.json + loc.json) — this is the ONLY source of character
// identity in the app; there is no static fallback table on this side anymore (see
// genshinCharacters.ts for why that was removed).

interface RawRosterEntry {
  name?: unknown
  icon?: unknown
  element?: unknown
  weaponType?: unknown
  rarity?: unknown
}

const ELEMENT_SET: ReadonlySet<string> = new Set(['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'])
const WEAPON_SET: ReadonlySet<string> = new Set(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'])

// Validates and normalizes one raw Firestore entry into a CharacterMeta, or returns null if the
// entry is too malformed to trust (missing/non-string name). Firestore documents are untyped at
// the wire level, so a bad Worker write or partial migration could in principle hand this code
// anything — useGameSchedule.ts already had to guard against Firestore's own Timestamp wrapper
// silently producing "Invalid Date"; this is the equivalent guard for the character roster, which
// previously had no validation at all and would have rendered whatever garbage it was given.
function normalizeEntry(raw: RawRosterEntry): CharacterMeta | null {
  if (typeof raw.name !== 'string' || raw.name.length === 0) return null

  const elementStr = typeof raw.element === 'string' ? raw.element : ''
  const weaponStr = typeof raw.weaponType === 'string' ? raw.weaponType : ''
  const rarityNum = typeof raw.rarity === 'number' ? raw.rarity : Number(raw.rarity)

  return {
    name: raw.name,
    element: ELEMENT_SET.has(elementStr) ? (elementStr as Element) : 'Unknown',
    weapon: WEAPON_SET.has(weaponStr) ? (weaponStr as WeaponType) : 'Unknown',
    rarity: rarityNum === 4 ? 4 : 5,
    iconKey: typeof raw.icon === 'string' ? raw.icon : '',
    resolved: true,
  }
}

interface RosterState {
  roster: Record<string, CharacterMeta>
  loading: boolean
  /** True once we've gotten at least one snapshot back from Firestore but the document either
   *  doesn't exist yet or contains no usable entries — distinct from `loading`, so the UI can
   *  show "the live roster hasn't synced yet" instead of an infinite spinner or, worse, silently
   *  treating an empty roster the same as a populated one. */
  unavailable: boolean
  /** ISO timestamp the Worker last wrote this document, if known. Lets the UI flag a roster that
   *  hasn't updated in an unexpectedly long time (the Worker runs every 30 min). */
  updatedAt: string | null
}

export function useCharacterRoster(): RosterState {
  const [roster, setRoster] = useState<Record<string, CharacterMeta>>({})
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    const ref = doc(db, 'characterRoster', 'current')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoster({})
          setUnavailable(true)
          setUpdatedAt(null)
          setLoading(false)
          return
        }

        const data = snap.data() as { characters?: Record<string, RawRosterEntry>; updatedAt?: unknown }
        const normalized: Record<string, CharacterMeta> = {}
        for (const [id, entry] of Object.entries(data.characters ?? {})) {
          const meta = normalizeEntry(entry)
          if (meta) normalized[id] = meta
          // Entries that fail validation are skipped rather than rendered as broken rows — same
          // principle the Worker itself applies when it can't resolve a name from loc.json.
        }

        setRoster(normalized)
        setUnavailable(Object.keys(normalized).length === 0)
        setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null)
        setLoading(false)
      },
      () => {
        setUnavailable(true)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { roster, loading, unavailable, updatedAt }
}
