// Local extrapolation of the moving Battle Chronicle numbers.
//
// The Worker fetches HoYoLAB infrequently (TTL-gated) and stores a snapshot whose recovery times are
// "seconds remaining as of syncedAt". These pure functions project that snapshot forward to `now`,
// so the dashboard shows a live, ticking value between syncs without any extra API calls — the same
// rate-limiting strategy PaimonMenuBar uses. All functions are deterministic and side-effect-free.

import type { ChronicleNotes, ChronicleExpedition } from './hoyolab'

/** One resin point regenerates every 8 minutes. */
export const RESIN_SECONDS_PER_POINT = 8 * 60

function elapsedSeconds(syncedAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - syncedAt.getTime()) / 1000)
}

export interface ResinProjection {
  current: number
  max: number
  full: boolean
  secondsUntilFull: number
  secondsUntilNextPoint: number
}

/** Projects resin forward. Resin gains one point per 8 minutes until it reaches max. */
export function extrapolateResin(notes: ChronicleNotes, syncedAt: Date, now: Date): ResinProjection {
  const max = notes.maxResin
  // If the snapshot was already full, it stays full.
  if (notes.resinRecoveryTime <= 0 || notes.currentResin >= max) {
    return { current: max, max, full: true, secondsUntilFull: 0, secondsUntilNextPoint: 0 }
  }
  const remaining = Math.max(0, notes.resinRecoveryTime - elapsedSeconds(syncedAt, now))
  if (remaining <= 0) {
    return { current: max, max, full: true, secondsUntilFull: 0, secondsUntilNextPoint: 0 }
  }
  const pointsRemaining = Math.ceil(remaining / RESIN_SECONDS_PER_POINT)
  const current = Math.min(max, Math.max(notes.currentResin, max - pointsRemaining))
  // Time until the very next single resin point ticks over (the partial segment).
  const secondsUntilNextPoint = remaining - (pointsRemaining - 1) * RESIN_SECONDS_PER_POINT
  return { current, max, full: false, secondsUntilFull: remaining, secondsUntilNextPoint }
}

export interface RealmProjection {
  current: number
  max: number
  full: boolean
  secondsUntilFull: number
}

/** Projects realm currency forward linearly over its known recovery window. */
export function extrapolateRealmCurrency(notes: ChronicleNotes, syncedAt: Date, now: Date): RealmProjection {
  const max = notes.maxHomeCoin
  if (max <= 0) {
    // Teapot not unlocked / no realm currency configured.
    return { current: notes.currentHomeCoin, max, full: notes.homeCoinRecoveryTime <= 0, secondsUntilFull: 0 }
  }
  if (notes.homeCoinRecoveryTime <= 0 || notes.currentHomeCoin >= max) {
    return { current: max, max, full: true, secondsUntilFull: 0 }
  }
  const remaining = Math.max(0, notes.homeCoinRecoveryTime - elapsedSeconds(syncedAt, now))
  if (remaining <= 0) {
    return { current: max, max, full: true, secondsUntilFull: 0 }
  }
  // Linear fill: the amount still to gain (max - current) accrues evenly over homeCoinRecoveryTime.
  const toGain = max - notes.currentHomeCoin
  const gained = toGain * (1 - remaining / notes.homeCoinRecoveryTime)
  const current = Math.min(max, Math.round(notes.currentHomeCoin + gained))
  return { current, max, full: false, secondsUntilFull: remaining }
}

export interface ExpeditionProjection {
  finished: boolean
  secondsRemaining: number
  avatarSideIcon: string
}

export function extrapolateExpedition(exp: ChronicleExpedition, syncedAt: Date, now: Date): ExpeditionProjection {
  const remaining = Math.max(0, exp.remainedTime - elapsedSeconds(syncedAt, now))
  return {
    finished: exp.finished || remaining <= 0,
    secondsRemaining: remaining,
    avatarSideIcon: exp.avatarSideIcon,
  }
}

/** Number of expeditions that have completed as of `now`. */
export function finishedExpeditionCount(notes: ChronicleNotes, syncedAt: Date, now: Date): number {
  return notes.expeditions.reduce((count, e) => count + (extrapolateExpedition(e, syncedAt, now).finished ? 1 : 0), 0)
}

export interface TransformerProjection {
  obtained: boolean
  ready: boolean
  secondsRemaining: number
}

export function extrapolateTransformer(notes: ChronicleNotes, syncedAt: Date, now: Date): TransformerProjection {
  if (!notes.transformerObtained) return { obtained: false, ready: false, secondsRemaining: 0 }
  if (notes.transformerReached || notes.transformerRecoveryTime <= 0) {
    return { obtained: true, ready: true, secondsRemaining: 0 }
  }
  const remaining = Math.max(0, notes.transformerRecoveryTime - elapsedSeconds(syncedAt, now))
  return { obtained: true, ready: remaining <= 0, secondsRemaining: remaining }
}

/** Projects a raw "seconds remaining as of syncedAt" countdown forward to `now` (never below 0).
 *  Used for slow, non-derived timers like the stored-attendance reset that HoYoLAB only gives us as
 *  a single remaining-seconds figure. */
export function extrapolateCountdown(secondsRemainingAtSync: number, syncedAt: Date, now: Date): number {
  return Math.max(0, secondsRemainingAtSync - elapsedSeconds(syncedAt, now))
}

/** Formats a duration in seconds as a compact "Xd Yh Zm" / "Yh Zm" / "Zm" / "<1m" string. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s === 0) return 'Ready'
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return '<1m'
}
