/**
 * MapShell — owns the Leaflet map instance lifecycle.
 * Tesla browser optimisations applied here (canvas renderer, touch tap, no bounce).
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

    const map = L.map(containerRef.current, {
      center:    SOFIA_CENTER,
      zoom:      DEFAULT_ZOOM,
      minZoom:   MIN_ZOOM,
      maxZoom:   MAX_ZOOM,

      // ── Tesla browser optimisations ──────────────────────────────
      zoomControl:          false,   // custom controls below
      attributionControl:   false,
      preferCanvas:         true,    // Canvas > SVG on low-power SoC
      bounceAtZoomLimits:   false,   // no bounce animation (saves CPU)
      fadeAnimation:        false,   // no tile fade (saves paint cycles)
      markerZoomAnimation:  true,
      zoomAnimation:        true,
      inertia:              true,    // smooth pan feel
      inertiaDeceleration:  2000,
      worldCopyJump:        false,
    })

    // Dark OSM tiles — retina for Tesla's HiDPI screen
    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom:      MAX_ZOOM,
      detectRetina: true,
      keepBuffer:   2,              // pre-load 2 tile rows around viewport
    }).addTo(map)

    // Minimal attribution — bottom-right, dark-themed via CSS
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map)

    mapRef.current = map
    onMapReady(map)

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
      // Prevent browser default touch actions interfering with map pan
      style={{ touchAction: 'none' }}
    />
  )
}
