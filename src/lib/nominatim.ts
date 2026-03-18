/**
 * Nominatim geocoding client (OpenStreetMap).
 * No API key required. Rate limit: 1 req/sec — callers must debounce.
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

export async function geocode(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q:              query,
    format:         'json',
    limit:          '6',
    addressdetails: '1',
  })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'tesla-ev-nav/1.0 (github.com/teodorstavrov/Tesla-Waze-1)',
      },
    },
  )

  if (!res.ok) throw new Error(`Nominatim ${res.status}`)

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
