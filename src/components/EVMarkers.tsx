/**
 * EVMarkers — renders EV station markers onto the Leaflet map via MarkerClusterGroup.
 *
 * Performance architecture:
 * - PERSISTENT MARKER REGISTRY: markers are created once and reused — never wiped.
 * - Diff by stationId: add new, remove truly gone, update changed fingerprint.
 * - Fingerprint = `${isTesla}|${availablePorts}|${totalPorts}|${inRoute}` — popup
 *   and icon are only rebuilt when something actually changed.
 * - cluster.clearLayers() is ONLY called when showOnMap is toggled off, never on
 *   normal data updates — prevents blank intermediate states.
 * - New markers are added via requestIdleCallback in 60-per-chunk passes.
 * - Stale marker removal is synchronous (fast, typically a small set).
 */
import { useEffect, useRef }          from 'react'
import type { Map as LMap, LayerGroup, Marker } from 'leaflet'
import { L }                          from '@/lib/leaflet'
import 'leaflet.markercluster'
import type { EVStation }             from '@/features/ev/types'
import { iconForStation }             from '@/features/ev/icons'
import { buildPopupHTML }             from '@/features/ev/popups'
import { buildRouteMeta, isNearRouteMeta } from '@/features/route/utils/distanceToRoute'
import type { RouteMeta }             from '@/features/route/utils/distanceToRoute'
import type { Route }                 from '@/features/route/types'
import { useEVStore }                 from '@/features/ev/store'

interface Props {
  map:      LMap | null
  stations: EVStation[]
  route:    Route | null
}

interface MarkerEntry {
  marker:  Marker
  fp:      string
  inRoute: boolean
}

function highlightIcon(isTesla: boolean) {
  const colour = isTesla ? '#e31937' : '#3d9df3'
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;
      background:${colour};border:3px solid white;
      box-shadow:0 0 0 3px ${colour},0 3px 10px rgba(0,0,0,0.6);"></div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

const ric: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number =
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0)

const cancelRic: (id: number) => void =
  typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : clearTimeout

export function EVMarkers({ map, stations, route }: Props) {
  const showOnMap     = useEVStore((s) => s.showStationsOnMap)
  const clusterRef    = useRef<L.MarkerClusterGroup | null>(null)
  const routeLayerRef = useRef<LayerGroup | null>(null)

  // Persistent marker registry — keyed by station id, never recreated wholesale
  const markerMapRef  = useRef<Map<string, MarkerEntry>>(new Map())

  // Pre-computed route metadata — rebuilt once per route change
  const routeMetaRef  = useRef<RouteMeta | null>(null)
  // Cancel any in-progress async diff pass
  const ricIdRef      = useRef<number>(0)

  // ── Route meta: rebuild only when route identity changes ──────────────────
  useEffect(() => {
    routeMetaRef.current = route ? buildRouteMeta(route.coordinates) : null
  }, [route])

  // ── Effect 1: cluster group lifecycle (created once per map mount) ─────────
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
          html: `<div style="width:${size}px;height:${size}px;background:${color};
            border:2.5px solid rgba(255,255,255,0.25);border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 12px rgba(0,0,0,0.7);
            font-family:Inter,system-ui,sans-serif;
            font-size:${count < 100 ? 12 : 10}px;font-weight:700;color:white;
            letter-spacing:-0.02em;">${count}</div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        })
      },
    })

    const routeLayer = L.layerGroup().addTo(map)
    clusterRef.current    = cluster
    routeLayerRef.current = routeLayer
    // DO NOT reset markerMapRef here — we might be remounting on the same data
    map.addLayer(cluster)

    return () => {
      cancelRic(ricIdRef.current)
      map.removeLayer(cluster)
      routeLayer.remove()
      clusterRef.current    = null
      routeLayerRef.current = null
      // Clear marker registry on unmount only
      markerMapRef.current  = new Map()
    }
  }, [map])

  // ── Effect 2: async chunked diff when stations or route changes ────────────
  useEffect(() => {
    const cluster    = clusterRef.current
    const routeLayer = routeLayerRef.current
    const markerMap  = markerMapRef.current
    if (!cluster || !routeLayer) return

    // If visibility is toggled OFF — clear everything (intentional blank state)
    if (!showOnMap) {
      cancelRic(ricIdRef.current)
      cluster.clearLayers()
      routeLayer.clearLayers()
      markerMap.clear()
      return
    }

    // Cancel any previous pending diff pass
    cancelRic(ricIdRef.current)

    const meta = routeMetaRef.current
    const fingerprint = (s: EVStation, inRoute: boolean): string =>
      `${s.isTesla}|${s.availablePorts}|${s.totalPorts}|${inRoute}`

    // Step 1: remove stale markers — synchronous (fast, small set)
    let removed = 0
    const stationIds = new Set(stations.map((s) => s.id))
    for (const [id, { marker, inRoute }] of markerMap) {
      if (!stationIds.has(id)) {
        if (inRoute) routeLayer.removeLayer(marker)
        else         cluster.removeLayer(marker)
        markerMap.delete(id)
        removed++
      }
    }

    // Step 2: process additions/updates in idle-time chunks
    let idx    = 0
    let added  = 0, moved = 0, skipped = 0

    const CHUNK = 60   // stations per idle-time chunk

    function processChunk(deadline: IdleDeadline) {
      // Guard: layers may have been torn down between idle chunks (unmount)
      const cl = clusterRef.current
      const rl = routeLayerRef.current
      if (!cl || !rl) return

      const toAddCluster:    Marker[] = []
      const toAddRouteLayer: Marker[] = []

      while (idx < stations.length && (deadline.timeRemaining() > 1 || deadline.didTimeout)) {
        const end = Math.min(idx + CHUNK, stations.length)

        for (; idx < end; idx++) {
          const s        = stations[idx]
          const inRoute  = !!meta && isNearRouteMeta(s.position.lat, s.position.lng, meta)
          const newFp    = fingerprint(s, inRoute)
          const existing = markerMap.get(s.id)

          if (existing) {
            // Marker already exists — only update what changed
            if (existing.fp === newFp) { skipped++; continue }

            if (existing.inRoute !== inRoute) {
              // Station moved between route-highlight layer and cluster layer
              if (existing.inRoute) {
                rl.removeLayer(existing.marker)
                existing.marker.setIcon(iconForStation(s.isTesla))
                toAddCluster.push(existing.marker)
              } else {
                cl.removeLayer(existing.marker)
                existing.marker.setIcon(highlightIcon(s.isTesla))
                toAddRouteLayer.push(existing.marker)
              }
              moved++
            } else if (
              // Icon needs updating (isTesla flipped — very rare)
              existing.fp.split('|')[0] !== newFp.split('|')[0]
            ) {
              existing.marker.setIcon(inRoute ? highlightIcon(s.isTesla) : iconForStation(s.isTesla))
            }

            // Always update popup when fingerprint changed
            existing.marker.setPopupContent(buildPopupHTML(s))
            markerMap.set(s.id, { marker: existing.marker, inRoute, fp: newFp })
          } else {
            // New station — create marker once
            const icon = inRoute ? highlightIcon(s.isTesla) : iconForStation(s.isTesla)
            const m = L.marker([s.position.lat, s.position.lng], { icon, zIndexOffset: inRoute ? 800 : 0 })
            m.bindPopup(buildPopupHTML(s), { maxWidth: 300, minWidth: 230, className: 'ev-popup' })
            markerMap.set(s.id, { marker: m, inRoute, fp: newFp })
            if (inRoute) toAddRouteLayer.push(m)
            else         toAddCluster.push(m)
            added++
          }
        }

        if (toAddCluster.length)    cl.addLayers(toAddCluster)
        for (const m of toAddRouteLayer) rl.addLayer(m)
      }

      if (idx < stations.length) {
        // More work remains — schedule next idle chunk
        ricIdRef.current = ric(processChunk, { timeout: 500 })
      } else {
        console.log('[EVMarkers] diff', { total: stations.length, added, removed, moved, skipped })
      }
    }

    ricIdRef.current = ric(processChunk, { timeout: 500 })

  }, [stations, route, showOnMap])

  return null
}
