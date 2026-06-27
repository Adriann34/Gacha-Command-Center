import { useEffect, useState } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAuth } from '../context/AuthContext'

// Shared avatar display: shows the user's uploaded photo (stored as a base64 data URL on their
// Firestore profile doc — see imageCompress.ts for why base64-in-Firestore instead of Firebase
// Storage) when one exists, falling back to the original gradient-circle-with-initials look
// otherwise. Centralizing this in one component means the upload feature in SettingsPage
// automatically shows up everywhere an avatar is rendered (sidebar, topbar) without having to
// duplicate the "do we have a photo, or initials" branch in three places.
//
// Subscribes to the live profile (useUserProfile) rather than the one-shot AuthContext profile,
// so saving a new avatar in Settings updates the sidebar/topbar immediately in the same session.

function initialsFor(displayName: string | null | undefined, email: string | null | undefined): string {
  if (displayName) {
    return displayName.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email?.[0]?.toUpperCase() ?? 'U'
}

export default function Avatar({ size = 36 }: { size?: number }) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [imgFailed, setImgFailed] = useState(false)

  const initials = initialsFor(profile?.displayName ?? user?.displayName, profile?.email ?? user?.email)
  const avatarSrc = profile?.avatarBase64

  // If the photo changes (new upload, or removed), give the new source a fresh chance to load
  // rather than staying stuck showing initials because a previous, different photo once failed.
  useEffect(() => {
    setImgFailed(false)
  }, [avatarSrc])

  const showPhoto = Boolean(avatarSrc) && !imgFailed

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: showPhoto ? 'var(--color-surface-700)' : 'linear-gradient(135deg, var(--color-violet-500), var(--color-cyan-500))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      fontSize: size * 0.36, fontWeight: 700, color: 'white',
    }}>
      {showPhoto && avatarSrc ? (
        <img
          src={avatarSrc}
          alt={profile?.displayName ?? 'Profile photo'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}
