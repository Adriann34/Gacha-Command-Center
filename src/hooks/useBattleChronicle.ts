import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { syncChronicle, type ChronicleNotes, type ChronicleStatus } from '../lib/hoyolab'

// Reads the signed-in user's Battle Chronicle snapshot, written by the Cloudflare Worker to
// hoyoNotes/{uid}. Mirrors the useGameSchedule pattern: live onSnapshot subscription + a normalize
// step (fireworkers stores our ISO syncedAt as a Firestore Timestamp, so it reads back as a
// Timestamp object and must be converted). On mount it also fires a TTL-gated sync so opening the
// dashboard freshens the data; the moving numbers are then extrapolated locally (hoyoExtrapolate.ts).

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

export interface ChronicleState {
  notes: ChronicleNotes | null
  status: ChronicleStatus
  syncedAt: Date | null
  message: string | null
  gameUid: string | null
  server: string | null
  /** True once we know whether an account is linked (i.e. the initial snapshot has arrived). */
  loaded: boolean
  linked: boolean
  cookieExpired: boolean
  syncing: boolean
  error: string | null
  /** Manually refresh (force bypasses the auto TTL, still server-rate-limited). */
  sync: (force?: boolean) => Promise<void>
}

export function useBattleChronicle(): ChronicleState {
  const { user } = useAuth()
  const [notes, setNotes] = useState<ChronicleNotes | null>(null)
  const [status, setStatus] = useState<ChronicleStatus>('unlinked')
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [gameUid, setGameUid] = useState<string | null>(null)
  const [server, setServer] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoSyncedFor = useRef<string | null>(null)

  // Live subscription to the snapshot doc.
  useEffect(() => {
    if (!user) {
      setNotes(null)
      setStatus('unlinked')
      setLoaded(true)
      return
    }
    setLoaded(false)
    const ref = doc(db, 'hoyoNotes', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotes(null)
          setStatus('unlinked')
          setSyncedAt(null)
          setMessage(null)
          setGameUid(null)
          setServer(null)
        } else {
          const d = snap.data()
          setNotes((d['notes'] as ChronicleNotes | null) ?? null)
          setStatus((d['status'] as ChronicleStatus) ?? 'error')
          setSyncedAt(toDate(d['syncedAt']))
          setMessage((d['message'] as string | null) ?? null)
          setGameUid((d['gameUid'] as string | null) ?? null)
          setServer((d['server'] as string | null) ?? null)
        }
        setLoaded(true)
      },
      (err) => {
        setError(err.message)
        setLoaded(true)
      },
    )
    return () => unsub()
  }, [user])

  const sync = useCallback(async (force = false) => {
    if (!user) return
    setSyncing(true)
    setError(null)
    try {
      const result = await syncChronicle(force)
      // The onSnapshot will also update, but reflect the result immediately for responsiveness.
      if (result.status === 'unlinked') {
        setStatus('unlinked')
        setNotes(null)
      } else {
        setStatus(result.status)
        if (result.notes) setNotes(result.notes)
        if (result.syncedAt) setSyncedAt(toDate(result.syncedAt))
        setMessage(result.message ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }, [user])

  // Auto-freshen once per signed-in session, but only once we know an account is actually linked —
  // this avoids a pointless Worker call for users who've never linked HoYoLAB. The server still
  // enforces the sync TTL, so for linked users this is usually a cheap cached response.
  useEffect(() => {
    if (!user || !loaded || status === 'unlinked') return
    if (autoSyncedFor.current === user.uid) return
    autoSyncedFor.current = user.uid
    void sync(false)
  }, [user, loaded, status, sync])

  return {
    notes,
    status,
    syncedAt,
    message,
    gameUid,
    server,
    loaded,
    linked: status !== 'unlinked',
    cookieExpired: status === 'cookie_expired',
    syncing,
    error,
    sync,
  }
}
