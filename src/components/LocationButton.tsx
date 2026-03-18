/**
 * GPS location button — centers the map on the car's current position.
 *
 * Tesla has GPS so navigator.geolocation works reliably.
 * Placed left of zoom controls so it's reachable with right thumb.
 */
import { useState } from 'react'
import type { Map as LMap } from 'leaflet'
import { L } from '@/lib/leaflet'

interface Props {
  map: LMap | null
}

export function LocationButton({ map }: Props) {
  const [state, setState] = useState<'idle' | 'locating' | 'error'>('idle')

  const locate = () => {
    if (!map || state === 'locating') return

    if (!navigator.geolocation) {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
      return
    }

    setState('locating')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        map.setView([latitude, longitude], 14, { animate: true })

        // Drop a subtle "you are here" marker (removed on next locate)
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:#3d9df3;
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 0 0 4px rgba(61,157,243,0.3);
          "></div>`,
          className: '',
          iconSize:   [16, 16],
          iconAnchor: [8, 8],
        })
        L.marker([latitude, longitude], { icon, interactive: false }).addTo(map)

        setState('idle')
      },
      () => {
        setState('error')
        setTimeout(() => setState('idle'), 3000)
      },
      { timeout: 10_000, enableHighAccuracy: true, maximumAge: 30_000 },
    )
  }

  return (
    <div className="absolute left-4 bottom-24 z-[1000]">
      <button
        onClick={locate}
        aria-label="Center on my location"
        className="
          w-14 h-14 glass-card flex items-center justify-center
          active:scale-95 active:bg-tesla-muted
          transition-transform duration-100 select-none
        "
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {state === 'locating' ? (
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#3a3a3a" strokeWidth="2" />
            <path d="M10 2 A8 8 0 0 1 18 10" stroke="#3d9df3" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : state === 'error' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#e31937" strokeWidth="1.5" />
            <path d="M10 6v4.5M10 13v.5" stroke="#e31937" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3.5" fill="#3d9df3" />
            <circle cx="10" cy="10" r="7" stroke="#3d9df3" strokeWidth="1.5" />
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="#3d9df3" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
