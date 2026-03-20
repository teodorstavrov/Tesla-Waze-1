/**
 * EVMarkers — renders EV station markers onto the Leaflet map via MarkerClusterGroup.
 *
 * Performance: uses incremental diff — only adds/removes markers that changed,
 * never clears the whole layer. When a route is active, stations within 500m
 * are moved to a separate non-clustered highlight layer.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, LayerGroup, Marker } from 'leaflet'
import { L }                from '@/lib/leaflet'
import 'leaflet.markercluster'
import type { EVStation }   from '@/features/ev/types'
import { iconForStation }   from '@/features/ev/icons'
import { buildPopupHTML }   from '@/features/ev/popups'
import { isNearRoute }      from '@/features/route/utils/distanceToRoute'
import type { Route }       from '@/features/route/types'

interface Props {
  map:      LMap | null
  stations: EVStation[]
  route:    Route | null
}

function highlightIcon(isTesla: boolean) {
  const colour = isTesla ? '#e31937' : '#3d9df3'
  return L.divIcon({
    html: `
      <div style="
        width:20px;height:20px;border-radius:50%;
        background:${colour};border:3px solid white;
        box-shadow:0 0 0 3px ${colour},0 3px 10px rgba(0,0,0,0.6);
      "></div>`,
    className:  '',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  })
}

export function EVMarkers({ map, stations, route }: Props) {
  const clusterRef    = useRef<L.MarkerClusterGroup | null>(null)
  const routeLayerRef = useRef<LayerGroup | null>(null)

  // markerMap: stationId → { marker, inRoute, fingerprint }
  // fingerprint captures the fields that affect popup/icon; skip update when unchanged
  const markerMapRef  = useRef<Map<string, { marker: Marker; inRoute: boolean; fp: string }>>(new Map())

  // ── Effect 1: cluster group lifecycle ─────────────────────────────────────
  useEffect(() => {
    if (!map) return

    const cluster = L.markerClusterGroup({
      chunkedLoading:             true,
      chunkInterval:              100,
      chunkDelay:                 50,
      maxClusterRadius:           55,
      spiderfyOnMaxZoom:          true,
      showCoverageOnHover:        false,
      zoomToBoundsOnClick:        true,
      animate:                    true,
      animateAddingMarkers:       false,
      removeOutsideVisibleBounds: true,

      iconCreateFunction(c) {
        const count = c.getChildCount()
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
          className:  '',
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      },
    })

    const routeLayer = L.layerGroup().addTo(map)

    clusterRef.current    = cluster
    routeLayerRef.current = routeLayer
    markerMapRef.current = new Map()
    map.addLayer(cluster)

    return () => {
      map.removeLayer(cluster)
      routeLayer.remove()
      clusterRef.current    = null
      routeLayerRef.current = null
      markerMapRef.current  = new Map()
    }
  }, [map])

  // ── Effect 2: incremental diff when stations or route changes ──────────────
  useEffect(() => {
    const cluster    = clusterRef.current
    const routeLayer = routeLayerRef.current
    const markerMap  = markerMapRef.current
    if (!cluster || !routeLayer) return

    // Fingerprint: fields that affect icon or popup content
    const fingerprint = (s: EVStation, inRoute: boolean) =>
      `${s.isTesla}|${s.availablePorts}|${s.totalPorts}|${inRoute}`

    // Build new desired state
    const desired = new Map<string, { station: EVStation; inRoute: boolean }>()
    for (const s of stations) {
      const inRoute = !!route && isNearRoute(s.position.lat, s.position.lng, route.coordinates)
      desired.set(s.id, { station: s, inRoute })
    }

    let added = 0, removed = 0, moved = 0, skipped = 0

    // Remove markers no longer in the new set
    for (const [id, { marker, inRoute }] of markerMap) {
      if (!desired.has(id)) {
        if (inRoute) routeLayer.removeLayer(marker)
        else         cluster.removeLayer(marker)
        markerMap.delete(id)
        removed++
      }
    }

    // Add new markers / move between layers / update popup if content changed
    const toAddCluster:    Marker[] = []
    const toAddRouteLayer: Marker[] = []

    for (const [id, { station, inRoute }] of desired) {
      const existing = markerMap.get(id)
      const newFp    = fingerprint(station, inRoute)

      if (existing) {
        if (existing.fp === newFp) {
          skipped++
          continue    // nothing changed — skip entirely
        }

        // Layer changed (route toggle)
        if (existing.inRoute !== inRoute) {
          if (existing.inRoute) {
            routeLayer.removeLayer(existing.marker)
            existing.marker.setIcon(iconForStation(station.isTesla))
            existing.marker.options.zIndexOffset = 0
            toAddCluster.push(existing.marker)
          } else {
            cluster.removeLayer(existing.marker)
            existing.marker.setIcon(highlightIcon(station.isTesla))
            existing.marker.options.zIndexOffset = 800
            toAddRouteLayer.push(existing.marker)
          }
          moved++
        }

        // Refresh popup if availability changed
        existing.marker.setPopupContent(buildPopupHTML(station))
        markerMap.set(id, { marker: existing.marker, inRoute, fp: newFp })
      } else {
        // Brand-new marker
        const icon = inRoute ? highlightIcon(station.isTesla) : iconForStation(station.isTesla)
        const m = L.marker(
          [station.position.lat, station.position.lng],
          { icon, zIndexOffset: inRoute ? 800 : 0 },
        )
        m.bindPopup(buildPopupHTML(station), { maxWidth: 300, minWidth: 230, className: 'ev-popup' })
        markerMap.set(id, { marker: m, inRoute, fp: newFp })
        if (inRoute) toAddRouteLayer.push(m)
        else         toAddCluster.push(m)
        added++
      }
    }

    if (toAddCluster.length)    cluster.addLayers(toAddCluster)
    for (const m of toAddRouteLayer) routeLayer.addLayer(m)

    console.log('[EVMarkers] diff', { total: stations.length, added, removed, moved, skipped })

  }, [stations, route])

  return null
}
