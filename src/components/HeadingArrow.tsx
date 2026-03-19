/**
 * HeadingArrow — live GPS position + direction-of-travel arrow on the map.
 *
 * Uses watchPosition for continuous updates. The arrow SVG rotates to match
 * the device's heading (compass bearing). When heading is unavailable (parked,
 * low-speed) it shows a plain circle instead.
 *
 * Tesla has GPS + compass so heading should be available while driving.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L } from '@/lib/leaflet'

interface Props {
  map: LMap | null
}

function arrowIcon(heading: number | null) {
  if (heading === null) {
    // Stationary — pulsing blue dot
    return L.divIcon({
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#3d9df3;border:3px solid white;
        box-shadow:0 0 0 4px rgba(61,157,243,0.25);
      "></div>`,
      className:  '',
      iconSize:   [18, 18],
      iconAnchor: [9, 9],
    })
  }

  // Directional arrow — rotated to heading
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;
      display:flex;align-items:center;justify-content:center;
      transform:rotate(${heading}deg);
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <!-- Accuracy halo -->
        <circle cx="14" cy="14" r="12" fill="rgba(61,157,243,0.15)" />
        <!-- Arrow body -->
        <path d="M14 4 L20 22 L14 18 L8 22 Z"
              fill="#3d9df3" stroke="white" stroke-width="1.5"
              stroke-linejoin="round"/>
        <!-- Center dot -->
        <circle cx="14" cy="14" r="2.5" fill="white"/>
      </svg>
    </div>`,
    className:  '',
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  })
}

export function HeadingArrow({ map }: Props) {
  const markerRef = useRef<Marker | null>(null)
  const watchRef  = useRef<number | null>(null)

  useEffect(() => {
    if (!map || !navigator.geolocation) return

    const updateMarker = (lat: number, lng: number, heading: number | null) => {
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], {
          icon:         arrowIcon(heading),
          interactive:  false,
          zIndexOffset: 1200,
        }).addTo(map)
      } else {
        markerRef.current.setLatLng([lat, lng])
        markerRef.current.setIcon(arrowIcon(heading))
      }
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords
        // heading is null when speed < ~1 m/s or device has no compass
        updateMarker(latitude, longitude, heading)
      },
      () => { /* ignore errors — marker stays at last known position */ },
      {
        enableHighAccuracy: true,
        maximumAge:         2_000,
        timeout:            10_000,
      },
    )

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map])

  return null
}
