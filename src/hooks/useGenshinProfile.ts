import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

interface GenshinProfile {
  genshinUid: string | null
  server: string | null
  loading: boolean
}

/**
 * Reads the signed-in user's saved Genshin UID + server from Firestore (users/{uid}).
 * This is the single source of truth for "which account are we showing data for" —
 * set once in Settings, remembered everywhere else.
 */
export function useGenshinProfile(): GenshinProfile {
  const { user } = useAuth()
  const [genshinUid, setGenshinUid] = useState<string | null>(null)
  const [server, setServer] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (!active) return
        if (snap.exists()) {
          const d = snap.data()
          setGenshinUid((d['genshinUid'] as string) ?? null)
          setServer((d['server'] as string) ?? null)
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  return { genshinUid, server, loading }
}
