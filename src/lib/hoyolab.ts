// Typed client for the HoYoLAB Battle Chronicle integration.
//
// IMPORTANT: HoYoLAB's game-record API cannot be called from a browser — it sends no
// Access-Control-Allow-Origin header AND requires a per-request DS (Dynamic Secret) signature.
// So, exactly like the Enka client (see enka.ts), every call here is routed through the Cloudflare
// Worker (../../cloudflare-worker), which holds the encrypted cookies, signs the request, talks to
// HoYoLAB server-to-server, and re-serves the result with CORS headers.
//
// Auth: each request carries the signed-in user's Firebase ID token as `Authorization: Bearer`.
// The Worker verifies it and derives the uid, so a user can only ever act on their own account.

import { auth } from './firebase'

const WORKER_BASE = import.meta.env.VITE_SCHEDULE_WORKER_URL as string | undefined

// Mirror of the Worker's ChronicleNotes (see ../../cloudflare-worker/src/hoyolab.ts). Recovery
// times are "seconds remaining as of syncedAt", so the moving numbers are extrapolated locally
// (see hoyoExtrapolate.ts) instead of polled.
export interface ChronicleExpedition {
  finished: boolean
  remainedTime: number
  avatarSideIcon: string
}

export type RewardSlotState = 'unfinished' | 'finished' | 'claimed'

export interface ChronicleAttendanceReward {
  state: RewardSlotState
  progress: number
}

export interface ChronicleNotes {
  currentResin: number
  maxResin: number
  resinRecoveryTime: number
  currentHomeCoin: number
  maxHomeCoin: number
  homeCoinRecoveryTime: number
  currentExpeditionNum: number
  maxExpeditionNum: number
  expeditions: ChronicleExpedition[]
  finishedTaskNum: number
  totalTaskNum: number
  isExtraTaskRewardReceived: boolean
  dailyTaskRewards: RewardSlotState[]
  attendanceRewards: ChronicleAttendanceReward[]
  attendanceVisible: boolean
  storedAttendance: string
  storedAttendanceRefreshCountdown: number
  remainResinDiscountNum: number
  resinDiscountNumLimit: number
  transformerObtained: boolean
  transformerReached: boolean
  transformerRecoveryTime: number
}

export type ChronicleStatus = 'ok' | 'cookie_expired' | 'rate_limited' | 'error' | 'unlinked'

// ---- Event calendar (mirror of the Worker's ChronicleCalendar; see ../../cloudflare-worker/src/hoyolab.ts).
// Timers are epoch seconds + "seconds remaining as of syncedAt" so "time remaining" is extrapolated
// locally (see hoyoExtrapolate.ts), matching the real-time-notes strategy.
export interface CalendarReward {
  itemId: number
  name: string
  icon: string
  num: number
  rarity: number
}

export interface CalendarBannerItem {
  id: number
  icon: string
  name: string
  rarity: number
  element?: string
  wikiUrl?: string
}

export interface CalendarBanner {
  poolId: number
  versionName: string
  poolName: string
  poolType: number
  characters: CalendarBannerItem[]
  weapons: CalendarBannerItem[]
  startTimestamp: number
  endTimestamp: number
  countdownSeconds: number
  poolStatus: number
}

export interface CalendarEvent {
  id: number
  name: string
  type: string
  startTimestamp: number
  endTimestamp: number
  countdownSeconds: number
  status: number
  isFinished: boolean
  headlineReward: CalendarReward | null
  hardChallengeSeconds?: number
  hardChallengeDifficulty?: number
  doubleRemaining?: number
  doubleTotal?: number
  towerUnlocked?: boolean
  towerMaxStar?: number
  towerTotalStar?: number
  theaterUnlocked?: boolean
  theaterMaxRound?: number
  theaterTarotFinished?: number
  theaterDifficulty?: number
}

export interface ChronicleCalendar {
  characterBanners: CalendarBanner[]
  weaponBanners: CalendarBanner[]
  chronicledBanners: CalendarBanner[]
  events: CalendarEvent[]
  challenges: CalendarEvent[]
}

export interface SyncResult {
  status: ChronicleStatus
  notes: ChronicleNotes | null
  message: string | null
  syncedAt: string | null
  gameUid?: string
  server?: string
  cached?: boolean
}

export class HoyoError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
    this.name = 'HoyoError'
  }
}

function requireWorker(): string {
  if (!WORKER_BASE) {
    throw new HoyoError(
      'VITE_SCHEDULE_WORKER_URL is not set. Add the deployed Cloudflare Worker URL to your .env and restart the dev server.',
    )
  }
  return WORKER_BASE
}

async function authHeader(): Promise<Record<string, string>> {
  const current = auth.currentUser
  if (!current) throw new HoyoError('You must be signed in to do that.', 401)
  const token = await current.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function parseError(res: Response): Promise<never> {
  let message = 'HoYoLAB request failed.'
  try {
    const body = (await res.json()) as { error?: string }
    if (body?.error) message = body.error
  } catch {
    /* keep default */
  }
  throw new HoyoError(message, res.status)
}

/** Links a HoYoLAB account: sends the pasted cookies + Genshin UID to be validated, encrypted, stored. */
export async function linkHoyolab(cookie: string, gameUid: string): Promise<SyncResult> {
  const base = requireWorker()
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
  let res: Response
  try {
    res = await fetch(`${base}/hoyolab/link`, { method: 'POST', headers, body: JSON.stringify({ cookie, gameUid }) })
  } catch (err) {
    throw new HoyoError(`Could not reach the Worker: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!res.ok) await parseError(res)
  return (await res.json()) as SyncResult
}

/** Triggers a TTL-gated refresh of the Battle Chronicle snapshot. `force` bypasses the auto TTL
 *  (still hard-capped server-side). The fresh data also arrives via the hoyoNotes onSnapshot. */
export async function syncChronicle(force = false): Promise<SyncResult> {
  const base = requireWorker()
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
  let res: Response
  try {
    res = await fetch(`${base}/hoyolab/sync`, { method: 'POST', headers, body: JSON.stringify({ force }) })
  } catch (err) {
    throw new HoyoError(`Could not reach the Worker: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!res.ok) await parseError(res)
  return (await res.json()) as SyncResult
}

/** Deletes the user's stored HoYoLAB credentials + snapshot. */
export async function unlinkHoyolab(): Promise<void> {
  const base = requireWorker()
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
  let res: Response
  try {
    res = await fetch(`${base}/hoyolab/unlink`, { method: 'POST', headers })
  } catch (err) {
    throw new HoyoError(`Could not reach the Worker: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!res.ok) await parseError(res)
}

export interface RawPayloadResult {
  gameUid: string
  server: string
  raw: unknown
}

/** Developer-only: fetches the full untouched HoYoLAB dailyNote payload (email-gated server-side). */
export async function fetchRawChronicle(): Promise<RawPayloadResult> {
  return fetchRawPayload('/hoyolab/raw')
}

/** Developer-only: fetches the full untouched HoYoLAB act_calendar payload (banners + events). */
export async function fetchRawCalendar(): Promise<RawPayloadResult> {
  return fetchRawPayload('/hoyolab/raw-calendar')
}

async function fetchRawPayload(path: string): Promise<RawPayloadResult> {
  const base = requireWorker()
  const headers = await authHeader()
  let res: Response
  try {
    res = await fetch(`${base}${path}`, { method: 'GET', headers })
  } catch (err) {
    throw new HoyoError(`Could not reach the Worker: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!res.ok) await parseError(res)
  return (await res.json()) as RawPayloadResult
}
