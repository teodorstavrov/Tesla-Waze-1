/**
 * MapShell — owns the Leaflet map instance lifecycle.
 * Switches tile layer when isDark prop changes (day/night mode).
 * On first load: centers on user's GPS position (falls back to Sofia).
 */
import { useEffect, useRef, useCallback } from 'react'
import type { Map as LMap, TileLayer } from 'leaflet'
import {
  L,
  SOFIA_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  TILES,
  OSM_ATTRIBUTION,
} from '@/lib/leaflet'

interface Props {
  isDark:         boolean
  onMapReady:     (map: LMap) => void
  onBoundsChange?: (map: LMap) => void
}

export function MapShell({ isDark, onMapReady, onBoundsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LMap | null>(null)
  const tileRef      = useRef<TileLayer | null>(null)
  const readyRef     = useRef(false)

  const handleBoundsChange = useCallback(
    (map: LMap) => onBoundsChange?.(map),
    [onBoundsChange],
  )

  // ── Map init (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (readyRef.current || !containerRef.current) return
    readyRef.current = true

    const map = L.map(containerRef.current, {
      center:   SOFIA_CENTER,
      zoom:     DEFAULT_ZOOM,
      minZoom:  MIN_ZOOM,
      maxZoom:  MAX_ZOOM,

      zoomControl:         false,
      attributionControl:  false,
      preferCanvas:        true,
      closePopupOnClick:   true,
      bounceAtZoomLimits:  false,
      fadeAnimation:       false,
      markerZoomAnimation: true,
      zoomAnimation:       true,
      inertia:             true,
      inertiaDeceleration: 2000,
      worldCopyJump:       false,
    })

    const tile = L.tileLayer(isDark ? TILES.dark : TILES.light, {
      attribution:  OSM_ATTRIBUTION,
      maxZoom:      MAX_ZOOM,
      detectRetina: true,
      keepBuffer:   2,
    }).addTo(map)

    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map)

    mapRef.current  = map
    tileRef.current = tile

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM, { animate: false })
        onMapReady(map)
      },
      () => onMapReady(map),
      { timeout: 5_000, maximumAge: 60_000, enableHighAccuracy: false },
    )

    map.on('moveend zoomend', () => handleBoundsChange(map))

    return () => {
      mapRef.current?.off()
      mapRef.current?.remove()
      mapRef.current  = null
      tileRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Tile swap on theme change ──────────────────────────────────────────────
  useEffect(() => {
    const map  = mapRef.current
    const tile = tileRef.current
    if (!map || !tile) return

    tile.setUrl(isDark ? TILES.dark : TILES.light)
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      aria-label="EV charging map"
      style={{ touchAction: 'none' }}
    />
  )
}
