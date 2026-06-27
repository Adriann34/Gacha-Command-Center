import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

// Live view of the signed-in user's own Firestore profile document (users/{uid}).
//
// AuthContext already loads this once on sign-in (a one-shot getDoc), which is fine for the
// fields it actually reads there, but it means any update made elsewhere in the app — most
// notably Settings saving a new avatarBase64 — would not be reflected in the sidebar/topbar
// avatar until a full reload. This hook subscribes with onSnapshot instead, so saving a new
// avatar in Settings updates every place that renders it immediately, in the same tab.
//
// This intentionally does NOT replace AuthContext.userProfile — it's a small, additive hook used
// specifically by components that need to react live to profile changes (right now: the shared
// Avatar component). AuthContext's one-shot load is left alone to avoid touching working
// sign-in/sign-up flows that don't need live updates.

export interface LiveUserProfile {
  displayName?: string
  email?: string
  avatarBase64?: string
  genshinUid?: string
  server?: string
}

export function useUserProfile(): { profile: LiveUserProfile | null; loading: boolean } {
  const { user } = useAuth()
  const [profile, setProfile] = useState<LiveUserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as LiveUserProfile) : null)
        setLoading(false)
      },
      () => {
        setProfile(null)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [user])

  return { profile, loading }
}
