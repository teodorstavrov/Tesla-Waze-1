/**
 * GPS location button — centers the map on the current position.
 *
 * Two-step strategy:
 * 1. Fast coarse fix (cell/WiFi, ~1s) → pan immediately
 * 2. Precise GPS fix (background, up to 8s) → refine position
 *
 * Keeps only the latest "you are here" dot (removes previous one).
 */
import { useState, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L } from '@/lib/leaflet'

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
  const dotRef = useRef<Marker | null>(null)

  const placeDot = (lat: number, lng: number) => {
    dotRef.current?.remove()
    if (!map) return
    dotRef.current = L.marker([lat, lng], { icon: youAreHereIcon(), interactive: false }).addTo(map)
  }

  const locate = () => {
    if (!map || state === 'locating') return

    if (!navigator.geolocation) {
      setErrMsg('Geolocation unavailable')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
      return
    }

    setState('locating')
    setErrMsg('')

    const onError = (err: GeolocationPositionError) => {
      const msgs: Record<number, string> = {
        1: 'Достъпът до локацията е отказан',
        2: 'Локацията е недостъпна',
        3: 'Изтече времето за търсене',
      }
      setErrMsg(msgs[err.code] ?? 'Грешка при локация')
      setState('error')
      setTimeout(() => setState('idle'), 3500)
    }

    // Step 1: fast coarse fix (network/WiFi) — pans immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
        placeDot(lat, lng)
        setState('idle')

        // Step 2: refine with GPS in the background (no UI change)
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            const { latitude: pLat, longitude: pLng } = precise.coords
            // Only update if meaningfully different (>20m)
            const dx = Math.abs(pLat - lat) + Math.abs(pLng - lng)
            if (dx > 0.0002) {
              map.panTo([pLat, pLng], { animate: true })
              placeDot(pLat, pLng)
            }
          },
          () => { /* silent — coarse fix is good enough */ },
          { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
        )
      },
      onError,
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 30_000 },
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
        onTouchEnd={(e) => e.stopPropagation()}
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
