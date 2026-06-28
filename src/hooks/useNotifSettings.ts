import { useEffect, useState, useCallback } from 'react'
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export interface NotifState {
  banners: boolean
  events: boolean
  abyssReset: boolean
  theaterReset: boolean
}

export const DEFAULT_NOTIFS: NotifState = {
  banners: true,
  events: true,
  abyssReset: true,
  theaterReset: true,
}

/**
 * Single source of truth for notification preferences, saved at `users/{uid}.notifs`.
 * Read live via onSnapshot so the Settings page and the notification bell are always showing
 * the same toggles — flip one off in Settings and the bell stops surfacing that reminder
 * immediately, without needing a page refresh.
 */
export function useNotifSettings() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<NotifState>(DEFAULT_NOTIFS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifs(DEFAULT_NOTIFS)
      setLoading(false)
      return
    }
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const saved = snap.exists() ? (snap.data()['notifs'] as Partial<NotifState> | undefined) : undefined
        setNotifs({ ...DEFAULT_NOTIFS, ...saved })
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [user])

  const saveNotifs = useCallback(async (next: NotifState) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    try {
      await updateDoc(ref, { notifs: next, updatedAt: new Date().toISOString() })
    } catch {
      // Doc may not exist yet for a brand-new account — fall back to creating it.
      await setDoc(ref, { notifs: next, updatedAt: new Date().toISOString() }, { merge: true })
    }
  }, [user])

  return { notifs, loading, saveNotifs }
}
