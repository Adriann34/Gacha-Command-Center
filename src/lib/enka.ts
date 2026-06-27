// Minimal typed client for the Enka.Network public API.
// Docs: https://github.com/EnkaNetwork/API-docs
//
// IMPORTANT: Enka.Network's API does not send Access-Control-Allow-Origin, so it cannot be
// called directly from a browser — every request fails with a CORS error regardless of how
// correct the request is (confirmed by testing; this isn't fixable from the client side).
// Calls are routed through the Cloudflare Worker (see ../../cloudflare-worker) instead, which
// fetches Enka server-to-server (unaffected by CORS) and re-serves it with CORS headers attached.

export interface EnkaPropMap {
  type: number
  ival: string
  val?: number
}

export interface EnkaFightPropMap {
  [key: string]: number
}

export interface EnkaWeaponStat {
  appendPropId: string
  statValue: number
}

export interface EnkaFlat {
  nameTextMapHash?: string
  setNameTextMapHash?: string
  rankLevel: number
  itemType?: string
  icon: string
  equipType?: string
  weaponStats?: EnkaWeaponStat[]
  reliquaryMainstat?: { mainPropId: string; statValue: number }
  reliquarySubstats?: { appendPropId: string; statValue: number }[]
}

export interface EnkaEquip {
  itemId: number
  reliquary?: { level: number; mainPropId: number; appendPropIdList?: number[] }
  weapon?: { level: number; promoteLevel?: number; affixMap?: Record<string, number> }
  flat: EnkaFlat
}

export interface EnkaAvatarInfo {
  avatarId: number
  propMap: Record<string, EnkaPropMap>
  talentIdList?: number[]
  fightPropMap: EnkaFightPropMap
  skillDepotId: number
  inherentProudSkillList?: number[]
  skillLevelMap?: Record<string, number>
  equipList: EnkaEquip[]
  fetterInfo: { expLevel: number }
  costumeId?: number
}

export interface EnkaPlayerInfo {
  nickname: string
  level: number
  signature?: string
  worldLevel?: number
  nameCardId?: number
  finishAchievementNum?: number
  towerFloorIndex?: number
  towerLevelIndex?: number
  towerStarIndex?: number
  theaterStarIndex?: number
  theaterActIndex?: number
  theaterModeIndex?: number
  profilePicture?: { avatarId?: number; id?: number }
  showAvatarInfoList?: { avatarId: number; level: number; costumeId?: number }[]
}

export interface EnkaResponse {
  playerInfo: EnkaPlayerInfo
  avatarInfoList?: EnkaAvatarInfo[]
  ttl: number
  uid: string
}

const WORKER_BASE = import.meta.env.VITE_SCHEDULE_WORKER_URL as string | undefined

export class EnkaError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

function enkaErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Invalid UID format.'
    case 404: return 'No player found with this UID.'
    case 424: return 'Genshin Impact is under maintenance right now — try again later.'
    case 429: return 'Rate limited by Enka.Network — wait a moment and try again.'
    default: return 'Could not reach Enka.Network right now.'
  }
}

/** Fetches the full player profile (player info + character showcase) via the Worker proxy. */
export async function fetchEnkaProfile(uid: string): Promise<EnkaResponse> {
  return fetchViaWorker<EnkaResponse>(uid, false)
}

/** Fetches only playerInfo (faster) via the Worker proxy — used for the Settings UID check. */
export async function fetchEnkaPlayerInfo(uid: string): Promise<{ playerInfo: EnkaPlayerInfo }> {
  return fetchViaWorker<{ playerInfo: EnkaPlayerInfo }>(uid, true)
}

async function fetchViaWorker<T>(uid: string, infoOnly: boolean): Promise<T> {
  if (!WORKER_BASE) {
    throw new EnkaError(
      'VITE_SCHEDULE_WORKER_URL is not set in your .env file. Add the URL printed by `npm run deploy` in the cloudflare-worker project, then restart `npm run dev`.'
    )
  }

  let res: Response
  try {
    res = await fetch(`${WORKER_BASE}/enka/${uid}${infoOnly ? '?info' : ''}`, {
      headers: { Accept: 'application/json' },
    })
  } catch (networkErr) {
    throw new EnkaError(
      `Could not reach the schedule Worker at ${WORKER_BASE}. Check it's deployed and the URL in .env is correct. (${networkErr instanceof Error ? networkErr.message : String(networkErr)})`
    )
  }

  if (!res.ok) {
    throw new EnkaError(enkaErrorMessage(res.status), res.status)
  }
  return res.json() as Promise<T>
}

/**
 * Builds the public icon URL for any Enka icon key, e.g. "UI_AvatarIcon_Side_Ambor".
 * Defensively passes through anything that's already a full URL, OR a root-relative path to a
 * bundled static asset (e.g. "/characters/zibai.png" — used by the single Zibai fallback entry
 * in genshinCharacters.ts, since her icon key isn't reliably resolvable on Enka's own CDN), unchanged.
 * The character roster is only ever supposed to hand this a bare icon key otherwise, but treating
 * an accidental full URL as a key (producing "https://enka.network/ui/https://....png") was
 * exactly the kind of silent image-load failure that showed up as blank icon boxes with no error
 * in the UI.
 */
export function enkaIconUrl(iconKey: string | undefined | null): string {
  if (!iconKey) return ''
  if (/^https?:\/\//i.test(iconKey) || iconKey.startsWith('/')) return iconKey
  return `https://enka.network/ui/${iconKey}.png`
}
