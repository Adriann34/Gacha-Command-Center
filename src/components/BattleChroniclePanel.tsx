import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, RefreshCw, Link2, AlertTriangle, CheckCircle2, Gift, Check } from 'lucide-react'
import { useBattleChronicle } from '../hooks/useBattleChronicle'
import {
  extrapolateResin, extrapolateRealmCurrency, extrapolateExpedition,
  extrapolateTransformer, extrapolateCountdown, formatDuration,
} from '../lib/hoyoExtrapolate'
import type { ChronicleNotes, RewardSlotState } from '../lib/hoyolab'

/** A Date that updates every `intervalMs`, driving live local extrapolation between syncs. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** The circular, light-haloed icon box used across every Battle Chronicle tile — holds either a
 *  game-art image (imgSrc) or a lucide glyph, so all tiles read as one consistent set. */
function IconBadge({ imgSrc, icon: Icon, accent }: { imgSrc?: string; icon?: React.ElementType; accent: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid var(--gold-line)', color: accent,
      background: 'radial-gradient(circle, rgba(255,255,255,0.14), rgba(255,255,255,0.02))',
    }}>
      {imgSrc
        ? <img src={imgSrc} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        : Icon ? <Icon size={17} strokeWidth={1.7} /> : null}
    </div>
  )
}

function TileShell({ icon: Icon, imgSrc, label, accent, children }: {
  icon?: React.ElementType; imgSrc?: string; label: string; accent: string; children: React.ReactNode
}) {
  return (
    <div className="ornate stat-card" style={{ padding: '1.05rem 1.2rem', flex: 1, minWidth: 210, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -28, top: -28, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${accent}24, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem', position: 'relative' }}>
        <IconBadge imgSrc={imgSrc} icon={Icon} accent={accent} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
      </div>
      {children}
    </div>
  )
}

function BigValue({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: accent, letterSpacing: '0.01em', lineHeight: 1.1 }}>
      {children}
    </div>
  )
}

function SubText({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>{children}</div>
}

function Bar({ ratio, accent }: { ratio: number; accent: string }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '0.6rem' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  )
}

const EXPEDITION_ACCENT = 'var(--color-geo)'
// HoYoLAB's dailyNote payload gives time remaining but not each expedition's total duration, so the
// per-row progress bar is approximated against the standard 20-hour maximum expedition length.
const ASSUMED_EXPEDITION_SECONDS = 20 * 3600

/** Character side-icon for an expedition, with a compass glyph fallback if the image is missing/404s. */
function ExpeditionAvatar({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      border: '1px solid var(--gold-line)', background: 'rgba(0,0,0,0.25)',
      display: 'grid', placeItems: 'center',
    }}>
      {src && !failed
        ? <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Compass size={16} color={EXPEDITION_ACCENT} />}
    </div>
  )
}

/** Compact expeditions tile (same footprint as the other tiles): one row per dispatched
 *  expedition, showing the assigned character, status and remaining time. */
function ExpeditionsCard({ notes, syncedAt, reference }: { notes: ChronicleNotes; syncedAt: Date; reference: Date }) {
  const rows = notes.expeditions.map((e) => extrapolateExpedition(e, syncedAt, reference))
  const total = rows.length
  const done = rows.filter((r) => r.finished).length

  return (
    <div className="ornate stat-card" style={{ padding: '1.05rem 1.2rem', flex: 1, minWidth: 210, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -28, top: -28, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${EXPEDITION_ACCENT}24, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', position: 'relative' }}>
        <IconBadge imgSrc="/icons/expedition.svg" accent={EXPEDITION_ACCENT} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Expeditions <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{done}/{total || notes.maxExpeditionNum}</span>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>None dispatched</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', position: 'relative' }}>
          {rows.map((r, i) => {
            const ratio = r.finished ? 1 : Math.min(1, Math.max(0, 1 - r.secondsRemaining / ASSUMED_EXPEDITION_SECONDS))
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExpeditionAvatar src={r.avatarSideIcon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: r.finished ? EXPEDITION_ACCENT : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {r.finished ? 'Ready' : 'Exploring'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: r.finished ? EXPEDITION_ACCENT : 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {r.finished ? 'Done' : formatDuration(r.secondsRemaining)}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '0.3rem' }}>
                    <div style={{ height: '100%', width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${EXPEDITION_ACCENT}, ${EXPEDITION_ACCENT}cc)`, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Verbose duration for the resin tile, e.g. "7 h and 57 min", "1 d, 2 h and 5 min". */
function formatReplenish(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s < 60) return 'less than a minute'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d} d`)
  if (h > 0) parts.push(`${h} h`)
  if (m > 0) parts.push(`${m} min`)
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** Original Resin tile — features the real resin art and a verbose "until fully replenished" line. */
function ResinTile({ notes, syncedAt, reference }: { notes: ChronicleNotes; syncedAt: Date; reference: Date }) {
  const RESIN = 'var(--color-hydro)'
  const r = extrapolateResin(notes, syncedAt, reference)
  return (
    <TileShell imgSrc="/icons/original-resin.webp" label="Original Resin" accent={RESIN}>
      <BigValue accent={RESIN}>{r.current}<span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}> / {r.max}</span></BigValue>
      <Bar ratio={r.max ? r.current / r.max : 0} accent={RESIN} />
      <SubText>{r.full ? 'Fully replenished' : `${formatReplenish(r.secondsUntilFull)} until fully replenished`}</SubText>
    </TileShell>
  )
}

const DAILY_ACCENT = 'var(--color-dendro)'

/** Formats the slow stored-attendance reset countdown compactly ("17d", "6h 12m", "Ready"). */
function formatReset(seconds: number): string {
  if (seconds <= 0) return 'Ready'
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`
  return formatDuration(seconds)
}

/** A single reward slot in the commission / encounter-point rows. Dim when unfinished, accented when
 *  ready to claim, and marked with a check once claimed — mirroring the in-game Battle Chronicle. */
function RewardSlot({ state, accent, children }: { state: RewardSlotState; accent: string; children: React.ReactNode }) {
  const ready = state === 'finished'
  const claimed = state === 'claimed'
  return (
    <div style={{
      position: 'relative', width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      display: 'grid', placeItems: 'center',
      border: `1px solid ${ready ? accent : 'var(--gold-line-soft)'}`,
      background: ready ? `${accent}22` : 'rgba(255,255,255,0.04)',
      opacity: state === 'unfinished' ? 0.4 : 1,
    }}>
      {children}
      {claimed && (
        <div style={{
          position: 'absolute', right: -3, bottom: -3, width: 13, height: 13, borderRadius: '50%',
          background: accent, display: 'grid', placeItems: 'center', border: '1px solid #10141f',
        }}>
          <Check size={9} strokeWidth={3} color="#0b0f18" />
        </div>
      )}
    </div>
  )
}

/** A labelled horizontal row of reward slots (e.g. "Daily Commissions", "Encounter Points"). */
function SlotRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '0.7rem' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

/** Daily Commissions tile: per-commission reward slots, the Encounter-Point gift row, and the
 *  Long-Term Encounter Points multiplier + its reset countdown — matching the in-game panel. */
function DailiesCard({ notes, syncedAt, reference }: { notes: ChronicleNotes; syncedAt: Date; reference: Date }) {
  const accent = DAILY_ACCENT
  // Tolerate snapshots written before these fields existed (they arrive on the next sync): default
  // the new arrays/values so an older hoyoNotes doc renders instead of crashing.
  const taskRewards = notes.dailyTaskRewards ?? []
  const attendanceRewards = notes.attendanceRewards ?? []
  // Prefer HoYoLAB's per-slot statuses; if an account omits them, synthesize slots from the
  // finished/total counts so the row still reflects progress.
  const commissionSlots: RewardSlotState[] = taskRewards.length
    ? taskRewards
    : Array.from({ length: notes.totalTaskNum }, (_, i): RewardSlotState => (i < notes.finishedTaskNum ? 'claimed' : 'unfinished'))
  const done = notes.totalTaskNum > 0 && notes.finishedTaskNum >= notes.totalTaskNum
  const showEncounter = notes.attendanceVisible === true && attendanceRewards.length > 0
  const resetSeconds = extrapolateCountdown(notes.storedAttendanceRefreshCountdown ?? 0, syncedAt, reference)

  return (
    <div className="ornate stat-card" style={{ padding: '1.05rem 1.2rem', flex: 1, minWidth: 210, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -28, top: -28, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${accent}24, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
        <IconBadge imgSrc="/icons/daily-commission.svg" accent={accent} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Daily Commissions{' '}
          <span style={{ color: done ? accent : 'var(--color-text-muted)', fontWeight: 400 }}>{notes.finishedTaskNum}/{notes.totalTaskNum}</span>
        </div>
      </div>

      <SlotRow label="Daily Commissions">
        {commissionSlots.map((s, i) => (
          <RewardSlot key={i} state={s} accent={accent}>
            <img src="/icons/daily-commission.svg" alt="" style={{ width: 17, height: 17, objectFit: 'contain' }} />
          </RewardSlot>
        ))}
      </SlotRow>

      {showEncounter && (
        <SlotRow label="Encounter Points">
          {attendanceRewards.map((a, i) => (
            <RewardSlot key={i} state={a.state} accent={accent}>
              <Gift size={15} strokeWidth={1.7} color="var(--color-text-secondary)" />
            </RewardSlot>
          ))}
        </SlotRow>
      )}

      {showEncounter && (
        <div style={{
          marginTop: '0.8rem', padding: '0.6rem 0.7rem', borderRadius: '0.55rem',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--gold-line-soft)',
          position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.35rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Long-Term Encounter Points</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.45rem',
              borderRadius: '999px', background: 'var(--color-gold)18', border: '1px solid var(--gold-line-soft)',
              fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-gold-bright)', fontVariantNumeric: 'tabular-nums',
            }}>
              ×{notes.storedAttendance ?? '0'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Reset Countdown</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0.1rem 0.45rem',
              borderRadius: '999px', background: 'var(--color-gold)18', border: '1px solid var(--gold-line-soft)',
              fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums',
            }}>{formatReset(resetSeconds)}</span>
          </div>
        </div>
      )}

      <SubText>
        {done
          ? (notes.isExtraTaskRewardReceived ? 'All done · bonus claimed' : 'Done · claim your bonus reward')
          : `${notes.totalTaskNum - notes.finishedTaskNum} commission${notes.totalTaskNum - notes.finishedTaskNum !== 1 ? 's' : ''} left today`}
      </SubText>
    </div>
  )
}

export default function BattleChroniclePanel() {
  const chronicle = useBattleChronicle()
  const navigate = useNavigate()
  const now = useNow(1000)

  // Section heading with refresh control, shown in every state.
  const heading = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '1rem', flexWrap: 'wrap' }}>
      <h2 className="section-heading" style={{ fontSize: '1.05rem' }}>Battle Chronicle</h2>
      {chronicle.linked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {chronicle.syncedAt && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Synced {chronicle.syncedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => void chronicle.sync(true)}
            disabled={chronicle.syncing}
            aria-label="Refresh Battle Chronicle"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem',
              borderRadius: '0.5rem', background: 'rgba(13,17,28,0.6)', border: '1px solid var(--gold-line-soft)',
              color: 'var(--color-gold)', fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-body)',
              cursor: chronicle.syncing ? 'not-allowed' : 'pointer', opacity: chronicle.syncing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} className={chronicle.syncing ? 'spin' : undefined} /> Refresh
          </button>
        </div>
      )}
    </div>
  )

  // Not linked yet — invite the user to connect (mirrors the "connect your Genshin UID" banner).
  if (chronicle.loaded && !chronicle.linked) {
    return (
      <div style={{ marginBottom: '1.75rem' }}>
        {heading}
        <div className="ornate" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1.25rem 1.5rem' }}>
          <Link2 size={18} color="var(--color-gold)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Link your <strong style={{ color: 'var(--color-text-primary)' }}>HoYoLAB</strong> account to see live Resin, Expeditions, Realm Currency, Commissions, Weekly Bosses, and the Parametric Transformer right here.
          </div>
          <button onClick={() => navigate('/settings')} style={{
            padding: '0.45rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(13,17,28,0.6)',
            border: '1px solid var(--gold-line)', color: 'var(--color-gold)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, flexShrink: 0,
          }}>
            Link account
          </button>
        </div>
      </div>
    )
  }

  // Loading initial snapshot.
  if (!chronicle.loaded) {
    return (
      <div style={{ marginBottom: '1.75rem' }}>
        {heading}
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading your account…</div>
      </div>
    )
  }

  const fresh = chronicle.status === 'ok'
  // When data is stale (expired/rate-limited/error), freeze extrapolation at the sync instant so we
  // never render numbers that keep ticking as if live.
  const reference = fresh ? now : (chronicle.syncedAt ?? now)
  const syncedAt = chronicle.syncedAt ?? now
  const notes = chronicle.notes

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {heading}

      {!fresh && (
        <div className="ornate" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.25rem', marginBottom: '1rem',
          background: 'rgba(255,122,73,0.08)', border: '1px solid rgba(255,122,73,0.3)',
        }}>
          <AlertTriangle size={16} color="var(--color-pyro)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {chronicle.cookieExpired
              ? 'Your HoYoLAB session expired. Showing your last synced data — reconnect in Settings to resume live updates.'
              : (chronicle.message ?? 'Could not refresh from HoYoLAB. Showing your last synced data.')}
          </div>
          {chronicle.cookieExpired && (
            <button onClick={() => navigate('/settings')} style={{
              padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(13,17,28,0.6)',
              border: '1px solid var(--gold-line)', color: 'var(--color-gold)', fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, flexShrink: 0,
            }}>Reconnect</button>
          )}
        </div>
      )}

      {!notes ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {chronicle.message ?? 'No account data available yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Resin */}
          <ResinTile notes={notes} syncedAt={syncedAt} reference={reference} />

          {/* Realm currency */}
          {(() => {
            const rc = extrapolateRealmCurrency(notes, syncedAt, reference)
            const GOLD = 'var(--color-gold-bright)'
            return (
              <TileShell imgSrc="/icons/realm-currency.webp" label="Realm Currency" accent={GOLD}>
                {rc.max <= 0 ? (
                  <>
                    <BigValue accent={GOLD}>—</BigValue>
                    <SubText>Serenitea Pot not unlocked</SubText>
                  </>
                ) : (
                  <>
                    <BigValue accent={GOLD}>{rc.current}<span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}> / {rc.max}</span></BigValue>
                    <Bar ratio={rc.max ? rc.current / rc.max : 0} accent={GOLD} />
                    <SubText>{rc.full ? 'Capped' : `Full in ${formatDuration(rc.secondsUntilFull)}`}</SubText>
                  </>
                )}
              </TileShell>
            )
          })()}

          {/* Daily commissions — reward slots, Encounter Points, Long-Term multiplier + reset. */}
          <DailiesCard notes={notes} syncedAt={syncedAt} reference={reference} />

          {/* Expeditions — compact tile listing the character assigned to each. */}
          <ExpeditionsCard notes={notes} syncedAt={syncedAt} reference={reference} />

          {/* Weekly bosses */}
          {(() => {
            const GOLD = 'var(--color-gold-bright)'
            const remaining = notes.remainResinDiscountNum
            const limit = notes.resinDiscountNumLimit
            return (
              <TileShell imgSrc="/icons/weekly-boss.webp" label="Weekly Bosses" accent={GOLD}>
                <BigValue accent={GOLD}>{remaining}<span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}> / {limit}</span></BigValue>
                <Bar ratio={limit ? remaining / limit : 0} accent={GOLD} />
                <SubText>{remaining > 0 ? `${remaining} discounted claim${remaining !== 1 ? 's' : ''} left` : 'All discounts used this week'}</SubText>
              </TileShell>
            )
          })()}

          {/* Parametric transformer */}
          {(() => {
            const GOLD = 'var(--color-gold-bright)'
            const t = extrapolateTransformer(notes, syncedAt, reference)
            return (
              <TileShell imgSrc="/icons/parametric-transformer.webp" label="Parametric Transformer" accent={GOLD}>
                {!t.obtained ? (
                  <>
                    <BigValue accent={GOLD}>—</BigValue>
                    <SubText>Not obtained yet</SubText>
                  </>
                ) : t.ready ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={20} color={GOLD} />
                      <BigValue accent={GOLD}>Ready</BigValue>
                    </div>
                    <SubText>Available to use now</SubText>
                  </>
                ) : (
                  <>
                    <BigValue accent={GOLD}>{formatDuration(t.secondsRemaining)}</BigValue>
                    <SubText>Until ready</SubText>
                  </>
                )}
              </TileShell>
            )
          })()}
        </div>
      )}
    </div>
  )
}
