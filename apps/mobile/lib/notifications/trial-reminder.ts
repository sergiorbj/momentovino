import * as Notifications from 'expo-notifications'
import { SchedulableTriggerInputTypes } from 'expo-notifications'

const TRIAL_REMINDER_ID = 'trial-reminder-1d'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function cancelTrialReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID)
  } catch {
    /* nothing scheduled — ignore */
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (current.canAskAgain === false) return false
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  })
  return req.granted
}

/**
 * Schedules a single local notification 24h before `trialEndsAt`. Idempotent:
 * a previous reminder with the same identifier is replaced. No-ops when the
 * fire date is already in the past or the user denies notification access.
 */
export async function scheduleTrialReminder(opts: {
  trialEndsAt: Date
  title: string
  body: string
}): Promise<boolean> {
  const fireDate = new Date(opts.trialEndsAt.getTime() - ONE_DAY_MS)
  if (fireDate.getTime() <= Date.now()) return false

  try {
    const granted = await ensurePermission()
    if (!granted) return false

    await cancelTrialReminder()
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: opts.title,
        body: opts.body,
        sound: 'default',
        data: { kind: 'trial-reminder' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    })
    return true
  } catch (err) {
    console.warn('[trial-reminder] schedule failed', err)
    return false
  }
}
