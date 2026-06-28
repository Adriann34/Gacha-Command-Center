import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react'

interface FormState {
  name: string
  email: string
  password: string
}

interface FieldConfig {
  key: keyof FormState
  label: string
  placeholder: string
  type: string
  icon: React.ElementType
}

export default function SignUpPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.name)
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') setError('An account with this email already exists.')
      else setError('Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch {
      setError('Could not sign in with Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fields: FieldConfig[] = [
    { key: 'name', label: 'Full name', placeholder: 'Jane Smith', type: 'text', icon: User },
    { key: 'email', label: 'Work email', placeholder: 'jane@company.com', type: 'email', icon: Mail },
    { key: 'password', label: 'Password', placeholder: '6+ characters', type: 'password', icon: Lock },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-surface-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '2rem 1.5rem',
    }}>
      <div className="orb" style={{ width: 450, height: 450, background: 'radial-gradient(circle, #6d28d9, #4c1d95)', top: -100, right: -80 }} />
      <div className="orb" style={{ width: 350, height: 350, background: 'radial-gradient(circle, #0891b2, #0e7490)', bottom: -80, left: -60, opacity: 0.12 }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/branding/logo.png" alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: '1.25rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.5rem' }}>
            Start your journey
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Set up your Gacha Command Center — free, just for you
          </p>
        </div>

        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '1.25rem', padding: '2rem' }}>
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              padding: '0.75rem 1rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
              color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s', marginBottom: '1.25rem',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-surface-400)'; e.currentTarget.style.background = 'var(--color-surface-600)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-700)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-red-400)', borderRadius: '0.75rem', padding: '0.75rem 1rem',
                fontSize: '0.85rem', marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {fields.map(({ key, label, placeholder, type, icon: Icon }) => (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {label}
                </label>
                <div style={{ position: 'relative' }}>
                  <Icon size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type={key === 'password' ? (showPassword ? 'text' : 'password') : type}
                    value={form[key]}
                    onChange={update(key)}
                    placeholder={placeholder}
                    required
                    className="input-dark"
                    style={{ paddingLeft: '2.5rem', paddingRight: key === 'password' ? '2.5rem' : '1rem' }}
                  />
                  {key === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-body)', marginTop: '0.5rem' }}
            >
              {loading ? 'Creating workspace...' : 'Create free account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/signin" style={{ color: 'var(--color-violet-400)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
