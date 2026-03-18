/** Shared types for the API layer */

export type DataSource = 'tesla' | 'ocm' | 'osm'

export interface Connector {
  type: string
  powerKw: number
  available: boolean
  total: number
}

export interface EVStation {
  id: string
  source: DataSource
  sourcePriority: number   // 1=Tesla, 2=OCM, 3=OSM
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

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export type SourceResult =
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }
  | { status: 'skipped'; reason: string }

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

export interface AggregateResult {
  stations: EVStation[]
  sources: StationsResponse['sources']
  countBeforeDedup: number
  _debugMeta?: Record<string, unknown>
}
