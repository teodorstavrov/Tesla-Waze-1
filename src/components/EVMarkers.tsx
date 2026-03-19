/**
 * EVMarkers — renders EV station markers onto the Leaflet map via MarkerClusterGroup.
 *
 * When a route is active, stations within 500m of the route are rendered
 * in a separate non-clustered layer so they stay visible and highlighted.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, LayerGroup } from 'leaflet'
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
  const clusterRef   = useRef<L.MarkerClusterGroup | null>(null)
  const routeLayerRef = useRef<LayerGroup | null>(null)

  // ── Effect 1: cluster group lifecycle ─────────────────────────────────────
  useEffect(() => {
    if (!map) return

    const cluster = L.markerClusterGroup({
      chunkedLoading:          true,
      chunkInterval:           100,
      chunkDelay:              50,
      maxClusterRadius:        55,
      spiderfyOnMaxZoom:       true,
      showCoverageOnHover:     false,
      zoomToBoundsOnClick:     true,
      animate:                 true,
      animateAddingMarkers:    false,
      removeOutsideVisibleBounds: true,

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
          className:  '',
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      },
    })

    const routeLayer = L.layerGroup().addTo(map)

    clusterRef.current    = cluster
    routeLayerRef.current = routeLayer
    map.addLayer(cluster)

    return () => {
      map.removeLayer(cluster)
      routeLayer.remove()
      clusterRef.current    = null
      routeLayerRef.current = null
    }
  }, [map])

  // ── Effect 2: update markers when stations or route changes ───────────────
  useEffect(() => {
    const cluster    = clusterRef.current
    const routeLayer = routeLayerRef.current
    if (!cluster || !routeLayer) return

    cluster.clearLayers()
    routeLayer.clearLayers()
    if (!stations.length) return

    const routeStations: EVStation[] = []
    const regularStations: EVStation[] = []

    if (route) {
      for (const s of stations) {
        if (isNearRoute(s.position.lat, s.position.lng, route.coordinates)) {
          routeStations.push(s)
        } else {
          regularStations.push(s)
        }
      }
    } else {
      regularStations.push(...stations)
    }

    // Regular stations → cluster
    const markers = regularStations.map((station) => {
      const m = L.marker(
        [station.position.lat, station.position.lng],
        { icon: iconForStation(station.isTesla) },
      )
      m.bindPopup(buildPopupHTML(station), { maxWidth: 300, minWidth: 230, className: 'ev-popup' })
      return m
    })
    cluster.addLayers(markers)

    // Route stations → highlighted layer (not clustered, always visible)
    for (const station of routeStations) {
      const m = L.marker(
        [station.position.lat, station.position.lng],
        { icon: highlightIcon(station.isTesla), zIndexOffset: 800 },
      )
      m.bindPopup(buildPopupHTML(station), { maxWidth: 300, minWidth: 230, className: 'ev-popup' })
      routeLayer.addLayer(m)
    }
  }, [stations, route])

  return null
}
