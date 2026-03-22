/**
 * HeadingArrow — live GPS position + direction-of-travel arrow.
 *
 * - Larger arrow (64px) with pulsing ring animation
 * - Follow mode: map auto-pans to keep the arrow centered while driving.
 *   Pauses when the user manually pans (dragstart); resumes via LocationButton
 *   calling followStore.setFollowing(true).
 *
 * followStore is module-level (not React state) so no re-renders are caused.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L } from '@/lib/leaflet'
import { followStore } from '@/features/map/followStore'

interface Props {
  map: LMap | null
}

function arrowIcon(heading: number | null) {
  if (heading === null) {
    // Stationary — pulsing dot
    return L.divIcon({
      html: `
        <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
          <div class="gps-pulse-ring"></div>
          <div style="
            width:28px;height:28px;border-radius:50%;
            background:#3d9df3;border:4px solid white;
            box-shadow:0 3px 12px rgba(0,0,0,0.6);
            position:relative;z-index:1;
          "></div>
        </div>`,
      className:  '',
      iconSize:   [52, 52],
      iconAnchor: [26, 26],
    })
  }

  return L.divIcon({
    html: `
      <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
        <div class="gps-pulse-ring" style="inset:-6px;border-radius:50%;"></div>
        <div style="
          width:64px;height:64px;
          display:flex;align-items:center;justify-content:center;
          transform:rotate(${heading}deg);
          position:relative;z-index:1;
        ">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <!-- soft halo -->
            <circle cx="32" cy="32" r="28" fill="rgba(61,157,243,0.15)"/>
            <!-- arrow body -->
            <path d="M32 7 L45 52 L32 41 L19 52 Z"
                  fill="#3d9df3" stroke="white" stroke-width="2.5"
                  stroke-linejoin="round"/>
            <!-- center dot -->
            <circle cx="32" cy="32" r="5.5" fill="white"/>
          </svg>
        </div>
      </div>`,
    className:  '',
    iconSize:   [64, 64],
    iconAnchor: [32, 32],
  })
}

export function HeadingArrow({ map }: Props) {
  const markerRef = useRef<Marker | null>(null)
  const watchRef  = useRef<number | null>(null)

  useEffect(() => {
    if (!map || !navigator.geolocation) return

    // Pause follow when user manually drags the map.
    // Leaflet only fires 'dragstart' from real user touch/mouse drags,
    // NOT from programmatic setView() calls — so this is safe.
    const onDragStart = () => {
      followStore.setFollowing(false)
    }
    map.on('dragstart', onDragStart)

    const updateMarker = (lat: number, lng: number, heading: number | null) => {
      // Always store the latest GPS position so LocationButton can recenter
      followStore.setLastPos(lat, lng)

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

      // Only recenter the map if follow mode is active
      if (followStore.isFollowing()) {
        map.setView([lat, lng], map.getZoom(), { animate: true, duration: 0.5 })
      }
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords
        updateMarker(latitude, longitude, heading)
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
