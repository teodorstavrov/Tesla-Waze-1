/**
 * OpenStreetMap / Overpass provider.
 *
 * Tries multiple Overpass mirrors in order.
 * On timeout or error from one mirror, moves to the next.
 * Returns debug metadata about which mirror was used and what happened.
 */

import { cache, TTL_OVERPASS_MS } from '../utils/cache.js'
import type { BoundingBox } from '../types.js'

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
]

const TIMEOUT_MS = 12_000
const MAX_RETRIES = MIRRORS.length

// ── Raw Overpass shape ─────────────────────────────────────────────────────────
export interface RawOverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number      // present on nodes
  lon?: number
  center?: { lat: number; lon: number }   // present on ways (with out center)
  tags?: {
    name?: string
    operator?: string
    brand?: string
    amenity?: string
    capacity?: string
    'capacity:charging'?: string
    'socket:type2'?: string
    'socket:type2_cable'?: string
    'socket:type2_combo'?: string   // CCS
    'socket:ccs'?: string
    'socket:chademo'?: string
    'socket:tesla_supercharger'?: string
    'socket:tesla_destination'?: string
    'socket:schuko'?: string
    'maxpower'?: string
    'motorcar'?: string
    opening_hours?: string
    fee?: string
    'charge'?: string
  }
}

interface OverpassResponse {
  elements: RawOverpassElement[]
}

function buildQuery(bbox: BoundingBox): string {
  const { south, west, north, east } = bbox
  // Overpass bbox order: south, west, north, east
  const bboxStr = `${south},${west},${north},${east}`
  return `[out:json][timeout:20];(node["amenity"="charging_station"](${bboxStr});way["amenity"="charging_station"](${bboxStr}););out center tags;`
}

function cacheKey(bbox: BoundingBox): string {
  // Round to ~0.1° grid for cache hits on nearby identical requests
  const r = (n: number) => Math.round(n * 10) / 10
  return `overpass:${r(bbox.south)},${r(bbox.west)},${r(bbox.north)},${r(bbox.east)}`
}

export interface OverpassFetchResult {
  elements: RawOverpassElement[]
  mirrorUsed: string | null
  attempts: Array<{ mirror: string; outcome: 'ok' | 'timeout' | 'error'; detail?: string }>
}

export async function fetchOverpassStations(
  bbox: BoundingBox,
): Promise<OverpassFetchResult> {
  const key = cacheKey(bbox)
  const cached = cache.get<OverpassFetchResult>(key)
  if (cached) return { ...cached, mirrorUsed: cached.mirrorUsed + ' (cached)' }

  const query = buildQuery(bbox)
  const attempts: OverpassFetchResult['attempts'] = []
  let lastError: string | null = null

  for (let i = 0; i < MAX_RETRIES; i++) {
    const mirror = MIRRORS[i]!
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(mirror, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'tesla-ev-nav/1.0',
        },
        signal: controller.signal,
      })

      if (!res.ok) {
        const detail = `HTTP ${res.status}`
        attempts.push({ mirror, outcome: 'error', detail })
        lastError = detail
        continue
      }

      const data = await res.json() as OverpassResponse
      const result: OverpassFetchResult = {
        elements: data.elements ?? [],
        mirrorUsed: mirror,
        attempts: [...attempts, { mirror, outcome: 'ok' }],
      }

      cache.set(key, result, TTL_OVERPASS_MS)
      return result
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const detail = isTimeout ? 'timeout' : String(err)
      attempts.push({ mirror, outcome: isTimeout ? 'timeout' : 'error', detail })
      lastError = detail
    } finally {
      clearTimeout(timer)
    }
  }

  // All mirrors failed — return empty with debug info
  return { elements: [], mirrorUsed: null, attempts }
}
