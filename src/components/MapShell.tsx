/**
 * MapShell — owns the Leaflet map instance lifecycle.
 * On first load: centers on user's GPS position (falls back to Sofia).
 * Tesla browser optimisations: canvas renderer, no bounce, no fade.
 */
import { useEffect, useRef, useCallback } from 'react'
import {
  L,
  SOFIA_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from '@/lib/leaflet'
import type { Map as LMap } from 'leaflet'

interface Props {
  onMapReady: (map: LMap) => void
  onBoundsChange?: (map: LMap) => void
}

export function MapShell({ onMapReady, onBoundsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LMap | null>(null)
  const readyRef     = useRef(false)

  const handleBoundsChange = useCallback(
    (map: LMap) => onBoundsChange?.(map),
    [onBoundsChange],
  )

  useEffect(() => {
    if (readyRef.current || !containerRef.current) return
    readyRef.current = true

    // Start with Sofia, then immediately try to get real location
    const map = L.map(containerRef.current, {
      center:   SOFIA_CENTER,
      zoom:     DEFAULT_ZOOM,
      minZoom:  MIN_ZOOM,
      maxZoom:  MAX_ZOOM,

      zoomControl:         false,
      attributionControl:  false,
      preferCanvas:        true,
      bounceAtZoomLimits:  false,
      fadeAnimation:       false,
      markerZoomAnimation: true,
      zoomAnimation:       true,
      inertia:             true,
      inertiaDeceleration: 2000,
      worldCopyJump:       false,
    })

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom:     MAX_ZOOM,
      detectRetina: true,
      keepBuffer:  2,
    }).addTo(map)

    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map)

    mapRef.current = map

    // Try geolocation before firing onMapReady so the first station
    // fetch already uses the correct viewport
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM, { animate: false })
          onMapReady(map)
        },
        () => {
          // Permission denied or timeout — use Sofia
          onMapReady(map)
        },
        { timeout: 5_000, maximumAge: 60_000, enableHighAccuracy: false },
      )
    } else {
      onMapReady(map)
    }

    map.on('moveend zoomend', () => handleBoundsChange(map))

    return () => {
      if (mapRef.current) {
        mapRef.current.off()
        mapRef.current.remove()
        mapRef.current = null
        readyRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      aria-label="EV charging map"
      style={{ touchAction: 'none' }}
    />
  )
}
