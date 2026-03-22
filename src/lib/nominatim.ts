/**
 * Nominatim geocoding client (OpenStreetMap).
 * No API key required. Rate limit: 1 req/sec — callers must debounce.
 *
 * Circuit breaker: after 3 consecutive failures the client backs off for
 * BACKOFF_MS ms before allowing another attempt. This prevents hammering a
 * rate-limited or unreachable endpoint and keeps the UI responsive.
 */

export interface GeoResult {
  placeId:     number
  displayName: string
  shortName:   string   // city or town name for compact display
  lat:         number
  lng:         number
  type:        string   // 'city', 'town', 'village', 'highway', etc.
  country:     string
}

// Circuit breaker state
const FAIL_THRESHOLD = 3
const BACKOFF_MS     = 30_000
let _failCount  = 0
let _openUntil  = 0

interface NominatimRaw {
  place_id:     number
  display_name: string
  lat:          string
  lon:          string
  type:         string
  addresstype:  string
  address?: {
    city?:         string
    town?:         string
    village?:      string
    municipality?: string
    county?:       string
    state?:        string
    country?:      string
    country_code?: string
  }
}

function shortName(raw: NominatimRaw): string {
  const a = raw.address
  return a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.county ?? raw.display_name.split(',')[0]!
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  // Circuit breaker: reject immediately if still in backoff window
  if (_failCount >= FAIL_THRESHOLD && Date.now() < _openUntil) {
    throw new Error('Nominatim circuit open')
  }

  const params = new URLSearchParams({
    q:              query,
    format:         'json',
    limit:          '6',
    addressdetails: '1',
  })

  const opts: RequestInit = {
    signal,
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'tesla-ev-nav/1.0 (github.com/teodorstavrov/Tesla-Waze-1)',
    },
  }
  const url = `https://nominatim.openstreetmap.org/search?${params}`

  let res = await fetch(url, opts)

  // Backoff on rate-limit: wait 2s and retry once
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2_000))
    res = await fetch(url, opts)
  }

  if (!res.ok) {
    _failCount++
    if (_failCount >= FAIL_THRESHOLD) _openUntil = Date.now() + BACKOFF_MS
    throw new Error(`Nominatim ${res.status}`)
  }

  // Success — reset circuit breaker
  _failCount = 0

  const raw: NominatimRaw[] = await res.json()

  return raw.map((r) => ({
    placeId:     r.place_id,
    displayName: r.display_name,
    shortName:   shortName(r),
    lat:         parseFloat(r.lat),
    lng:         parseFloat(r.lon),
    type:        r.addresstype ?? r.type,
    country:     r.address?.country ?? '',
  }))
}
