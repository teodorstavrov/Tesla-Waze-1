/**
 * EVMarkers — renders EV station markers onto the Leaflet map via MarkerClusterGroup.
 *
 * Lifecycle design (critical for avoiding flicker and React bugs):
 *
 *   Effect 1 — depends on [map]
 *     Creates the MarkerClusterGroup ONCE per map instance.
 *     Adds it to the map. Cleans up on map change or unmount.
 *     Never runs again unless the map instance itself changes.
 *
 *   Effect 2 — depends on [stations]
 *     Clears and re-adds markers to the EXISTING cluster group.
 *     Never recreates the cluster group — avoids flicker.
 *     Uses cluster.addLayers() (batch) for performance.
 *
 * This two-effect pattern is the correct way to integrate Leaflet plugins
 * with React's rendering lifecycle.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { L } from '@/lib/leaflet'
import 'leaflet.markercluster'
import type { EVStation } from '@/features/ev/types'
import { iconForStation } from '@/features/ev/icons'
import { buildPopupHTML } from '@/features/ev/popups'

interface Props {
  map: LMap | null
  stations: EVStation[]
}

export function EVMarkers({ map, stations }: Props) {
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)

  // ── Effect 1: cluster group lifecycle (runs once per map instance) ─────────
  useEffect(() => {
    if (!map) return

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,         // prevents UI blocking on large datasets
      chunkInterval: 100,
      chunkDelay: 50,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,  // avoids jank on data refresh
      removeOutsideVisibleBounds: true,

      // Custom dark-theme cluster icons
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount()
        const size  = count < 10 ? 36 : count < 50 ? 42 : 48
        const color = count < 10 ? '#3d9df3' : count < 50 ? '#f5a623' : '#e31937'
        return L.divIcon({
          html: `
            <div style="
              width:${size}px;height:${size}px;
              background:${color};
              border:2.5px solid rgba(255,255,255,0.25);
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 2px 12px rgba(0,0,0,0.7);
              font-family:Inter,system-ui,sans-serif;
              font-size:${count < 100 ? 12 : 10}px;
              font-weight:700;color:white;
              letter-spacing:-0.02em;
            ">${count}</div>`,
          className: '',
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      },
    })

    clusterRef.current = cluster
    map.addLayer(cluster)

    return () => {
      map.removeLayer(cluster)
      clusterRef.current = null
    }
  }, [map])

  // ── Effect 2: update markers when stations change ──────────────────────────
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    cluster.clearLayers()
    if (!stations.length) return

    const markers = stations.map((station) => {
      const marker = L.marker(
        [station.position.lat, station.position.lng],
        { icon: iconForStation(station.isTesla) },
      )
      marker.bindPopup(
        buildPopupHTML(station),
        { maxWidth: 300, minWidth: 230, className: 'ev-popup' },
      )
      return marker
    })

    // Batch add — much faster than adding one by one
    cluster.addLayers(markers)
  }, [stations])

  return null
}
