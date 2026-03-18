/**
 * Frontend API client for /api/ev/stations.
 * Phase 1: stub — real implementation in Phase 2.
 */
import { env } from '@/lib/env'
import type { BoundingBox, StationsResponse } from './types'

export async function fetchStations(bbox: BoundingBox): Promise<StationsResponse> {
  const params = new URLSearchParams({
    north: String(bbox.north),
    south: String(bbox.south),
    east:  String(bbox.east),
    west:  String(bbox.west),
  })

  const url = `${env.apiBase}/api/ev/stations?${params}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<StationsResponse>
}
