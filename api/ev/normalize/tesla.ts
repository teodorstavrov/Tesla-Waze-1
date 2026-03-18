import type { EVStation, Connector } from '../types.js'
import type { RawTeslaStation } from '../providers/tesla.js'

// supercharge.info actual field names (confirmed against live API 2026-03):
//   gps.latitude / gps.longitude
//   powerKilowatt
//   address: { street, city, state, country, ... }

function getCoords(raw: RawTeslaStation): { lat: number; lng: number } | null {
  const lat =
    raw.gps?.latitude  ?? raw.gps?.lat ??
    raw.location?.lat  ??
    raw.latitude
  const lng =
    raw.gps?.longitude ?? raw.gps?.lng ??
    raw.location?.lng  ??
    raw.longitude

  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null
  return { lat, lng }
}

function getAddress(raw: RawTeslaStation): { street?: string; city?: string } {
  const addr = raw.address as unknown
  if (addr && typeof addr === 'object' && !Array.isArray(addr)) {
    const a = addr as Record<string, unknown>
    return {
      street: typeof a['street'] === 'string' ? a['street'] : undefined,
      city:   typeof a['city']   === 'string' ? a['city']   : raw.city,
    }
  }
  if (typeof addr === 'string') return { street: addr, city: raw.city }
  return { city: raw.city }
}

function parseAmenities(raw: RawTeslaStation): string[] {
  if (!raw.amenities) return []
  if (Array.isArray(raw.amenities)) return raw.amenities.filter(Boolean)
  if (typeof raw.amenities === 'string') {
    return raw.amenities.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export function normalizeTeslaStation(raw: RawTeslaStation): EVStation | null {
  const position = getCoords(raw)
  if (!position) return null

  const id = `tesla-${raw.id}`
  const name = (raw.name ?? raw.title ?? 'Tesla Supercharger').trim()
  const stallCount = raw.stallCount ?? raw.stalls ?? 0

  // Live API uses "powerKilowatt", fallback to other field names
  const rawAny = raw as Record<string, unknown>
  const powerKw =
    (typeof rawAny['powerKilowatt'] === 'number' ? rawAny['powerKilowatt'] as number : 0) ||
    raw.powerKw  ||
    raw.maxPower ||
    0

  const connectors: Connector[] = stallCount > 0
    ? [{
        type: 'Tesla Supercharger',
        powerKw,
        available: true,   // supercharge.info has no real-time stall availability
        total: stallCount,
      }]
    : []

  const { street, city } = getAddress(raw)

  return {
    id,
    source: 'tesla',
    sourcePriority: 1,
    name,
    operator: 'Tesla',
    position,
    isTesla: true,
    connectors,
    totalPorts: stallCount,
    availablePorts: stallCount,
    amenities: parseAmenities(raw),
    address: street,
    city,
    raw,
  }
}
