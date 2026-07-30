import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { CharacterEntry } from '../lib/hoyolab'

export interface CharacterListState {
  characters: CharacterEntry[]
  loaded: boolean
  syncedAt: Date | null
}

export function useCharacterList(): CharacterListState {
  const { user } = useAuth()
  const [characters, setCharacters] = useState<CharacterEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) { setCharacters([]); setLoaded(true); return }
    const ref = doc(db, 'characters', user.uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setCharacters((d['characters'] as CharacterEntry[]) ?? [])
        const at = d['syncedAt'] as string
        setSyncedAt(at ? new Date(at) : null)
      } else {
        setCharacters([]); setSyncedAt(null)
      }
      setLoaded(true)
    }, () => { setLoaded(true) })
    return () => unsub()
  }, [user])

  return { characters, loaded, syncedAt }
}
