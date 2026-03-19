import type { EventType } from '@/features/events/types'

/** Distance in metres at which each event type triggers a voice alert */
export const ALERT_DISTANCES: Record<EventType, number> = {
  police:   800,
  camera:   500,
  accident: 400,
  danger:   300,
}

export const ALERT_LABELS_BG: Record<EventType, string> = {
  police:   'Внимание! Полиция напред',
  camera:   'Камера напред',
  accident: 'Внимание! Катастрофа напред',
  danger:   'Внимание! Опасност напред',
}

/** Distance at which the police siren sound + screen flash fires (before the voice alert) */
export const POLICE_SIREN_DISTANCE_M = 820

/** Cooldown: don't re-alert the same event within this window */
export const COOLDOWN_MS = 45_000
