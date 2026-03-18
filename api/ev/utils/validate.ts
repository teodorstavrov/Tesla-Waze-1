import type { BoundingBox } from '../types.js'

type QueryMap = Record<string, string | string[] | undefined>

function parseFloat_(v: string | string[] | undefined): number | null {
  if (v === undefined || Array.isArray(v)) return null
  const n = parseFloat(v)
  return isFinite(n) ? n : null
}

export type ValidateResult =
  | { ok: true; bbox: BoundingBox }
  | { ok: false; error: string }

export function validateBboxQuery(query: QueryMap): ValidateResult {
  const north = parseFloat_(query['north'])
  const south = parseFloat_(query['south'])
  const east  = parseFloat_(query['east'])
  const west  = parseFloat_(query['west'])

  if (north === null || south === null || east === null || west === null) {
    return { ok: false, error: 'Missing or invalid query params: north, south, east, west (all required floats)' }
  }

  if (north <= south) {
    return { ok: false, error: 'north must be greater than south' }
  }

  if (Math.abs(north) > 90 || Math.abs(south) > 90) {
    return { ok: false, error: 'Latitude values must be within [-90, 90]' }
  }

  if (Math.abs(east) > 180 || Math.abs(west) > 180) {
    return { ok: false, error: 'Longitude values must be within [-180, 180]' }
  }

  return { ok: true, bbox: { north, south, east, west } }
}
