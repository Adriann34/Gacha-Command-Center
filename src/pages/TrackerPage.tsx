import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  Plus, Search, MoreHorizontal, Trash2, Edit3,
  ListChecks, Calendar, X, Swords, Gem, Trophy, MapPin, Sparkles,
} from 'lucide-react'

type GoalStatus = 'Planned' | 'In Progress' | 'Blocked' | 'Done'
type GoalCategory = 'Event' | 'Farming' | 'Abyss Prep' | 'Theater Prep' | 'Wish Planning' | 'Exploration' | 'Other'

interface Goal {
  id: string
  name: string
  description: string
  status: GoalStatus
  category: GoalCategory
  dueDate: string
  uid: string
  createdAt: string
  updatedAt?: string
}

interface GoalForm {
  name: string
  description: string
  status: GoalStatus
  category: GoalCategory
  dueDate: string
}

const STATUS_OPTIONS: GoalStatus[] = ['Planned', 'In Progress', 'Blocked', 'Done']
const CATEGORY_OPTIONS: GoalCategory[] = ['Event', 'Farming', 'Abyss Prep', 'Theater Prep', 'Wish Planning', 'Exploration', 'Other']

const STATUS_COLORS: Record<GoalStatus, { bg: string; color: string; border: string }> = {
  'Planned':     { bg: 'rgba(34,211,238,0.1)',   color: 'var(--color-cyan-400)', border: 'rgba(34,211,238,0.25)' },
  'In Progress': { bg: 'rgba(139,92,246,0.1)',   color: 'var(--color-violet-400)', border: 'rgba(139,92,246,0.25)' },
  'Blocked':     { bg: 'rgba(248,113,113,0.1)',  color: 'var(--color-red-400)', border: 'rgba(248,113,113,0.25)' },
  'Done':        { bg: 'rgba(52,211,153,0.1)',   color: 'var(--color-green-400)', border: 'rgba(52,211,153,0.25)' },
}

const CATEGORY_ICONS: Record<GoalCategory, React.ElementType> = {
  'Event': Sparkles,
  'Farming': Gem,
  'Abyss Prep': Swords,
  'Theater Prep': Trophy,
  'Wish Planning': Sparkles,
  'Exploration': MapPin,
  'Other': ListChecks,
}

const CARD_ACCENTS = ['#8b5cf6', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#06b6d4']

/** Today's date as YYYY-MM-DD, used to give the date input a sensible starting value
 * when the user unchecks "No deadline". */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface GoalModalProps {
  open: boolean
  onClose: () => void
  onSave: (form: GoalForm) => Promise<void>
  initial: Goal | null
}

function GoalModal({ open, onClose, onSave, initial }: GoalModalProps) {
  const [form, setForm] = useState<GoalForm>({
    name: '', description: '', status: 'Planned', category: 'Event', dueDate: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name ?? '',
        description: initial.description ?? '',
        status: initial.status ?? 'Planned',
        category: initial.category ?? 'Event',
        dueDate: initial.dueDate ?? '',
      })
    } else {
      setForm({ name: '', description: '', status: 'Planned', category: 'Event', dueDate: '' })
    }
  }, [initial, open])

  if (!open) return null

  const update = (f: keyof GoalForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      padding: '1rem',
    }}>
      <div className="fade-in" style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '1.25rem',
        padding: '2rem', width: '100%', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {initial ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>What do you need to do? *</label>
            <input value={form.name} onChange={update('name')} placeholder="e.g. Clear Spiral Abyss 12-3" className="input-dark" />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>Notes</label>
            <textarea value={form.description} onChange={update('description')} placeholder="Team comp, mats needed, anything to remember" className="input-dark" style={{ resize: 'vertical', minHeight: 80 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>Category</label>
              <select value={form.category} onChange={update('category')} className="input-dark" style={{ cursor: 'pointer' }}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>Status</label>
              <select value={form.status} onChange={update('status')} className="input-dark" style={{ cursor: 'pointer' }}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Deadline</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.dueDate === ''}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.checked ? '' : todayIso() }))}
                  style={{ cursor: 'pointer', accentColor: 'var(--color-violet-500)' }}
                />
                No deadline
              </label>
            </div>
            <input
              type="date"
              value={form.dueDate}
              onChange={update('dueDate')}
              disabled={form.dueDate === ''}
              className="input-dark"
              style={{ colorScheme: 'dark', opacity: form.dueDate === '' ? 0.5 : 1, cursor: form.dueDate === '' ? 'not-allowed' : 'text' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.7rem', borderRadius: '0.75rem', background: 'var(--color-surface-700)',
            border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'var(--font-body)',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary" style={{
            flex: 2, padding: '0.7rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface GoalCardProps {
  goal: Goal
  accent: string
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
  onToggleDone: (g: Goal) => void
}

function GoalCard({ goal, accent, onEdit, onDelete, onToggleDone }: GoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const st = STATUS_COLORS[goal.status] ?? STATUS_COLORS['Planned']
  const CategoryIcon = CATEGORY_ICONS[goal.category] ?? ListChecks
  const isDone = goal.status === 'Done'

  return (
    <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', opacity: isDone ? 0.6 : 1 }}>
      <div style={{ position: 'absolute', top: 0, left: '1.5rem', right: '1.5rem', height: 3, borderRadius: '0 0 3px 3px', background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="checkbox"
            checked={isDone}
            onChange={() => onToggleDone(goal)}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: accent, flexShrink: 0 }}
          />
          <div style={{
            width: 40, height: 40, borderRadius: '0.75rem',
            background: `${accent}18`, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CategoryIcon size={18} color={accent} />
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 10,
              background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
              padding: '0.375rem', minWidth: 140,
            }}>
              <button
                onClick={() => { setMenuOpen(false); onEdit(goal) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                <Edit3 size={14} /> Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(goal.id) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', background: 'none', border: 'none', color: 'var(--color-red-400)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem', textDecoration: isDone ? 'line-through' : 'none' }}>
          {goal.name}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {goal.description || 'No notes added.'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.2rem 0.6rem', borderRadius: '9999px',
          fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color }} />
          {goal.status}
        </span>
        {goal.dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <Calendar size={12} /> {goal.dueDate}
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 600 }}>{goal.category}</div>
    </div>
  )
}

export default function TrackerPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<GoalStatus | 'All'>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  const fetchGoals = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(collection(db, 'goals'), where('uid', '==', user.uid))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Goal[]
      setGoals(data.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { void fetchGoals() }, [user])

  const handleSave = async (form: GoalForm) => {
    if (!user) return
    if (editing) {
      await updateDoc(doc(db, 'goals', editing.id), { ...form, updatedAt: new Date().toISOString() })
    } else {
      await addDoc(collection(db, 'goals'), {
        ...form, uid: user.uid, createdAt: new Date().toISOString(),
      })
    }
    setEditing(null)
    void fetchGoals()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await deleteDoc(doc(db, 'goals', id))
    void fetchGoals()
  }

  const handleEdit = (goal: Goal) => {
    setEditing(goal)
    setModalOpen(true)
  }

  const handleToggleDone = async (goal: Goal) => {
    const newStatus: GoalStatus = goal.status === 'Done' ? 'In Progress' : 'Done'
    await updateDoc(doc(db, 'goals', goal.id), { status: newStatus, updatedAt: new Date().toISOString() })
    void fetchGoals()
  }

  const filtered = goals.filter((g) => {
    const matchSearch = g.name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || g.status === filter
    return matchSearch && matchFilter
  })

  const counts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = goals.filter((g) => g.status === s).length
    return acc
  }, {})

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>Things to do in-game</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Tracker</h1>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary" style={{
          padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.875rem',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-body)',
        }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['All', ...STATUS_OPTIONS] as const).map((s) => {
          const count = s === 'All' ? goals.length : (counts[s] ?? 0)
          const active = filter === s
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '0.4rem 0.875rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
              background: active ? 'linear-gradient(135deg, var(--color-violet-500), var(--color-cyan-500))' : 'var(--color-surface-700)',
              color: active ? 'white' : 'var(--color-text-secondary)',
              border: active ? 'none' : '1px solid var(--color-border)',
            }}>
              {s} {count > 0 && <span style={{ opacity: 0.75 }}>({count})</span>}
            </button>
          )
        })}

        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals..." className="input-dark"
            style={{ paddingLeft: '2.25rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.8rem', borderRadius: '9999px', width: 220 }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Loading goals...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--color-text-muted)' }}>
          <ListChecks size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Nothing tracked yet</p>
          <p style={{ fontSize: '0.85rem' }}>Add a goal — an event to finish, materials to farm, a banner to save for.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary" style={{
            marginTop: '1rem', padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            <Plus size={16} style={{ display: 'inline', marginRight: 4 }} /> New Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              accent={CARD_ACCENTS[i % CARD_ACCENTS.length] ?? '#8b5cf6'}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleDone={handleToggleDone}
            />
          ))}
        </div>
      )}

      <GoalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  )
}
