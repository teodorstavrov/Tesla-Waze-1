/**
 * Finds stations within BUFFER_METRES of a route polyline.
 *
 * Performance layers:
 * 1. Caller should pre-compute routeMeta once per route change (see buildRouteMeta)
 * 2. Fast bbox rejection rejects most stations with 4 comparisons
 * 3. Decimated coords reduce segment count to ≤ MAX_ROUTE_POINTS
 * 4. Early-exit on first hit
 */

export const BUFFER_METRES = 500

const DEG_TO_RAD = Math.PI / 180
const EARTH_R    = 6_371_000

/** Reduce polyline to at most maxPoints, keeping start + end. */
function decimate(coords: [number, number][], maxPoints: number): [number, number][] {
  if (coords.length <= maxPoints) return coords
  const step   = (coords.length - 1) / (maxPoints - 1)
  const result: [number, number][] = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(coords[Math.round(i * step)])
  }
  result[result.length - 1] = coords[coords.length - 1]   // always keep last
  return result
}

/** Pre-computed route metadata — build once when route changes. */
export interface RouteMeta {
  decimated: [number, number][]
  /** Bounding box expanded by BUFFER_METRES (in degrees) */
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}

export function buildRouteMeta(coords: [number, number][], bufferM = BUFFER_METRES): RouteMeta {
  const MAX_ROUTE_POINTS = 200

  const decimated = decimate(coords, MAX_ROUTE_POINTS)

  // Compute tight bbox of the decimated coords
  let minLat =  90, maxLat = -90, minLng =  180, maxLng = -180
  for (const [lat, lng] of decimated) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  // Expand bbox by bufferM in degrees (approximate)
  const bufLat = bufferM / EARTH_R * (180 / Math.PI)
  const bufLng = bufLat / Math.cos(((minLat + maxLat) / 2) * DEG_TO_RAD)

  return {
    decimated,
    bbox: {
      minLat: minLat - bufLat, maxLat: maxLat + bufLat,
      minLng: minLng - bufLng, maxLng: maxLng + bufLng,
    },
  }
}

function pointToSegment(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const cos = Math.cos(aLat * DEG_TO_RAD)
  const bx  = (bLng - aLng) * cos * EARTH_R * DEG_TO_RAD
  const by  = (bLat - aLat) * EARTH_R * DEG_TO_RAD
  const px  = (pLng - aLng) * cos * EARTH_R * DEG_TO_RAD
  const py  = (pLat - aLat) * EARTH_R * DEG_TO_RAD
  const len2 = bx * bx + by * by
  if (len2 === 0) {
    const d = Math.sqrt(px * px + py * py)
    return d
  }
  const t  = Math.max(0, Math.min(1, (px * bx + py * by) / len2))
  const dx = px - t * bx
  const dy = py - t * by
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Fast check using pre-computed RouteMeta.
 * Call buildRouteMeta() once per route change, then reuse meta for all stations.
 */
export function isNearRouteMeta(
  stationLat: number,
  stationLng: number,
  meta: RouteMeta,
): boolean {
  // Layer 1: bbox rejection (4 comparisons — very cheap)
  const { bbox, decimated } = meta
  if (
    stationLat < bbox.minLat || stationLat > bbox.maxLat ||
    stationLng < bbox.minLng || stationLng > bbox.maxLng
  ) return false

  // Layer 2: segment scan on decimated coords
  for (let i = 0; i < decimated.length - 1; i++) {
    const [aLat, aLng] = decimated[i]
    const [bLat, bLng] = decimated[i + 1]
    if (pointToSegment(stationLat, stationLng, aLat, aLng, bLat, bLng) <= BUFFER_METRES) {
      return true
    }
  }
  return false
}

/** Legacy compat — used in older callers, wraps isNearRouteMeta. */
export function isNearRoute(
  stationLat: number,
  stationLng: number,
  routeCoords: [number, number][],
): boolean {
  return isNearRouteMeta(stationLat, stationLng, buildRouteMeta(routeCoords))
}
