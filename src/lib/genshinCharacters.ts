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

// --- Single hardcoded last-resort entry: avatarId 10000126 = Zibai ------------------------
//
// This is the ONE deliberate exception to "no static table, ever" above, and it's scoped as
// tightly as possible on purpose so it can't regress into the same bug that table caused.
//
// Why this exists: Zibai shipped in-game Feb 3, 2026 (v6.3, Luna IV) and Enka's live profile API
// correctly returns her avatarId/stats on real showcases — confirmed by the Worker's own
// debug10000126 diagnostic (see cloudflare-worker/src/index.ts), which reported avatarId 10000126
// is NOT a key in characters.json at all (not even an unresolved stub with no name — the key is
// completely absent from that snapshot). Because the HoYoWiki fallback (also in the Worker) joins
// by a candidate name derived from characters.json's own SideIconName, it can't rescue this case
// either: there's no SideIconName to derive a candidate from when the primary source has nothing
// for the avatarId at all. So unlike the normal "give it a day, the roster will catch up" case,
// this one has now sat unresolved for months with no self-healing path in sight from upstream.
//
// Confirmed independently (web search, outside this app's own data sources) as of June 2026:
// avatarId 10000126 = Zibai, a 5-star Geo Sword-wielding character.
//
// Why this is safe in a way the old table wasn't: it's exactly one entry, for one specific
// avatarId that is verified absent from the live roster source, and it only ever applies as a
// LAST resort underneath the dynamic roster (see getCharacterMeta below) — it can never override
// or disagree with a real roster entry, because if the roster ever does pick her up, that branch
// returns first and this one is simply never reached again. If you need to add a second character
// here, stop and fix the Worker's roster build instead — one persistent gap is a documented,
// verified exception; a second one is the start of the same drift problem all over again.
const ZIBAI_AVATAR_ID = '10000126'
const ZIBAI_FALLBACK_META: CharacterMeta = {
  name: 'Zibai',
  element: 'Geo',
  weapon: 'Sword',
  rarity: 5,
  // A bundled static asset, not an Enka CDN icon key — her icon key isn't reliably resolvable on
  // Enka's CDN (same underlying gap as characters.json: she's missing from the metadata Enka's
  // CDN imports are driven from), so this points at /public/characters/zibai.png instead. See
  // enkaIconUrl in enka.ts, which passes root-relative paths like this through unchanged rather
  // than treating it as a bare icon key to look up on enka.network/ui/.
  iconKey: '/characters/zibai.png',
  resolved: true,
}

/**
 * Resolves a character's display metadata from the live dynamic roster (built by the Cloudflare
 * Worker — see useCharacterRoster). If the roster has no entry for this avatarId — either because
 * it's still loading, or because this is a character so new the Worker hasn't synced it yet —
 * this returns an explicitly-unresolved placeholder (`resolved: false`) rather than a name that
 * looks plausible but might be guessed/wrong. Callers should check `resolved` and show a loading
 * or "not yet recognized" state rather than treating the placeholder as real character data.
 *
 * The one exception is Zibai (10000126) — see ZIBAI_FALLBACK_META above for why she gets a single
 * hardcoded override instead of falling through to the generic unresolved placeholder.
 */
export function getCharacterMeta(avatarId: number, dynamicRoster: Record<string, CharacterMeta> | undefined): CharacterMeta {
  const idStr = String(avatarId)
  const fromRoster = dynamicRoster?.[idStr]
  if (fromRoster) return fromRoster
  if (idStr === ZIBAI_AVATAR_ID) return ZIBAI_FALLBACK_META
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
