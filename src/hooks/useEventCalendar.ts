import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { ChronicleCalendar, ChronicleStatus } from '../lib/hoyolab'

// Reads the signed-in user's event-calendar snapshot (banners + events), written by the Cloudflare
// Worker to hoyoCalendar/{uid}. This is a pure live subscriber: the Worker refreshes this doc on its
// own longer TTL during the SAME /hoyolab/sync that useBattleChronicle already triggers, so there's
// no separate fetch here. Like the other snapshot readers, it normalizes the ISO syncedAt that
// fireworkers stores as a Firestore Timestamp back into a Date for local "time remaining" math.

interface FirestoreTimestampLike {
  toDate: () => Date
}

function isTimestampLike(value: unknown): value is FirestoreTimestampLike {
  return typeof value === 'object' && value !== null && typeof (value as FirestoreTimestampLike).toDate === 'function'
}

function toDate(value: unknown): Date | null {
  if (isTimestampLike(value)) return value.toDate()
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export interface EventCalendarState {
  calendar: ChronicleCalendar | null
  status: ChronicleStatus | 'unlinked'
  syncedAt: Date | null
  /** True once the initial snapshot has arrived (so consumers know whether data exists yet). */
  loaded: boolean
  /** True when a calendar snapshot with usable data is present. */
  available: boolean
}

export function useEventCalendar(): EventCalendarState {
  const { user } = useAuth()
  const [calendar, setCalendar] = useState<ChronicleCalendar | null>(null)
  const [status, setStatus] = useState<ChronicleStatus | 'unlinked'>('unlinked')
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      setCalendar(null)
      setStatus('unlinked')
      setLoaded(true)
      return
    }
    setLoaded(false)
    const ref = doc(db, 'hoyoCalendar', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setCalendar(null)
          setStatus('unlinked')
          setSyncedAt(null)
        } else {
          const d = snap.data()
          setCalendar((d['calendar'] as ChronicleCalendar | null) ?? null)
          setStatus((d['status'] as ChronicleStatus) ?? 'error')
          setSyncedAt(toDate(d['syncedAt']))
        }
        setLoaded(true)
      },
      () => setLoaded(true),
    )
    return () => unsub()
  }, [user])

  return {
    calendar,
    status,
    syncedAt,
    loaded,
    available: calendar != null,
  }
}
