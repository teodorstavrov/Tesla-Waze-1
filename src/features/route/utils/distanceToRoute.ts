/**
 * Finds stations within BUFFER_METRES of a route polyline.
 * Uses point-to-segment haversine distance for accuracy.
 */

const BUFFER_METRES = 500
const DEG_TO_RAD   = Math.PI / 180
const EARTH_R      = 6_371_000

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD
  const dLng = (lng2 - lng1) * DEG_TO_RAD
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2
  return EARTH_R * 2 * Math.asin(Math.sqrt(a))
}

/** Minimum distance in metres from point to a polyline segment. */
function pointToSegment(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  // Work in approximate flat-earth coords (metres) around point A
  const cos = Math.cos(aLat * DEG_TO_RAD)
  const ax = 0,           ay = 0
  const bx = (bLng - aLng) * cos * EARTH_R * DEG_TO_RAD
  const by = (bLat - aLat) * EARTH_R * DEG_TO_RAD
  const px = (pLng - aLng) * cos * EARTH_R * DEG_TO_RAD
  const py = (pLat - aLat) * EARTH_R * DEG_TO_RAD

  const len2 = bx * bx + by * by
  if (len2 === 0) return haversine(pLat, pLng, aLat, aLng)

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2))
  const dx = px - (ax + t * bx)
  const dy = py - (ay + t * by)
  return Math.sqrt(dx * dx + dy * dy)
}

/** Returns true if the station is within BUFFER_METRES of the route. */
export function isNearRoute(
  stationLat: number,
  stationLng: number,
  routeCoords: [number, number][],   // [lat, lng]
): boolean {
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLat, aLng] = routeCoords[i]
    const [bLat, bLng] = routeCoords[i + 1]
    const dist = pointToSegment(stationLat, stationLng, aLat, aLng, bLat, bLng)
    if (dist <= BUFFER_METRES) return true
  }
  return false
}
