import { useEffect, useState, useCallback } from 'react'
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

/**
 * Tracks which reminder ids the user has already dismissed, persisted at
 * `users/{uid}.dismissedReminders`. Reminder ids are deterministic per-occurrence
 * (e.g. "abyss" only changes once the reset has actually passed and a new countdown begins),
 * so a dismissed reminder stays dismissed until it's naturally replaced by the next cycle.
 */
export function useDismissedReminders() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    if (!user) {
      setDismissed([])
      return
    }
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, (snap) => {
      const saved = snap.exists() ? (snap.data()['dismissedReminders'] as string[] | undefined) : undefined
      setDismissed(saved ?? [])
    })
    return () => unsub()
  }, [user])

  const dismiss = useCallback(async (id: string) => {
    if (!user) return
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]))
    const ref = doc(db, 'users', user.uid)
    const next = dismissed.includes(id) ? dismissed : [...dismissed, id]
    try {
      await updateDoc(ref, { dismissedReminders: next })
    } catch {
      await setDoc(ref, { dismissedReminders: next }, { merge: true })
    }
  }, [user, dismissed])

  return { dismissed, dismiss }
}
