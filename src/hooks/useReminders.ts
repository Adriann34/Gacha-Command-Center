import { useMemo } from 'react'
import { useGameSchedule } from './useGameSchedule'
import { useGenshinProfile } from './useGenshinProfile'
import { getNextAbyssReset, getNextTheaterReset } from '../lib/genshinResets'
import { useNotifSettings } from './useNotifSettings'
import { useDismissedReminders } from './useDismissedReminders'
import { useBattleChronicle } from './useBattleChronicle'
import { extrapolateResin, extrapolateTransformer, finishedExpeditionCount } from '../lib/hoyoExtrapolate'

export type ReminderKind = 'abyss' | 'theater' | 'banner' | 'event' | 'resin' | 'expedition' | 'commission' | 'transformer'

export interface Reminder {
  /** Stable id used for the "seen/dismissed" set saved to Firestore. */
  id: string
  kind: ReminderKind
  title: string
  detail: string
  /** The moment this reminder is "about", used for sorting (soonest first). */
  at: Date
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

/** True if `target` is in the future but no more than 2 days away. */
function isWithinTwoDays(target: Date, now: Date): boolean {
  const diff = target.getTime() - now.getTime()
  return diff > 0 && diff <= TWO_DAYS_MS
}

function daysAndHoursLeft(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime()
  const totalHours = Math.max(0, Math.floor(diffMs / 3_600_000))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

/**
 * Builds the current list of "2 days left" reminders for Spiral Abyss, Imaginarium Theater,
 * current banners, and current events — respecting the toggles saved on Settings → Notifications
 * (same `users/{uid}.notifs` field, so the bell and the settings page are always in sync).
 */
export function useReminders(): { reminders: Reminder[]; loading: boolean; dismiss: (id: string) => void } {
  const { schedule, loading: scheduleLoading } = useGameSchedule()
  const { server, loading: profileLoading } = useGenshinProfile()
  const { notifs, loading: notifsLoading } = useNotifSettings()
  const { dismissed, dismiss } = useDismissedReminders()
  const chronicle = useBattleChronicle()

  // Only the fields that actually drive reminders — kept minimal so the memo below isn't rebuilt
  // on every 1s extrapolation tick (which the dashboard panel does, but the bell doesn't need to).
  const chronicleFresh = chronicle.status === 'ok'
  const notes = chronicle.notes
  const syncedAtMs = chronicle.syncedAt?.getTime() ?? 0

  const reminders = useMemo(() => {
    const now = new Date()
    const list: Reminder[] = []
    const srv = server ?? 'os_usa'
    const today = now.toISOString().slice(0, 10) // day-granularity so a dismissal lasts the day

    // HoYoLAB Battle Chronicle alerts — derived locally from the last successful sync. Only surfaced
    // when data is fresh (status ok); stale/expired data must never assert a live condition.
    if (chronicleFresh && notes && syncedAtMs > 0) {
      const syncedAt = new Date(syncedAtMs)

      if (notifs.resinCapped) {
        const resin = extrapolateResin(notes, syncedAt, now)
        if (resin.full && resin.max > 0) {
          list.push({ id: `resin-capped-${today}`, kind: 'resin', title: 'Original Resin is capped', detail: `${resin.max}/${resin.max} — spend it before it overflows`, at: now })
        }
      }

      if (notifs.expeditionsDone) {
        const total = notes.expeditions.length
        if (total > 0 && finishedExpeditionCount(notes, syncedAt, now) === total) {
          list.push({ id: `expeditions-done-${today}`, kind: 'expedition', title: 'All expeditions complete', detail: 'Collect rewards and redeploy', at: now })
        }
      }

      if (notifs.commissionBonus && notes.totalTaskNum > 0 && notes.finishedTaskNum >= notes.totalTaskNum && !notes.isExtraTaskRewardReceived) {
        list.push({ id: `commission-bonus-${today}`, kind: 'commission', title: 'Daily commission bonus unclaimed', detail: 'Claim your extra reward from Katheryne', at: now })
      }

      if (notifs.transformerReady) {
        const t = extrapolateTransformer(notes, syncedAt, now)
        if (t.obtained && t.ready) {
          list.push({ id: `transformer-ready-${today}`, kind: 'transformer', title: 'Parametric Transformer is ready', detail: 'Use it to farm materials', at: now })
        }
      }
    }

    if (notifs.abyssReset) {
      const { nextReset } = getNextAbyssReset(srv, now)
      if (isWithinTwoDays(nextReset, now)) {
        list.push({
          id: `abyss-${nextReset.toISOString().slice(0, 10)}`,
          kind: 'abyss',
          title: 'Spiral Abyss resets soon',
          detail: daysAndHoursLeft(nextReset, now),
          at: nextReset,
        })
      }
    }

    if (notifs.theaterReset) {
      const { nextReset } = getNextTheaterReset(srv, now)
      if (isWithinTwoDays(nextReset, now)) {
        list.push({
          id: `theater-${nextReset.toISOString().slice(0, 10)}`,
          kind: 'theater',
          title: 'Imaginarium Theater resets soon',
          detail: daysAndHoursLeft(nextReset, now),
          at: nextReset,
        })
      }
    }

    if (notifs.banners && schedule?.currentBanners) {
      for (const b of schedule.currentBanners) {
        const end = new Date(b.endDate)
        if (!isNaN(end.getTime()) && isWithinTwoDays(end, now)) {
          list.push({
            id: `banner-${b.id}`,
            kind: 'banner',
            title: `${b.name} ends soon`,
            detail: daysAndHoursLeft(end, now),
            at: end,
          })
        }
      }
    }

    if (notifs.events && schedule?.currentEvents) {
      for (const e of schedule.currentEvents) {
        const end = new Date(e.endDate)
        if (!isNaN(end.getTime()) && isWithinTwoDays(end, now)) {
          list.push({
            id: `event-${e.id}`,
            kind: 'event',
            title: `${e.name} ends soon`,
            detail: daysAndHoursLeft(end, now),
            at: end,
          })
        }
      }
    }

    return list.sort((a, b) => a.at.getTime() - b.at.getTime()).filter((r) => !dismissed.includes(r.id))
  }, [schedule, server, notifs, dismissed, chronicleFresh, notes, syncedAtMs])

  return { reminders, loading: scheduleLoading || profileLoading || notifsLoading, dismiss }
}
