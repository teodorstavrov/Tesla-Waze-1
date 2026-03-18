import type { EVStation, Connector } from '../types.js'
import type { RawOverpassElement } from '../providers/overpass.js'

const TESLA_BRAND_HINTS = ['tesla']

function isTeslaTag(tags: RawOverpassElement['tags']): boolean {
  if (!tags) return false
  const fields = [tags.operator, tags.brand, tags.name].map((s) => (s ?? '').toLowerCase())
  return fields.some((f) => TESLA_BRAND_HINTS.some((hint) => f.includes(hint)))
}

function getPosition(el: RawOverpassElement): { lat: number; lng: number } | null {
  if (el.type === 'node' && el.lat != null && el.lon != null) {
    return { lat: el.lat, lng: el.lon }
  }
  if (el.center?.lat != null && el.center?.lon != null) {
    return { lat: el.center.lat, lng: el.center.lon }
  }
  return null
}

/** Parse integer tag, return 0 on failure */
function tagInt(val: string | undefined): number {
  if (!val) return 0
  const n = parseInt(val, 10)
  return isFinite(n) && n > 0 ? n : 0
}

/** Parse kW from a tag string like "50", "50 kW", "50000 W" */
function tagKw(val: string | undefined): number {
  if (!val) return 0
  const clean = val.toLowerCase().trim()
  const match = clean.match(/^([\d.]+)\s*(kw|w)?/)
  if (!match) return 0
  const num = parseFloat(match[1]!)
  if (!isFinite(num)) return 0
  return match[2] === 'w' ? Math.round(num / 1000) : num
}

function buildConnectors(tags: RawOverpassElement['tags']): Connector[] {
  if (!tags) return []
  const connectors: Connector[] = []

  const socketDefs: Array<{ key: keyof typeof tags; label: string }> = [
    { key: 'socket:type2',          label: 'Type 2'           },
    { key: 'socket:type2_cable',    label: 'Type 2 (Cable)'   },
    { key: 'socket:type2_combo',    label: 'CCS'              },
    { key: 'socket:ccs',            label: 'CCS'              },
    { key: 'socket:chademo',        label: 'CHAdeMO'          },
    { key: 'socket:tesla_supercharger', label: 'Tesla Supercharger' },
    { key: 'socket:tesla_destination',  label: 'Tesla Destination'  },
    { key: 'socket:schuko',         label: 'Schuko'           },
  ]

  for (const { key, label } of socketDefs) {
    const val = tags[key]
    if (!val || val === 'no') continue
    const total = tagInt(val) || 1
    connectors.push({
      type: label,
      powerKw: tagKw(tags['maxpower']),
      available: true,
      total,
    })
  }

  return connectors
}

export function normalizeOverpassElement(el: RawOverpassElement): EVStation | null {
  const position = getPosition(el)
  if (!position) return null

  const tags = el.tags ?? {}
  const tesla = isTeslaTag(tags)

  const name =
    tags.name ??
    tags.operator ??
    tags.brand ??
    (tesla ? 'Tesla Charging' : 'EV Charging Station')

  const connectors = buildConnectors(tags)
  const capacity = tagInt(tags['capacity']) || tagInt(tags['capacity:charging'])

  const totalPorts =
    capacity ||
    connectors.reduce((sum, c) => sum + c.total, 0) ||
    1

  return {
    id: `osm-${el.type}-${el.id}`,
    source: 'osm',
    sourcePriority: 3,
    name,
    operator: tags.operator ?? tags.brand ?? '',
    position,
    isTesla: tesla,
    connectors,
    totalPorts,
    availablePorts: totalPorts,  // OSM has no real-time availability
    amenities: [],
    raw: el,
  }
}
