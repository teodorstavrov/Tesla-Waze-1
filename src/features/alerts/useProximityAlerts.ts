/**
 * Watches GPS position and fires:
 *  - Voice alerts when within the configured threshold for each event type
 *  - onPolice callback (siren flash) when within 800m of a police marker
 *  - onNearEvent callback when within 5m of ANY event (confirmation prompt)
 *
 * Performance optimisations:
 *  - GPS callbacks throttled to at most once per 3 s
 *  - Skips processing if position moved less than MIN_MOVE_M (30 m)
 *  - Bbox pre-filter narrows candidates to 2 km radius before haversine
 *  - Zone-crossing tracking (outside→inside) prevents repeat fires
 */
import { useEffect, useRef } from 'react'
import { useEventStore }     from '@/features/events/store'
import { haversine }         from '@/lib/haversine'
import { ALERT_DISTANCES, ALERT_LABELS_BG, COOLDOWN_MS, POLICE_SIREN_DISTANCE_M, POLICE_CLOSE_DISTANCE_M } from './config'
import type { EventType }    from '@/features/events/types'
import type { ReportedEvent } from '@/features/events/types'

const CONFIRM_DISTANCE_M  = 5
const CONFIRM_COOLDOWN_MS = 60_000

/** Minimum movement (metres) before re-processing alerts */
const MIN_MOVE_M = 30
/** Max alert distance — used for bbox pre-filter radius */
const MAX_ALERT_M = Math.max(...Object.values(ALERT_DISTANCES), POLICE_SIREN_DISTANCE_M)
/** Throttle: minimum ms between full alert passes */
const THROTTLE_MS = 3_000

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

  const alertedRef   = useRef<Map<string, number>>(new Map())
  const sirenedRef   = useRef<Map<string, number>>(new Map())
  const confirmedRef = useRef<Map<string, number>>(new Map())
  const insideRef    = useRef<Map<string, boolean>>(new Map())

  // Throttle / skip-small-move state
  const lastPosRef      = useRef<{ lat: number; lng: number } | null>(null)
  const lastProcessedRef = useRef<number>(0)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        const now = Date.now()

        // ── Throttle: skip if processed too recently ────────────────────────
        if (now - lastProcessedRef.current < THROTTLE_MS) return

        // ── Skip small moves ────────────────────────────────────────────────
        if (lastPosRef.current) {
          const moved = haversine(lat, lng, lastPosRef.current.lat, lastPosRef.current.lng)
          if (moved < MIN_MOVE_M) return
        }

        lastPosRef.current      = { lat, lng }
        lastProcessedRef.current = now

        // ── Bbox pre-filter: ~2 km box before expensive haversine ───────────
        const latDeg = MAX_ALERT_M / 111_320
        const lngDeg = MAX_ALERT_M / (111_320 * Math.cos(lat * (Math.PI / 180)))
        const candidates = eventsRef.current.filter(
          (ev) =>
            ev.lat >= lat - latDeg && ev.lat <= lat + latDeg &&
            ev.lng >= lng - lngDeg && ev.lng <= lng + lngDeg,
        )

        for (const ev of candidates) {
          const dist = haversine(lat, lng, ev.lat, ev.lng)

          // ── Police siren + flash + voice at 800 m ─────────────────────
          if (ev.type === 'police') {
            const sirenKey  = `${ev.id}:siren`
            const wasInside = insideRef.current.get(sirenKey) ?? false
            const nowInside = dist <= POLICE_SIREN_DISTANCE_M
            insideRef.current.set(sirenKey, nowInside)

            if (nowInside && !wasInside) {
              const last = sirenedRef.current.get(ev.id) ?? 0
              if (now - last >= COOLDOWN_MS) {
                sirenedRef.current.set(ev.id, now)
                // Mark voice alerted too so the generic voice block below doesn't double-fire
                alertedRef.current.set(ev.id, now)
                insideRef.current.set(`${ev.id}:voice`, true)
                playPoliceSiren()
                onPoliceRef.current?.()
                speak('police')
              }
            }
          }

          // ── Police close alert at 300 m ────────────────────────────────
          if (ev.type === 'police') {
            const closeKey   = `${ev.id}:close`
            const wasInClose = insideRef.current.get(closeKey) ?? false
            const nowInClose = dist <= POLICE_CLOSE_DISTANCE_M
            insideRef.current.set(closeKey, nowInClose)

            if (nowInClose && !wasInClose) {
              const last = alertedRef.current.get(`${ev.id}:close`) ?? 0
              if (now - last >= COOLDOWN_MS) {
                alertedRef.current.set(`${ev.id}:close`, now)
                playPoliceSiren()
                onPoliceRef.current?.()
                speak('police')
              }
            }
          }

          // ── Voice alert ────────────────────────────────────────────────
          const threshold  = ALERT_DISTANCES[ev.type]
          const voiceKey   = `${ev.id}:voice`
          const wasInVoice = insideRef.current.get(voiceKey) ?? false
          const nowInVoice = dist <= threshold
          insideRef.current.set(voiceKey, nowInVoice)

          if (nowInVoice && !wasInVoice) {
            const last = alertedRef.current.get(ev.id) ?? 0
            if (now - last >= COOLDOWN_MS) {
              alertedRef.current.set(ev.id, now)
              speak(ev.type)
            }
          }

          // ── 5 m confirmation prompt ────────────────────────────────────
          const confirmKey   = `${ev.id}:confirm`
          const wasInConfirm = insideRef.current.get(confirmKey) ?? false
          const nowInConfirm = dist <= CONFIRM_DISTANCE_M
          insideRef.current.set(confirmKey, nowInConfirm)

          if (nowInConfirm && !wasInConfirm) {
            const last = confirmedRef.current.get(ev.id) ?? 0
            if (now - last >= CONFIRM_COOLDOWN_MS) {
              confirmedRef.current.set(ev.id, now)
              onNearEventRef.current?.(ev)
            }
          }
        }
      },
      null,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5_000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
}

function speak(type: EventType) {
  if (!window.speechSynthesis) return
  const text = ALERT_LABELS_BG[type]

  const doSpeak = (voices: SpeechSynthesisVoice[]) => {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate   = 1.0
    utt.volume = 1.0
    const bg = voices.find((v) => v.lang && v.lang.startsWith('bg'))
    if (bg) {
      utt.voice = bg
    } else {
      utt.lang = 'bg-BG'  // hint to browser; may or may not be honoured
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utt)
  }

  // Delay so siren audio doesn't collide with speech init
  setTimeout(() => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(voices)
    } else {
      // Voices not loaded yet — wait for the event (async in Chrome/Chromium)
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => doSpeak(window.speechSynthesis.getVoices()),
        { once: true },
      )
    }
  }, 600)
}

let _audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as Record<string, unknown>)['webkitAudioContext'] as typeof AudioContext | undefined
    if (!AC) return null
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AC()
    }
    return _audioCtx
  } catch {
    return null
  }
}

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

    const t    = ctx.currentTime
    const dur  = 2.0
    const hi   = 960
    const lo   = 770
    const step = 0.45

    osc.frequency.setValueAtTime(hi, t)
    for (let i = 0; i < Math.floor(dur / step); i++) {
      osc.frequency.linearRampToValueAtTime(i % 2 === 0 ? lo : hi, t + (i + 1) * step)
    }

    gain.gain.setValueAtTime(0.35, t)
    gain.gain.setValueAtTime(0.35, t + dur - 0.3)
    gain.gain.linearRampToValueAtTime(0, t + dur)

    osc.start(t)
    osc.stop(t + dur)
    osc.onended = () => { try { osc.disconnect() } catch { /* ignore */ } }
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(resume).catch(() => {})
  } else {
    resume()
  }
}
