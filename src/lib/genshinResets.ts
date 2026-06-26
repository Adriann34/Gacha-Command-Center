// Spiral Abyss resets on the 16th of each month; Imaginarium Theater resets on the 1st.
// Both reset at 04:00 server time. Server "time zones" in Genshin are fixed UTC offsets that do
// NOT observe daylight saving — confirmed by HoYoverse support docs: America (UTC-5), Europe (UTC+1),
// Asia/TW-HK-MO (UTC+8). Because these are fixed offsets, this can be computed deterministically
// with no API call needed.

export const SERVER_UTC_OFFSET: Record<string, number> = {
  os_usa: -5,
  os_euro: 1,
  os_asia: 8,
  os_cht: 8,
}

const RESET_HOUR = 4 // 04:00 server time

/** Returns a Date representing `day`/`hour` of `monthOffset` months from `from`, in server time, expressed as a real UTC Date. */
function serverDate(from: Date, monthOffset: number, day: number, offsetHours: number): Date {
  // Build the date using UTC fields shifted by the server's fixed offset, then convert to true UTC.
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth() + monthOffset
  // Construct as if `offsetHours` were UTC, then subtract the offset to get true UTC instant.
  const asIfUTC = new Date(Date.UTC(y, m, day, RESET_HOUR, 0, 0))
  return new Date(asIfUTC.getTime() - offsetHours * 60 * 60 * 1000)
}

export interface ResetInfo {
  label: string
  nextReset: Date
  /** "current period started" — useful for showing e.g. "this cycle began on..." */
  periodStart: Date
}

/**
 * Computes the next Spiral Abyss reset (16th of month, 04:00 server time) for the given server.
 */
export function getNextAbyssReset(server: string, now: Date = new Date()): ResetInfo {
  const offset = SERVER_UTC_OFFSET[server] ?? -5
  let next = serverDate(now, 0, 16, offset)
  if (next.getTime() <= now.getTime()) {
    next = serverDate(now, 1, 16, offset)
  }
  const periodStart = serverDate(next, -1, 16, offset)
  return { label: 'Spiral Abyss Reset', nextReset: next, periodStart }
}

/**
 * Computes the next Imaginarium Theater reset (1st of month, 04:00 server time) for the given server.
 */
export function getNextTheaterReset(server: string, now: Date = new Date()): ResetInfo {
  const offset = SERVER_UTC_OFFSET[server] ?? -5
  const thisMonth = serverDate(now, 0, 1, offset)
  const nextMonth = serverDate(now, 1, 1, offset)
  const next = thisMonth.getTime() > now.getTime() ? thisMonth : nextMonth
  const periodStart = serverDate(next, -1, 1, offset)
  return { label: 'Imaginarium Theater Reset', nextReset: next, periodStart }
}

export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return 'Resetting now'
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Same as formatCountdown, but always includes seconds — used for banner/event timers where
 * a bit more precision feels right. Returns null if `target` isn't a valid date (instead of
 * "NaNd"), so callers can show a fallback instead of broken text.
 */
export function formatCountdownWithSeconds(target: Date | null, now: Date = new Date()): string | null {
  if (!target || isNaN(target.getTime())) return null
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return 'Ended'
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
