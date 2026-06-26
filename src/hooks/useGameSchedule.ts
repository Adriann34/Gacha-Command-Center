import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Shape of the document the Cloudflare Worker writes to Firestore at gameSchedule/current.
// The worker scrapes HoYoLAB's public bulletin board, parses out version/banner/event info,
// and writes this doc on a cron schedule. The dashboard just reads it live via onSnapshot.

export interface GameVersion {
  version: string       // e.g. "6.6"
  name: string          // e.g. "Luna VII"
  releaseDate: string   // ISO date
}

export interface GameBanner {
  id: string
  name: string
  characters: string[]  // featured 5-star name(s)
  startDate: string      // ISO
  endDate: string        // ISO
  imageUrl?: string
  phase?: number
}

export interface GameEvent {
  id: string
  name: string
  startDate: string // ISO
  endDate: string   // ISO
  type?: string
}

export interface GameSchedule {
  currentVersion: GameVersion | null
  nextVersion: GameVersion | null
  currentBanners: GameBanner[]
  upcomingBanners: GameBanner[]
  currentEvents: GameEvent[]
  upcomingEvents: GameEvent[]
  updatedAt: string // ISO — when the Worker last wrote this doc
}

interface ScheduleState {
  schedule: GameSchedule | null
  loading: boolean
  error: string | null
  notConfigured: boolean
}

export function useGameSchedule(): ScheduleState {
  const [schedule, setSchedule] = useState<GameSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)

  useEffect(() => {
    const ref = doc(db, 'gameSchedule', 'current')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotConfigured(true)
          setSchedule(null)
        } else {
          setSchedule(normalizeSchedule(snap.data()))
          setNotConfigured(false)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { schedule, loading, error, notConfigured }
}

// The Worker writes ISO date strings, but Firestore stores dates as its own native Timestamp
// type — so when the client SDK reads them back, `startDate`/`endDate`/`releaseDate` arrive as
// Timestamp objects (with a `.toDate()` method), not plain strings. `new Date(timestampObject)`
// silently produces "Invalid Date", which is what was causing the "Date unavailable" / NaN
// countdowns. This walks the document and converts any Timestamp-like value to an ISO string
// before handing it to the rest of the app, so every consumer can keep treating these as strings.
interface FirestoreTimestampLike {
  toDate: () => Date
}

function isTimestampLike(value: unknown): value is FirestoreTimestampLike {
  return typeof value === 'object' && value !== null && typeof (value as FirestoreTimestampLike).toDate === 'function'
}

function toIsoIfTimestamp(value: unknown): unknown {
  if (isTimestampLike(value)) return value.toDate().toISOString()
  return value
}

function normalizeBanner(raw: unknown): GameBanner {
  const b = raw as Record<string, unknown>
  return {
    ...b,
    startDate: toIsoIfTimestamp(b['startDate']),
    endDate: toIsoIfTimestamp(b['endDate']),
  } as GameBanner
}

function normalizeEvent(raw: unknown): GameEvent {
  const e = raw as Record<string, unknown>
  return {
    ...e,
    startDate: toIsoIfTimestamp(e['startDate']),
    endDate: toIsoIfTimestamp(e['endDate']),
  } as GameEvent
}

function normalizeVersion(raw: unknown): GameVersion | null {
  if (!raw) return null
  const v = raw as Record<string, unknown>
  return { ...v, releaseDate: toIsoIfTimestamp(v['releaseDate']) } as GameVersion
}

function normalizeSchedule(raw: unknown): GameSchedule {
  const d = raw as Record<string, unknown>
  return {
    currentVersion: normalizeVersion(d['currentVersion']),
    nextVersion: normalizeVersion(d['nextVersion']),
    currentBanners: ((d['currentBanners'] as unknown[]) ?? []).map(normalizeBanner),
    upcomingBanners: ((d['upcomingBanners'] as unknown[]) ?? []).map(normalizeBanner),
    currentEvents: ((d['currentEvents'] as unknown[]) ?? []).map(normalizeEvent),
    upcomingEvents: ((d['upcomingEvents'] as unknown[]) ?? []).map(normalizeEvent),
    updatedAt: toIsoIfTimestamp(d['updatedAt']) as string,
  }
}