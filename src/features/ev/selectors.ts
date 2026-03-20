import type { EVStation, FilterMode } from './types'
import type { Route } from '@/features/route/types'
import { buildRouteMeta, isNearRouteMeta } from '@/features/route/utils/distanceToRoute'

/** Cap rendered stations for Tesla browser performance. */
const MAX_DISPLAYED = 600

/** When a route is active, only show stations within this distance of the route. */
const ROUTE_DISPLAY_BUFFER_M = 10_000

export function applyFilter(
  stations:  EVStation[],
  mode:      FilterMode,
  route?:    Route | null,
): EVStation[] {
  let result: EVStation[]
  switch (mode) {
    case 'tesla':     result = stations.filter((s) => s.isTesla);              break
    case 'non-tesla': result = stations.filter((s) => !s.isTesla);             break
    case 'available': result = stations.filter((s) => s.availablePorts > 0);                          break
    case 'fast':      result = stations.filter((s) => s.connectors.some((c) => c.powerKw >= 50));   break
    case 'ultrafast': result = stations.filter((s) => s.connectors.some((c) => c.powerKw >= 150));  break
    default:          result = stations
  }

  // When a route is active: show only stations within 10km of the route
  if (route && route.coordinates.length > 1) {
    const meta = buildRouteMeta(route.coordinates, ROUTE_DISPLAY_BUFFER_M)
    result = result.filter((s) => isNearRouteMeta(s.position.lat, s.position.lng, meta))
  }

  // Safety cap — prevents marker overload on very large viewports
  return result.length > MAX_DISPLAYED ? result.slice(0, MAX_DISPLAYED) : result
}

export function sourceCounts(stations: EVStation[]) {
  return {
    tesla: stations.filter((s) => s.source === 'tesla').length,
    ocm:   stations.filter((s) => s.source === 'ocm').length,
    osm:   stations.filter((s) => s.source === 'osm').length,
    total: stations.length,
  }
}

/** Per-filter counts for the filter bar labels. */
export function filterCounts(stations: EVStation[]) {
  return {
    all:       stations.length,
    tesla:     stations.filter((s) => s.isTesla).length,
    nonTesla:  stations.filter((s) => !s.isTesla).length,
    available: stations.filter((s) => s.availablePorts > 0).length,
  }
}
