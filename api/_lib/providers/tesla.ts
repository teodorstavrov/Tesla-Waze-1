/**
 * Tesla Supercharger provider.
 * Source: supercharge.info open dataset — no API key required.
 *
 * Strategy:
 * 1. Fetch the full global dataset (cached aggressively — it's ~1 MB, rarely changes)
 * 2. Filter to OPEN sites within the requested bounding box
 */

import { cache, TTL_TESLA_MS } from '../utils/cache.js'
import { inBbox } from '../utils/geo.js'
import type { BoundingBox } from '../types.js'

const TESLA_URL = 'https://supercharge.info/service/supercharge/allSites'
const CACHE_KEY = 'tesla:allSites'
const FETCH_TIMEOUT_MS = 10_000

// ── Raw shape from supercharge.info ───────────────────────────────────────────
// The API is unofficial; we handle multiple plausible field shapes defensively.
export interface RawTeslaStation {
  id: number | string
  name?: string
  title?: string
  status?: string
  // supercharge.info actual GPS field names
  gps?: { latitude?: number; longitude?: number; lat?: number; lng?: number }
  location?: { lat?: number; lng?: number }
  latitude?: number
  longitude?: number
  city?: string
  country?: string | { code?: string; name?: string }
  stallCount?: number
  stalls?: number
  powerKw?: number         // fallback names
  maxPower?: number
  // supercharge.info uses "powerKilowatt"
  powerKilowatt?: number
  amenities?: string | string[] | null
  // supercharge.info returns address as a nested object
  address?: string | { street?: string; city?: string; state?: string; country?: string; [key: string]: unknown }
  street?: string
}

async function fetchAllSites(): Promise<RawTeslaStation[]> {
  const cached = cache.get<RawTeslaStation[]>(CACHE_KEY)
  if (cached) return cached

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(TESLA_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'tesla-ev-nav/1.0' },
    })

    if (!res.ok) {
      throw new Error(`supercharge.info returned ${res.status}`)
    }

    const data = await res.json() as unknown

    // The API might return { superchargers: [...] } or a bare array
    let sites: RawTeslaStation[]
    if (Array.isArray(data)) {
      sites = data as RawTeslaStation[]
    } else if (data && typeof data === 'object' && 'superchargers' in data) {
      sites = (data as { superchargers: RawTeslaStation[] }).superchargers
    } else {
      throw new Error('Unexpected supercharge.info response shape')
    }

    cache.set(CACHE_KEY, sites, TTL_TESLA_MS)
    return sites
  } finally {
    clearTimeout(timer)
  }
}

function getCoords(raw: RawTeslaStation): { lat: number; lng: number } | null {
  const lat =
    raw.gps?.latitude ?? raw.gps?.lat ??
    raw.location?.lat ??
    raw.latitude
  const lng =
    raw.gps?.longitude ?? raw.gps?.lng ??
    raw.location?.lng ??
    raw.longitude

  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null
  return { lat, lng }
}

export async function fetchTeslaStations(bbox: BoundingBox): Promise<{
  stations: RawTeslaStation[]
  fetchedTotal: number
}> {
  const all = await fetchAllSites()

  const stations = all.filter((s) => {
    // Only open sites
    const status = (s.status ?? '').toUpperCase()
    if (status && status !== 'OPEN') return false

    // Within viewport
    const coords = getCoords(s)
    if (!coords) return false
    return inBbox(coords.lat, coords.lng, bbox)
  })

  return { stations, fetchedTotal: all.length }
}
