// Character identity (name, element, weapon, rarity, icon) for any avatarId.
//
// This used to also keep a hand-typed static table here as a "fallback" for whenever the
// Firestore-backed dynamic roster didn't have an entry yet. That table has been removed
// entirely, on purpose — it inevitably drifted from reality (confirmed: it had two different
// avatarIds, 10000097 and 10000099, both labeled "Sethos"; 10000099 is actually "Emilie") and a
// second source of character identity that can silently disagree with the first *is* the bug
// class that caused wrong/missing characters to show up, not a safety net against it.
//
// The single source of truth now is the dynamic roster written by the Cloudflare Worker (see
// useCharacterRoster.ts), which is built fresh from Enka.Network's own datamined character table
// (characters.json + loc.json) on every run — the same data Enka's API itself uses to resolve
// avatarIds. New characters appear automatically as soon as Enka's data picks them up; nothing
// here needs to be hand-edited when a new patch ships.

export type Element = 'Pyro' | 'Hydro' | 'Anemo' | 'Electro' | 'Dendro' | 'Cryo' | 'Geo' | 'Unknown'
export type WeaponType = 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst' | 'Unknown'

export interface CharacterMeta {
  name: string
  element: Element
  weapon: WeaponType
  rarity: 4 | 5
  iconKey: string // e.g. UI_AvatarIcon_Ambor -> https://enka.network/ui/UI_AvatarIcon_Ambor.png
  /** True when this came from the live roster; false when nothing was found for this avatarId
   *  at all (roster still loading, or a genuinely brand-new character the Worker hasn't seen
   *  yet). The UI uses this to show an honest "unrecognized" state instead of pretending a
   *  generic placeholder is real data. */
  resolved: boolean
}

const UNRESOLVED_META: Omit<CharacterMeta, 'name'> = {
  element: 'Unknown',
  weapon: 'Unknown',
  rarity: 4,
  iconKey: '',
  resolved: false,
}

/**
 * Resolves a character's display metadata from the live dynamic roster (built by the Cloudflare
 * Worker — see useCharacterRoster). If the roster has no entry for this avatarId — either because
 * it's still loading, or because this is a character so new the Worker hasn't synced it yet —
 * this returns an explicitly-unresolved placeholder (`resolved: false`) rather than a name that
 * looks plausible but might be guessed/wrong. Callers should check `resolved` and show a loading
 * or "not yet recognized" state rather than treating the placeholder as real character data.
 */
export function getCharacterMeta(avatarId: number, dynamicRoster: Record<string, CharacterMeta> | undefined): CharacterMeta {
  const fromRoster = dynamicRoster?.[String(avatarId)]
  if (fromRoster) return fromRoster
  return { name: `Character #${avatarId}`, ...UNRESOLVED_META }
}

export const ELEMENT_COLORS: Record<Element, string> = {
  Pyro: '#f87171',
  Hydro: '#22d3ee',
  Anemo: '#34d399',
  Electro: '#c084fc',
  Dendro: '#a3e635',
  Cryo: '#7dd3fc',
  Geo: '#fbbf24',
  Unknown: '#8892b0',
}
