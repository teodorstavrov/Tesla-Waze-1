/**
 * OpenChargeMap provider.
 * Docs: https://openchargemap.org/site/develop/api
 *
 * Requires OPENCHARGEMAP_API_KEY env var.
 * Gracefully skips if key is missing or request returns 403.
 */

import { cache, TTL_OCM_MS } from '../utils/cache.js'

const OCM_BASE = 'https://api.openchargemap.io/v3/poi/'
const FETCH_TIMEOUT_MS = 10_000
const MAX_RESULTS = 500

// ── Raw OCM shape (abbreviated — full spec at openchargemap.org) ───────────────
export interface RawOCMStation {
  ID: number
  AddressInfo?: {
    Title?: string
    AddressLine1?: string
    Town?: string
    StateOrProvince?: string
    Postcode?: string
    Country?: { Title?: string; ISOCode?: string }
    Latitude?: number
    Longitude?: number
  }
  OperatorInfo?: { Title?: string }
  StatusType?: { IsOperational?: boolean; Title?: string }
  UsageCost?: string | null
  Connections?: Array<{
    ConnectionType?: { Title?: string; FormalName?: string }
    PowerKW?: number | null
    Amps?: number | null
    Voltage?: number | null
    StatusType?: { IsOperational?: boolean }
    Quantity?: number | null
  }>
  NumberOfPoints?: number | null
}

function cacheKey(lat: number, lng: number, radiusKm: number): string {
  // Round to ~1 km grid to increase cache hit rate
  const rLat = Math.round(lat * 10) / 10
  const rLng = Math.round(lng * 10) / 10
  const rRad = Math.ceil(radiusKm / 5) * 5
  return `ocm:${rLat}:${rLng}:${rRad}`
}

export async function fetchOCMStations(
  lat: number,
  lng: number,
  radiusKm: number,
  apiKey: string | undefined,
): Promise<RawOCMStation[]> {
  if (!apiKey) return []

  const key = cacheKey(lat, lng, radiusKm)
  const cached = cache.get<RawOCMStation[]>(key)
  if (cached) return cached

  const params = new URLSearchParams({
    latitude:     String(lat),
    longitude:    String(lng),
    distance:     String(Math.ceil(radiusKm)),
    distanceunit: 'KM',
    maxresults:   String(MAX_RESULTS),
    output:       'json',
    compact:      'true',
    verbose:      'false',
    key:          apiKey,
  })

  const url = `${OCM_BASE}?${params}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
        'User-Agent': 'tesla-ev-nav/1.0',
      },
    })

    if (res.status === 403 || res.status === 401) {
      // Invalid key — return empty, don't throw (treated as skip)
      return []
    }

    if (!res.ok) {
      throw new Error(`OCM returned ${res.status}: ${res.statusText}`)
    }

    const data = await res.json() as RawOCMStation[]
    cache.set(key, data, TTL_OCM_MS)
    return data
  } finally {
    clearTimeout(timer)
  }
}
