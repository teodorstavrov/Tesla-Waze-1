/**
 * GPS location button — centers the map on the current position and restores follow mode.
 *
 * Two-step strategy:
 * 1. If followStore has a last-known GPS position, recenter immediately (zero latency)
 * 2. Also restore follow mode so HeadingArrow resumes auto-panning
 * 3. If no last-known pos, fall back to navigator.geolocation (coarse first, precise second)
 *
 * Keeps only the latest "you are here" dot (removes previous one).
 */
import { useState, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L } from '@/lib/leaflet'
import { useRouteStore } from '@/features/route/store'
import { followStore } from '@/features/map/followStore'

interface Props { map: LMap | null }

function youAreHereIcon() {
  return L.divIcon({
    html: `<div style="
      width:16px;height:16px;
      background:#3d9df3;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 5px rgba(61,157,243,0.25);
    "></div>`,
    className: '',
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  })
}

export function LocationButton({ map }: Props) {
  const [state,    setState]    = useState<'idle' | 'locating' | 'error'>('idle')
  const [errMsg,   setErrMsg]   = useState('')
  const dotRef    = useRef<Marker | null>(null)
  const setRoute  = useRouteStore((s) => s.setRoute)
  const hasRoute  = useRouteStore((s) => s.route !== null)

  const placeDot = (lat: number, lng: number) => {
    dotRef.current?.remove()
    if (!map) return
    dotRef.current = L.marker([lat, lng], { icon: youAreHereIcon(), interactive: false }).addTo(map)
  }

  const locate = () => {
    if (!map || state === 'locating') return
    // Clear active route before locating
    if (hasRoute) setRoute(null)

    // Restore follow mode — HeadingArrow will resume auto-panning on next GPS tick
    followStore.setFollowing(true)

    // If HeadingArrow already has a last-known position, recenter immediately
    const lastPos = followStore.getLastPos()
    if (lastPos) {
      map.setView([lastPos.lat, lastPos.lng], Math.max(map.getZoom(), 14), { animate: true })
      placeDot(lastPos.lat, lastPos.lng)
      // Still try to refine with geolocation in the background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            const dx = Math.abs(precise.coords.latitude  - lastPos.lat) +
                       Math.abs(precise.coords.longitude - lastPos.lng)
            if (dx > 0.0002) {
              map.setView([precise.coords.latitude, precise.coords.longitude], Math.max(map.getZoom(), 14), { animate: true })
              placeDot(precise.coords.latitude, precise.coords.longitude)
            }
          },
          () => { /* last-known pos is good enough */ },
          { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
        )
      }
      return
    }

    // No last-known position — fall back to full geolocation flow
    if (!navigator.geolocation) {
      setErrMsg('Geolocation unavailable')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
      return
    }

    setState('locating')
    setErrMsg('')

    const pan = (lat: number, lng: number) => {
      map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
      placeDot(lat, lng)
      setState('idle')
    }

    const showError = (code: number) => {
      const msgs: Record<number, string> = {
        1: 'Достъпът до локацията е отказан',
        2: 'Локацията е недостъпна',
        3: 'Изтече времето за търсене',
      }
      setErrMsg(msgs[code] ?? 'Грешка при локация')
      setState('error')
      setTimeout(() => setState('idle'), 3500)
    }

    // Step 1: try any cached position first (Infinity maximumAge) — instant on Tesla
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pan(pos.coords.latitude, pos.coords.longitude)
        // Step 2: refine silently with fresh GPS
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            const dx = Math.abs(precise.coords.latitude  - pos.coords.latitude) +
                       Math.abs(precise.coords.longitude - pos.coords.longitude)
            if (dx > 0.0002) pan(precise.coords.latitude, precise.coords.longitude)
          },
          () => { /* coarse fix is good enough */ },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        )
      },
      // No cached position — try a real fix with longer timeout
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => pan(pos.coords.latitude, pos.coords.longitude),
          (err) => showError(err.code),
          { enableHighAccuracy: false, timeout: 12_000, maximumAge: 0 },
        )
      },
      { enableHighAccuracy: false, timeout: 1_000, maximumAge: Infinity },
    )
  }

  return (
    <div className="absolute left-4 bottom-24 z-[1000]">
      <button
        onClick={locate}
        aria-label="Center on my location"
        title={state === 'error' ? errMsg : 'Моята локация'}
        className="
          w-14 h-14 glass-card flex items-center justify-center
          active:scale-95 active:bg-tesla-muted
          transition-transform duration-100 select-none
        "
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); locate() }}
      >
        {state === 'locating' ? (
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#3a3a3a" strokeWidth="2"/>
            <path d="M10 2 A8 8 0 0 1 18 10" stroke="#3d9df3" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : state === 'error' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#e31937" strokeWidth="1.5"/>
            <path d="M10 6v4.5M10 13v.5" stroke="#e31937" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3.5" fill="#3d9df3"/>
            <circle cx="10" cy="10" r="7" stroke="#3d9df3" strokeWidth="1.5"/>
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="#3d9df3" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Error tooltip */}
      {state === 'error' && errMsg && (
        <div className="absolute left-16 bottom-3 glass-card px-3 py-2 whitespace-nowrap
                        text-[12px] font-medium" style={{ color: '#e31937' }}>
          {errMsg}
        </div>
      )}
    </div>
  )
}
