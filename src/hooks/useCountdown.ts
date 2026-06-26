import { useEffect, useState } from 'react'
import { formatCountdown, formatCountdownWithSeconds } from '../lib/genshinResets'

/** Re-renders every 30s and returns a formatted "Xd Yh Zm" countdown to `target`. */
export function useCountdown(target: Date | null): string {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!target) return '—'
  return formatCountdown(target)
}

/**
 * Re-renders every second and returns a formatted "Xd Yh Zm Ws" countdown to `target`.
 * Returns null if `target` is missing/invalid, so callers can show a fallback instead of
 * "NaNd"/"Invalid Date".
 */
export function useCountdownWithSeconds(target: Date | null): string | null {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000)
    return () => clearInterval(id)
  }, [])

  return formatCountdownWithSeconds(target)
}
