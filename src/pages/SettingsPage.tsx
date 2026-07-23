import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { User, Gamepad2, Bell, Shield, Palette, Save, Check, Loader2, AlertCircle, CheckCircle2, Upload, Trash2, Link2, Unlink, Eye, EyeOff } from 'lucide-react'
import { fetchEnkaPlayerInfo, EnkaError } from '../lib/enka'
import { compressImageToTarget, ImageCompressError, TARGET_MAX_BYTES } from '../lib/imageCompress'
import Avatar from '../components/Avatar'
import { useNotifSettings, type NotifState } from '../hooks/useNotifSettings'
import { useBattleChronicle } from '../hooks/useBattleChronicle'
import { linkHoyolab, unlinkHoyolab, HoyoError } from '../lib/hoyolab'

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
      background: checked ? 'linear-gradient(135deg, var(--color-gold-bright), var(--color-gold-deep))' : 'rgba(255,255,255,0.12)',
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
    <div className="settings-field" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 0', borderBottom: '1px solid var(--color-border)', gap: '2rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{sublabel}</div>}
      </div>
      <div className="settings-field-control" style={{ flexShrink: 0, minWidth: 260 }}>{children}</div>
    </div>
  )
}

/** Pulls a cookie value out of user input, tolerating a pasted "key=value" pair or trailing ";". */
function extractCookieValue(raw: string, key: string): string {
  const v = raw.trim()
  const match = new RegExp(`${key}=([^;\\s]+)`).exec(v)
  if (match) return match[1]
  return v.replace(/^=+/, '').replace(/;+$/, '').trim()
}

/** One labeled field for a single cookie value. Masked like a password, with a reveal toggle so a
 *  paste can still be visually checked. */
function CookieField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'monospace', marginBottom: '0.35rem' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-dark"
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.78rem', paddingRight: '2.5rem' }}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
          style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
            padding: '0.25rem', display: 'flex', alignItems: 'center',
          }}
        >
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  )
}

/** Two cookie fields + link button, shared between the initial-link and re-link (expired) states. */
function HoyoCookieForm({ ltoken, setLtoken, ltuid, setLtuid, onLink, linking, buttonLabel }: {
  ltoken: string
  setLtoken: (v: string) => void
  ltuid: string
  setLtuid: (v: string) => void
  onLink: () => void
  linking: boolean
  buttonLabel: string
}) {
  return (
    <div>
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <CookieField label="ltoken_v2" value={ltoken} onChange={setLtoken} placeholder="paste the ltoken_v2 value here" />
        <CookieField label="ltuid_v2" value={ltuid} onChange={setLtuid} placeholder="paste the ltuid_v2 value here" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          onClick={onLink}
          disabled={linking}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem',
            borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: linking ? 'not-allowed' : 'pointer', opacity: linking ? 0.7 : 1,
          }}
        >
          {linking ? <><Loader2 size={15} className="spin" /> Linking…</> : <><Link2 size={15} /> {buttonLabel}</>}
        </button>
      </div>
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

  // HoYoLAB Battle Chronicle linking
  const chronicle = useBattleChronicle()
  const [ltokenInput, setLtokenInput] = useState('')
  const [ltuidInput, setLtuidInput] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState(false)

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

  const handleLinkHoyolab = async () => {
    setLinkError(null)
    if (!/^\d{9,10}$/.test(genshinUid)) {
      setLinkError('Enter and verify your Genshin UID above first — it tells us which account and region to read.')
      return
    }
    // Tolerate the user pasting either just the value, or the whole "ltoken_v2=VALUE" pair.
    const ltoken = extractCookieValue(ltokenInput, 'ltoken_v2')
    const ltuid = extractCookieValue(ltuidInput, 'ltuid_v2')
    if (!ltoken || !ltuid) {
      setLinkError('Paste both your ltoken_v2 and ltuid_v2 values.')
      return
    }
    setLinking(true)
    try {
      await linkHoyolab(`ltoken_v2=${ltoken}; ltuid_v2=${ltuid}`, genshinUid)
      // Never keep the raw cookie values in component state after a successful link.
      setLtokenInput('')
      setLtuidInput('')
      // The hoyoNotes onSnapshot in useBattleChronicle will flip the UI to the linked state.
    } catch (e) {
      setLinkError(e instanceof HoyoError ? e.message : 'Could not link your HoYoLAB account. Please try again.')
    }
    setLinking(false)
  }

  const handleUnlinkHoyolab = async () => {
    setLinkError(null)
    setUnlinking(true)
    try {
      await unlinkHoyolab()
    } catch (e) {
      setLinkError(e instanceof HoyoError ? e.message : 'Could not unlink your HoYoLAB account.')
    }
    setUnlinking(false)
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
      <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>Manage your account</div>
      <h1 className="page-title" style={{ fontSize: '2.1rem', margin: 0 }}>Settings</h1>
      <div className="title-rule" style={{ margin: '0.9rem 0 1.75rem' }}>
        <span className="dia" /><span className="dia fill" /><span className="ln" />
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar tabs */}
        <div className="card settings-tabs" style={{ padding: '0.75rem' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.65rem 0.875rem', borderRadius: '0.5rem',
              background: activeTab === id ? 'linear-gradient(90deg, rgba(211,188,142,0.16), rgba(211,188,142,0.03))' : 'none',
              border: activeTab === id ? '1px solid var(--gold-line)' : '1px solid transparent',
              color: activeTab === id ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              fontSize: '0.85rem', fontWeight: activeTab === id ? 700 : 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              textAlign: 'left', transition: 'all 0.2s', marginBottom: '0.125rem',
            }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card settings-content" style={{ padding: '2rem', minWidth: 0 }}>
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
                <select value={server} onChange={(e) => setServer(e.target.value)} className="input-dark select-dark" style={{ cursor: 'pointer' }}>
                  {SERVERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>

              {/* HoYoLAB Battle Chronicle linking — powers the live account panel on the dashboard
                  (resin, expeditions, realm currency, commissions, weekly bosses, transformer). */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link2 size={16} color="var(--color-gold)" /> HoYoLAB Battle Chronicle
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
                  Link your HoYoLAB account to see live Resin, Expeditions, Realm Currency, Daily
                  Commissions, Weekly Bosses, and the Parametric Transformer on your dashboard. Your
                  cookies are <strong style={{ color: 'var(--color-text-secondary)' }}>encrypted before storage</strong> and
                  only ever used server-side to read your Battle Chronicle.
                </p>

                {!chronicle.loaded ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    <Loader2 size={15} className="spin" /> Checking link status…
                  </div>
                ) : chronicle.linked ? (
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                      padding: '1rem 1.25rem', borderRadius: '0.875rem',
                      background: chronicle.cookieExpired ? 'rgba(255,122,73,0.08)' : 'rgba(64,192,120,0.08)',
                      border: chronicle.cookieExpired ? '1px solid rgba(255,122,73,0.3)' : '1px solid rgba(64,192,120,0.25)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {chronicle.cookieExpired
                          ? <AlertCircle size={20} color="var(--color-pyro)" style={{ flexShrink: 0 }} />
                          : <CheckCircle2 size={20} color="var(--color-green-400)" style={{ flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {chronicle.cookieExpired ? 'Session expired — re-link needed' : 'HoYoLAB account linked'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            {chronicle.gameUid ? `UID ${chronicle.gameUid}` : ''}
                            {chronicle.syncedAt ? ` · last synced ${chronicle.syncedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleUnlinkHoyolab}
                        disabled={unlinking}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem',
                          borderRadius: '0.625rem', background: 'none', border: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600,
                          cursor: unlinking ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: unlinking ? 0.6 : 1,
                        }}
                      >
                        {unlinking ? <Loader2 size={14} className="spin" /> : <Unlink size={14} />} Unlink
                      </button>
                    </div>

                    {chronicle.cookieExpired && (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.625rem' }}>
                          Paste fresh cookies below to reconnect (your saved UID {genshinUid || ''} will be reused).
                        </p>
                        <HoyoCookieForm
                          ltoken={ltokenInput}
                          setLtoken={setLtokenInput}
                          ltuid={ltuidInput}
                          setLtuid={setLtuidInput}
                          onLink={handleLinkHoyolab}
                          linking={linking}
                          buttonLabel="Reconnect"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ padding: '1rem 1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.875rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>How to get your cookies</div>
                      <ol style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0, paddingLeft: '1.1rem' }}>
                        <li>Open <a href="https://www.hoyolab.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-hydro)' }}>hoyolab.com</a> and log in.</li>
                        <li>Open DevTools (F12) → <strong>Application</strong> → <strong>Cookies</strong> → https://www.hoyolab.com.</li>
                        <li>Copy the <code>ltoken_v2</code> and <code>ltuid_v2</code> values and paste each into its field below.</li>
                      </ol>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.625rem' }}>
                        Also make sure <strong>Real-Time Notes</strong> is enabled in the HoYoLAB app (Battle Chronicle → Settings), otherwise HoYoLAB won't return this data.
                      </div>
                    </div>
                    <HoyoCookieForm
                      ltoken={ltokenInput}
                      setLtoken={setLtokenInput}
                      ltuid={ltuidInput}
                      setLtuid={setLtuidInput}
                      onLink={handleLinkHoyolab}
                      linking={linking}
                      buttonLabel="Link account"
                    />
                  </div>
                )}

                {linkError && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-red-400)', marginTop: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {linkError}
                  </div>
                )}
              </div>
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
                { key: 'resinCapped',      label: 'Resin Capped',          sub: 'When your Original Resin reaches its cap (HoYoLAB linked)' },
                { key: 'expeditionsDone',  label: 'Expeditions Complete',  sub: 'When all dispatched expeditions have finished' },
                { key: 'commissionBonus',  label: 'Commission Bonus',      sub: 'When daily commissions are done but the bonus is unclaimed' },
                { key: 'transformerReady', label: 'Parametric Transformer', sub: 'When the transformer is off cooldown and ready to use' },
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
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontFamily: 'var(--font-body)', fontWeight: 700,
                      background: t === 'Dark' ? 'linear-gradient(135deg, var(--color-gold-bright), var(--color-gold-deep))' : 'rgba(13,17,28,0.5)',
                      border: t === 'Dark' ? 'none' : '1px solid var(--gold-line-soft)',
                      color: t === 'Dark' ? '#241d0c' : 'var(--color-text-muted)',
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

      <style>{`
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr !important; }
          /* Tabs become a horizontal, scrollable row above the content */
          .settings-tabs { display: flex; gap: 0.375rem; overflow-x: auto; padding: 0.5rem; }
          .settings-tabs button { width: auto !important; flex: 0 0 auto; margin-bottom: 0 !important; white-space: nowrap; }
          .settings-content { padding: 1.25rem !important; }
          /* Label / control stack vertically instead of squeezing side by side */
          .settings-field { flex-direction: column; gap: 0.75rem !important; }
          .settings-field-control { min-width: 0 !important; width: 100%; }
        }
      `}</style>
    </div>
  )
}
