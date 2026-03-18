/** Unified internal station model — all providers normalise to this shape */

export type DataSource = 'tesla' | 'ocm' | 'osm'

export interface Connector {
  type: string        // e.g. "CCS", "CHAdeMO", "Type 2"
  powerKw: number
  available: boolean
  total: number
}

export interface EVStation {
  id: string
  source: DataSource
  /** Lower number = higher priority. Tesla=1, OCM=2, OSM=3 */
  sourcePriority: number
  name: string
  operator: string
  position: { lat: number; lng: number }
  isTesla: boolean
  connectors: Connector[]
  totalPorts: number
  availablePorts: number
  amenities: string[]
  pricePerKwh?: number
  address?: string
  city?: string
  raw?: unknown
}

/** Bounding box used for viewport-aware queries */
export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

/** Source-level fetch result (success or failure) */
export type SourceResult =
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }
  | { status: 'skipped'; reason: string }

/** Shape of the /api/ev/stations response */
export interface StationsResponse {
  stations: EVStation[]
  sources: {
    tesla: SourceResult
    ocm: SourceResult
    osm: SourceResult
  }
  countBeforeDedup: number
  countAfterDedup: number
  _debug?: unknown
}

/** Filter state */
export type FilterMode = 'all' | 'tesla' | 'non-tesla' | 'available'
