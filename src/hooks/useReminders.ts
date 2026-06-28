import { useMemo } from 'react'
import { useGameSchedule } from './useGameSchedule'
import { useGenshinProfile } from './useGenshinProfile'
import { getNextAbyssReset, getNextTheaterReset } from '../lib/genshinResets'
import { useNotifSettings } from './useNotifSettings'
import { useDismissedReminders } from './useDismissedReminders'

export type ReminderKind = 'abyss' | 'theater' | 'banner' | 'event'

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

  const reminders = useMemo(() => {
    const now = new Date()
    const list: Reminder[] = []
    const srv = server ?? 'os_usa'

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
  }, [schedule, server, notifs, dismissed])

  return { reminders, loading: scheduleLoading || profileLoading || notifsLoading, dismiss }
}
