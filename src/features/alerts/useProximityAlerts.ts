/**
 * Watches GPS position and fires:
 *  - Voice alerts when within the configured threshold for each event type
 *  - onPolice callback (siren flash) when within 800m of a police marker
 *  - onNearEvent callback when within 5m of ANY event (confirmation prompt)
 *
 * A single watchPosition lives for the component lifetime.
 * Events and callbacks are read via refs so the watcher never restarts.
 */
import { useEffect, useRef } from 'react'
import { useEventStore }     from '@/features/events/store'
import { haversine }         from '@/lib/haversine'
import { ALERT_DISTANCES, ALERT_LABELS_BG, COOLDOWN_MS } from './config'
import type { EventType }    from '@/features/events/types'
import type { ReportedEvent } from '@/features/events/types'

/** Distance in metres that triggers the "Still there?" confirmation prompt */
const CONFIRM_DISTANCE_M = 5
/** Don't re-prompt the same event within this window */
const CONFIRM_COOLDOWN_MS = 60_000

interface AlertCallbacks {
  onPolice?:    () => void
  onNearEvent?: (ev: ReportedEvent) => void
}

export function useProximityAlerts({ onPolice, onNearEvent }: AlertCallbacks = {}) {
  const events         = useEventStore((s) => s.events)
  const eventsRef      = useRef(events)
  const onPoliceRef    = useRef(onPolice)
  const onNearEventRef = useRef(onNearEvent)

  useEffect(() => { eventsRef.current      = events      }, [events])
  useEffect(() => { onPoliceRef.current    = onPolice    }, [onPolice])
  useEffect(() => { onNearEventRef.current = onNearEvent }, [onNearEvent])

  // alertedRef   — last voice-alert timestamp per event id
  // confirmedRef — last "near" prompt timestamp per event id
  const alertedRef   = useRef<Map<string, number>>(new Map())
  const confirmedRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        const now = Date.now()

        for (const ev of eventsRef.current) {
          const dist = haversine(lat, lng, ev.lat, ev.lng)

          // ── Voice alert ──────────────────────────────────────────────────
          const threshold = ALERT_DISTANCES[ev.type]
          if (dist <= threshold) {
            const lastAlert = alertedRef.current.get(ev.id) ?? 0
            if (now - lastAlert >= COOLDOWN_MS) {
              alertedRef.current.set(ev.id, now)
              speak(ev.type)
              if (ev.type === 'police') {
                playPoliceSiren()
                onPoliceRef.current?.()
              }
            }
          }

          // ── 5 m confirmation prompt ──────────────────────────────────────
          if (dist <= CONFIRM_DISTANCE_M) {
            const lastConfirm = confirmedRef.current.get(ev.id) ?? 0
            if (now - lastConfirm >= CONFIRM_COOLDOWN_MS) {
              confirmedRef.current.set(ev.id, now)
              onNearEventRef.current?.(ev)
            }
          }
        }
      },
      null,
      { enableHighAccuracy: true, maximumAge: 2_000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
}

function speak(type: EventType) {
  if (!window.speechSynthesis) return
  const utt  = new SpeechSynthesisUtterance(ALERT_LABELS_BG[type])
  utt.lang   = 'bg-BG'
  utt.rate   = 1.0
  utt.volume = 1.0
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}

/** Police siren: two-tone sweep 770 Hz ↔ 960 Hz, 3 cycles, ~3 s */
let _audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AudioContext()
    }
    return _audioCtx
  } catch {
    return null
  }
}

/** Call once on first user gesture to unlock the AudioContext */
export function unlockAudio() {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

export function playPoliceSiren() {
  const ctx = getAudioCtx()
  if (!ctx) return

  const resume = () => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const t   = ctx.currentTime
    const dur = 3.0          // total seconds
    const hi  = 960          // Hz — high tone
    const lo  = 770          // Hz — low tone
    const step = 0.45        // seconds per half-cycle

    // Ramp between hi ↔ lo for 3 full cycles
    osc.frequency.setValueAtTime(hi, t)
    for (let i = 0; i < Math.floor(dur / step); i++) {
      osc.frequency.linearRampToValueAtTime(
        i % 2 === 0 ? lo : hi,
        t + (i + 1) * step,
      )
    }

    gain.gain.setValueAtTime(0.35, t)
    gain.gain.setValueAtTime(0.35, t + dur - 0.3)
    gain.gain.linearRampToValueAtTime(0, t + dur)

    osc.start(t)
    osc.stop(t + dur)
    osc.onended = () => { try { osc.disconnect() } catch { /* ignore */ } }
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(resume).catch(() => { /* blocked by browser */ })
  } else {
    resume()
  }
}
