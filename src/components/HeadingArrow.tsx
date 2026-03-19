/**
 * HeadingArrow — live GPS position + direction-of-travel arrow.
 *
 * - Larger arrow (40px) with pulsing ring animation
 * - Follow mode: map auto-pans to keep the arrow centered while driving
 *   (speed > 1 m/s). Pauses when the user manually pans; resumes on movement.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L } from '@/lib/leaflet'

interface Props {
  map: LMap | null
}

const FOLLOW_SPEED_MS = 1.0   // m/s — start following above this speed

function arrowIcon(heading: number | null) {
  if (heading === null) {
    // Stationary — pulsing dot
    return L.divIcon({
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div class="gps-pulse-ring"></div>
          <div style="
            width:20px;height:20px;border-radius:50%;
            background:#3d9df3;border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            position:relative;z-index:1;
          "></div>
        </div>`,
      className:  '',
      iconSize:   [36, 36],
      iconAnchor: [18, 18],
    })
  }

  return L.divIcon({
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div class="gps-pulse-ring" style="inset:-6px;border-radius:50%;"></div>
        <div style="
          width:48px;height:48px;
          display:flex;align-items:center;justify-content:center;
          transform:rotate(${heading}deg);
          position:relative;z-index:1;
        ">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <!-- soft halo -->
            <circle cx="24" cy="24" r="20" fill="rgba(61,157,243,0.12)"/>
            <!-- arrow -->
            <path d="M24 6 L34 38 L24 30 L14 38 Z"
                  fill="#3d9df3" stroke="white" stroke-width="2"
                  stroke-linejoin="round"/>
            <!-- center dot -->
            <circle cx="24" cy="24" r="4" fill="white"/>
          </svg>
        </div>
      </div>`,
    className:  '',
    iconSize:   [48, 48],
    iconAnchor: [24, 24],
  })
}

export function HeadingArrow({ map }: Props) {
  const markerRef    = useRef<Marker | null>(null)
  const watchRef     = useRef<number | null>(null)
  const followRef    = useRef(true)   // true = follow user
  const dragRef      = useRef(false)  // true = user is dragging

  useEffect(() => {
    if (!map || !navigator.geolocation) return

    // Pause follow when user manually drags the map
    const onDragStart = () => { dragRef.current = true; followRef.current = false }
    map.on('dragstart', onDragStart)

    const updateMarker = (lat: number, lng: number, heading: number | null, speed: number | null) => {
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

      // Re-enable follow when we start moving again after a manual pan
      if (speed !== null && speed >= FOLLOW_SPEED_MS) {
        followRef.current = true
        dragRef.current   = false
      }

      if (followRef.current) {
        map.setView([lat, lng], map.getZoom(), { animate: true, duration: 0.5 })
      }
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords
        updateMarker(latitude, longitude, heading, speed)
      },
      () => { /* ignore errors */ },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 10_000 },
    )

    return () => {
      map.off('dragstart', onDragStart)
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map])

  return null
}
