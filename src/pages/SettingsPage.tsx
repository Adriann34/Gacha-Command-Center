import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { User, Gamepad2, Bell, Shield, Palette, Save, Check, Loader2, AlertCircle, CheckCircle2, Upload, Trash2 } from 'lucide-react'
import { fetchEnkaPlayerInfo, EnkaError } from '../lib/enka'
import { compressImageToTarget, ImageCompressError, TARGET_MAX_BYTES } from '../lib/imageCompress'
import Avatar from '../components/Avatar'
import { useNotifSettings, type NotifState } from '../hooks/useNotifSettings'

type TabId = 'profile' | 'genshin' | 'notifications' | 'security' | 'appearance'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
}

const TABS: Tab[] = [
  { id: 'profile',       label: 'Profile',        icon: User },
  { id: 'genshin',       label: 'Genshin Account', icon: Gamepad2 },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'appearance',    label: 'Appearance',     icon: Palette },
]

const SERVERS = [
  { value: 'os_usa', label: 'America' },
  { value: 'os_euro', label: 'Europe' },
  { value: 'os_asia', label: 'Asia' },
  { value: 'os_cht', label: 'TW / HK / MO' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
      background: checked ? 'linear-gradient(135deg, var(--color-violet-500), var(--color-cyan-500))' : 'var(--color-border)',
      position: 'relative', transition: 'background 0.3s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: 'white',
        transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

function FormField({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 0', borderBottom: '1px solid var(--color-border)', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{sublabel}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 260 }}>{children}</div>
    </div>
  )
}

type UidStatus = 'idle' | 'checking' | 'valid' | 'invalid'

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState({ displayName: '', email: '' })
  const [genshinUid, setGenshinUid] = useState('')
  const [server, setServer] = useState('os_usa')
  const [uidStatus, setUidStatus] = useState<UidStatus>('idle')
  const [uidError, setUidError] = useState<string>('')
  const [verifiedNickname, setVerifiedNickname] = useState('')
  const { notifs, saveNotifs } = useNotifSettings()

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSavedJustNow, setAvatarSavedJustNow] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    setProfile({ displayName: user.displayName ?? '', email: user.email ?? '' })
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setProfile((p) => ({ ...p, displayName: (d['displayName'] as string) ?? user.displayName ?? '' }))
        if (d['genshinUid']) {
          setGenshinUid(d['genshinUid'] as string)
          setUidStatus('valid')
        }
        if (d['server']) setServer(d['server'] as string)
      }
    })
  }, [user])

  const verifyUid = async (uid: string) => {
    if (!/^\d{6,10}$/.test(uid)) {
      setUidStatus('invalid')
      setUidError('UID should be 6–10 digits.')
      return
    }
    setUidStatus('checking')
    setUidError('')
    try {
      const data = await fetchEnkaPlayerInfo(uid)
      setVerifiedNickname(data?.playerInfo?.nickname ?? '')
      setUidStatus('valid')
    } catch (e) {
      setUidStatus('invalid')
      setUidError(e instanceof EnkaError ? e.message : "Couldn't verify this UID.")
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        genshinUid,
        server,
        updatedAt: new Date().toISOString(),
      })
      if (profile.displayName !== user.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profile.displayName })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  // Avatar upload: compress client-side to fit comfortably inside Firestore's 1 MiB document
  // limit, then store the resulting base64 data URL directly on the user's profile document.
  //
  // Deliberately NOT Firebase Storage — Cloud Storage for Firebase has required the paid Blaze
  // plan to provision or even keep using a bucket since Feb 3, 2026, which rules it out entirely
  // for a Spark-plan, no-card-on-file project. Firestore itself stays free on Spark, and a
  // ~150KB image (~200KB once base64-encoded) fits easily within one document alongside the rest
  // of this settings doc. See imageCompress.ts for the full rationale and compression strategy.
  const handleAvatarFile = async (file: File) => {
    if (!user) return
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const { dataUrl, bytes } = await compressImageToTarget(file, TARGET_MAX_BYTES)
      await updateDoc(doc(db, 'users', user.uid), {
        avatarBase64: dataUrl,
        avatarUpdatedAt: new Date().toISOString(),
      })
      console.info(`Avatar saved: ${Math.round(bytes / 1024)}KB after compression.`)
      setAvatarSavedJustNow(true)
      setTimeout(() => setAvatarSavedJustNow(false), 2500)
    } catch (e) {
      setAvatarError(e instanceof ImageCompressError ? e.message : 'Could not upload this photo. Please try again.')
      console.error(e)
    }
    setAvatarUploading(false)
  }

  const handleAvatarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (file) void handleAvatarFile(file)
  }

  const handleRemoveAvatar = async () => {
    if (!user) return
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        avatarBase64: '',
        avatarUpdatedAt: new Date().toISOString(),
      })
    } catch (e) {
      setAvatarError('Could not remove your photo. Please try again.')
      console.error(e)
    }
    setAvatarUploading(false)
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>Manage your account</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar tabs */}
        <div className="card" style={{ padding: '0.75rem' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.65rem 0.875rem', borderRadius: '0.625rem',
              background: activeTab === id ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.1))' : 'none',
              border: activeTab === id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
              color: activeTab === id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
              textAlign: 'left', transition: 'all 0.2s', marginBottom: '0.125rem',
            }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ padding: '2rem' }}>
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem' }}>Profile Information</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Update your personal details.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar size={72} />
                  {avatarUploading && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(15,18,32,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Loader2 size={22} color="white" className="spin" />
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Profile Photo</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
                    Uploaded photos are compressed to ~150KB and stored on your account.
                  </div>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarInputChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem',
                        borderRadius: '0.625rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
                        color: 'var(--color-violet-400)', fontSize: '0.8rem', fontWeight: 500,
                        cursor: avatarUploading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                        opacity: avatarUploading ? 0.6 : 1,
                      }}
                    >
                      <Upload size={14} />
                      Upload photo
                    </button>
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem',
                        borderRadius: '0.625rem', background: 'none', border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500,
                        cursor: avatarUploading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                        opacity: avatarUploading ? 0.6 : 1,
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                    {avatarSavedJustNow && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-green-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check size={13} /> Saved
                      </span>
                    )}
                  </div>
                  {avatarError && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-red-400)', marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.35rem', maxWidth: 420 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      {avatarError}
                    </div>
                  )}
                </div>
              </div>

              <FormField label="Display Name" sublabel="Used across the dashboard">
                <input value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} className="input-dark" placeholder="Your name" />
              </FormField>
              <FormField label="Email Address" sublabel="Your login email">
                <input value={profile.email} disabled className="input-dark" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </FormField>
            </div>
          )}


          {/* Genshin Account tab */}
          {activeTab === 'genshin' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem' }}>Genshin Account</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                Connect your in-game UID to pull character builds, artifacts, and Abyss showcase via Enka.Network. This is saved to your account so you only need to set it once.
              </p>

              <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>How to find your UID</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Open Genshin Impact → tap your profile in the top-left → your UID is the number shown under your nickname. Make sure your <strong>Character Showcase</strong> is set up in-game (Profile → Character Showcase) so Enka.Network can read it.
                </div>
              </div>

              <FormField label="UID" sublabel="Your 9-digit in-game UID">
                <div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={genshinUid}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setGenshinUid(v)
                        setUidStatus('idle')
                        setUidError('')
                      }}
                      onBlur={() => genshinUid && verifyUid(genshinUid)}
                      className="input-dark"
                      placeholder="e.g. 618285856"
                      style={{ paddingRight: '2.25rem' }}
                    />
                    <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                      {uidStatus === 'checking' && <Loader2 size={16} color="var(--color-text-secondary)" className="spin" />}
                      {uidStatus === 'valid' && <CheckCircle2 size={16} color="var(--color-green-400)" />}
                      {uidStatus === 'invalid' && <AlertCircle size={16} color="var(--color-red-400)" />}
                    </div>
                  </div>
                  {uidStatus === 'valid' && verifiedNickname && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-green-400)', marginTop: '0.4rem' }}>
                      Found: {verifiedNickname}
                    </div>
                  )}
                  {uidStatus === 'invalid' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-red-400)', marginTop: '0.4rem' }}>
                      {uidError || "Couldn't verify this UID. Check the number, or make sure your Character Showcase is public."}
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="Server Region" sublabel="Used for reset-time calculations">
                <select value={server} onChange={(e) => setServer(e.target.value)} className="input-dark" style={{ cursor: 'pointer' }}>
                  {SERVERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem' }}>Notifications</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                Control what shows up in your reminders. Changes save automatically and sync to the bell icon right away.
              </p>

              {([
                { key: 'banners',       label: 'Banner Changes',     sub: 'When a current banner has 2 days or less left' },
                { key: 'events',        label: 'Event Reminders',    sub: 'When a current event has 2 days or less left' },
                { key: 'abyssReset',    label: 'Spiral Abyss Reset', sub: 'When the bi-weekly reset has 2 days or less left' },
                { key: 'theaterReset',  label: 'Imaginarium Theater Reset', sub: 'When the monthly reset has 2 days or less left' },
              ] as { key: keyof NotifState; label: string; sub: string }[]).map(({ key, label, sub }) => (
                <FormField key={key} label={label} sublabel={sub}>
                  <Toggle checked={notifs[key]} onChange={(v) => void saveNotifs({ ...notifs, [key]: v })} />
                </FormField>
              ))}
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem' }}>Security</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Keep your account safe.</p>

              <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.875rem', marginBottom: '1.5rem', display: 'flex', gap: '0.875rem' }}>
                <Shield size={20} color="var(--color-violet-400)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Your account is secured</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Firebase Authentication handles password security and session management for you.</div>
                </div>
              </div>

              <FormField label="Change Password" sublabel="You'll be sent a reset email">
                <button style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', color: 'var(--color-violet-400)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  Send Reset Email
                </button>
              </FormField>
              <FormField label="Active Sessions" sublabel="Manage where you're logged in">
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  <div style={{ marginBottom: '0.375rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green-400)', display: 'inline-block' }} />
                    Current browser — Active now
                  </div>
                </div>
              </FormField>
            </div>
          )}

          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem' }}>Appearance</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Customize the look of your dashboard.</p>

              <FormField label="Theme" sublabel="Designed for dark mode — light mode is coming soon">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['Dark', 'System'].map((t) => (
                    <button key={t} disabled={t === 'System'} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.625rem', fontSize: '0.82rem', fontFamily: 'var(--font-body)',
                      background: t === 'Dark' ? 'linear-gradient(135deg, var(--color-violet-500), var(--color-cyan-500))' : 'var(--color-surface-700)',
                      border: t === 'Dark' ? 'none' : '1px solid var(--color-border)',
                      color: t === 'Dark' ? 'white' : 'var(--color-text-muted)',
                      cursor: t === 'Dark' ? 'pointer' : 'not-allowed',
                      opacity: t === 'Dark' ? 1 : 0.6,
                    }}>{t}</button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {/* Save button */}
          {activeTab !== 'security' && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{
                padding: '0.7rem 1.5rem', borderRadius: '0.75rem', fontSize: '0.875rem',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-body)',
              }}>
                {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
