import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { User, Gamepad2, Bell, Shield, Palette, Save, Check, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchEnkaPlayerInfo, EnkaError } from '../lib/enka'

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

interface NotifState {
  banners: boolean
  events: boolean
  abyssReset: boolean
  theaterReset: boolean
  dailyReminder: boolean
}

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
      background: checked ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : '#1e2640',
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 0', borderBottom: '1px solid #1e2640', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f0f2ff', marginBottom: '0.2rem' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.78rem', color: '#4a5578' }}>{sublabel}</div>}
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
  const [notifs, setNotifs] = useState<NotifState>({
    banners: true, events: true, abyssReset: true, theaterReset: true, dailyReminder: false,
  })
  const [appearance, setAppearance] = useState({ accentColor: '#8b5cf6' })

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
        if (d['notifs']) setNotifs(d['notifs'] as NotifState)
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
        notifs,
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

  const ACCENT_COLORS = ['#8b5cf6', '#06b6d4', '#f472b6', '#34d399', '#f59e0b', '#ef4444']

  const initials = profile.displayName
    ? profile.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#8892b0', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>Manage your account</p>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 700, color: '#f0f2ff', margin: 0 }}>Settings</h1>
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
              color: activeTab === id ? '#f0f2ff' : '#8892b0',
              fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#f0f2ff', margin: '0 0 0.375rem' }}>Profile Information</h2>
              <p style={{ color: '#4a5578', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Update your personal details.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 0', borderBottom: '1px solid #1e2640', marginBottom: '0.5rem' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f0f2ff', marginBottom: '0.25rem' }}>Profile Photo</div>
                  <div style={{ fontSize: '0.78rem', color: '#4a5578', marginBottom: '0.625rem' }}>Avatar generated from your initials</div>
                  <div style={{ fontSize: '0.75rem', color: '#4a5578' }}>Photo upload coming soon</div>
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
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#f0f2ff', margin: '0 0 0.375rem' }}>Genshin Account</h2>
              <p style={{ color: '#4a5578', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                Connect your in-game UID to pull character builds, artifacts, and Abyss showcase via Enka.Network. This is saved to your account so you only need to set it once.
              </p>

              <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#8892b0', marginBottom: '0.5rem', fontWeight: 600 }}>How to find your UID</div>
                <div style={{ fontSize: '0.8rem', color: '#8892b0', lineHeight: 1.6 }}>
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
                      {uidStatus === 'checking' && <Loader2 size={16} color="#8892b0" className="spin" />}
                      {uidStatus === 'valid' && <CheckCircle2 size={16} color="#34d399" />}
                      {uidStatus === 'invalid' && <AlertCircle size={16} color="#f87171" />}
                    </div>
                  </div>
                  {uidStatus === 'valid' && verifiedNickname && (
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.4rem' }}>
                      Found: {verifiedNickname}
                    </div>
                  )}
                  {uidStatus === 'invalid' && (
                    <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.4rem' }}>
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
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#f0f2ff', margin: '0 0 0.375rem' }}>Notifications</h2>
              <p style={{ color: '#4a5578', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Control what alerts show up on your dashboard.</p>

              {([
                { key: 'banners',       label: 'Banner Changes',     sub: 'When a new banner phase goes live' },
                { key: 'events',        label: 'Event Reminders',    sub: 'When events are about to start or end' },
                { key: 'abyssReset',    label: 'Spiral Abyss Reset', sub: 'Reminder before the bi-weekly reset' },
                { key: 'theaterReset',  label: 'Imaginarium Theater Reset', sub: 'Reminder before the monthly reset' },
                { key: 'dailyReminder', label: 'Daily Commissions',  sub: 'Reminder to clear daily commissions' },
              ] as { key: keyof NotifState; label: string; sub: string }[]).map(({ key, label, sub }) => (
                <FormField key={key} label={label} sublabel={sub}>
                  <Toggle checked={notifs[key]} onChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))} />
                </FormField>
              ))}
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#f0f2ff', margin: '0 0 0.375rem' }}>Security</h2>
              <p style={{ color: '#4a5578', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Keep your account safe.</p>

              <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.875rem', marginBottom: '1.5rem', display: 'flex', gap: '0.875rem' }}>
                <Shield size={20} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f2ff', marginBottom: '0.25rem' }}>Your account is secured</div>
                  <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>Firebase Authentication handles password security and session management for you.</div>
                </div>
              </div>

              <FormField label="Change Password" sublabel="You'll be sent a reset email">
                <button style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', background: '#141729', border: '1px solid #1e2640', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  Send Reset Email
                </button>
              </FormField>
              <FormField label="Active Sessions" sublabel="Manage where you're logged in">
                <div style={{ fontSize: '0.82rem', color: '#8892b0' }}>
                  <div style={{ marginBottom: '0.375rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                    Current browser — Active now
                  </div>
                </div>
              </FormField>
            </div>
          )}

          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#f0f2ff', margin: '0 0 0.375rem' }}>Appearance</h2>
              <p style={{ color: '#4a5578', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Customize the look of your dashboard.</p>

              <FormField label="Theme" sublabel="Gacha Command Center is designed for dark mode">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['Dark', 'System'].map((t) => (
                    <button key={t} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.625rem', fontSize: '0.82rem', fontFamily: 'Inter, sans-serif',
                      background: t === 'Dark' ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : '#141729',
                      border: t === 'Dark' ? 'none' : '1px solid #1e2640',
                      color: t === 'Dark' ? 'white' : '#8892b0', cursor: 'pointer',
                    }}>{t}</button>
                  ))}
                </div>
              </FormField>

              <FormField label="Accent Color" sublabel="Primary color used across the interface">
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map((c) => (
                    <div key={c} onClick={() => setAppearance((p) => ({ ...p, accentColor: c }))} style={{
                      width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: appearance.accentColor === c ? '3px solid white' : '3px solid transparent',
                      boxSizing: 'border-box', transition: 'border 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {appearance.accentColor === c && <Check size={13} color="white" />}
                    </div>
                  ))}
                </div>
              </FormField>

              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#141729', border: '1px solid #1e2640', borderRadius: '0.875rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#4a5578', marginBottom: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Preview</div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${appearance.accentColor}, #06b6d4)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="white" fill="white" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f2ff' }}>Gacha Command Center</div>
                    <div style={{ fontSize: '0.7rem', color: '#4a5578' }}>Genshin Impact Tracker</div>
                  </div>
                  <button style={{ marginLeft: 'auto', padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: `linear-gradient(135deg, ${appearance.accentColor}, #06b6d4)`, border: 'none', color: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Sample Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== 'security' && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #1e2640', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{
                padding: '0.7rem 1.5rem', borderRadius: '0.75rem', fontSize: '0.875rem',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Inter, sans-serif',
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
