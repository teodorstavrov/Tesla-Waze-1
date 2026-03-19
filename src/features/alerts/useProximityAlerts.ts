/**
 * Watches GPS position and fires voice alerts + callbacks when the user
 * enters the proximity threshold of any reported event.
 *
 * A single watchPosition is held for the component lifetime.
 * Events and callbacks are read via refs to avoid restarting the watcher.
 */
import { useEffect, useRef } from 'react'
import { useEventStore }     from '@/features/events/store'
import { haversine }         from '@/lib/haversine'
import { ALERT_DISTANCES, ALERT_LABELS_BG, COOLDOWN_MS } from './config'
import type { EventType } from '@/features/events/types'

interface AlertCallbacks {
  onPolice?: () => void
}

export function useProximityAlerts({ onPolice }: AlertCallbacks = {}) {
  const events      = useEventStore((s) => s.events)
  const eventsRef   = useRef(events)
  const onPoliceRef = useRef(onPolice)

  // Keep refs current without restarting the watcher
  useEffect(() => { eventsRef.current   = events   }, [events])
  useEffect(() => { onPoliceRef.current = onPolice }, [onPolice])

  // alerted[eventId] = timestamp of last alert
  const alertedRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        const now = Date.now()

        for (const ev of eventsRef.current) {
          const dist      = haversine(lat, lng, ev.lat, ev.lng)
          const threshold = ALERT_DISTANCES[ev.type]
          if (dist > threshold) continue

          const lastAlert = alertedRef.current.get(ev.id) ?? 0
          if (now - lastAlert < COOLDOWN_MS) continue

          alertedRef.current.set(ev.id, now)
          speak(ev.type)
          if (ev.type === 'police') onPoliceRef.current?.()
        }
      },
      null,
      { enableHighAccuracy: true, maximumAge: 2_000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, []) // single watcher for component lifetime
}

function speak(type: EventType) {
  if (!window.speechSynthesis) return
  const utt  = new SpeechSynthesisUtterance(ALERT_LABELS_BG[type])
  utt.lang   = 'bg-BG'
  utt.rate   = 1.0
  utt.volume = 1.0
  // Cancel any ongoing speech so the new alert is heard immediately
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}
