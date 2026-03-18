import type { BoundingBox } from '../types.js'

const EARTH_RADIUS_M = 6_371_000

/** Real surface distance between two coordinates, in metres (haversine). */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Geographic centre of a bounding box. */
export function bboxCenter(bbox: BoundingBox): { lat: number; lng: number } {
  return {
    lat: (bbox.north + bbox.south) / 2,
    lng: (bbox.east + bbox.west) / 2,
  }
}

/**
 * Approximate search radius in km for OCM queries.
 * Uses the distance from the centre to the north-east corner.
 * Capped at 80 km to avoid enormous result sets.
 */
export function bboxRadiusKm(bbox: BoundingBox): number {
  const center = bboxCenter(bbox)
  const distM = haversineMeters(center.lat, center.lng, bbox.north, bbox.east)
  return Math.min(distM / 1000, 80)
}

/** True if a point falls within (or on the edge of) a bounding box. */
export function inBbox(
  lat: number, lng: number, bbox: BoundingBox,
): boolean {
  return (
    lat >= bbox.south && lat <= bbox.north &&
    lng >= bbox.west  && lng <= bbox.east
  )
}
