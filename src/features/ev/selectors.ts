import type { EVStation, FilterMode } from './types'

/** Cap rendered stations for Tesla browser performance. */
const MAX_DISPLAYED = 600

export function applyFilter(stations: EVStation[], mode: FilterMode): EVStation[] {
  let result: EVStation[]
  switch (mode) {
    case 'tesla':     result = stations.filter((s) => s.isTesla);              break
    case 'non-tesla': result = stations.filter((s) => !s.isTesla);             break
    case 'available': result = stations.filter((s) => s.availablePorts > 0);   break
    default:          result = stations
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
    all:      stations.length,
    tesla:    stations.filter((s) => s.isTesla).length,
    nonTesla: stations.filter((s) => !s.isTesla).length,
    available:stations.filter((s) => s.availablePorts > 0).length,
  }
}
