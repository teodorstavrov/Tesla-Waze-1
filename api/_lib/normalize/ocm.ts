import type { EVStation, Connector } from '../types.js'
import type { RawOCMStation } from '../providers/ocm.js'

const TESLA_OPERATORS = ['tesla', 'tesla motors', 'tesla supercharger']

function isTeslaOperator(name: string | undefined): boolean {
  if (!name) return false
  return TESLA_OPERATORS.some((t) => name.toLowerCase().includes(t))
}

function normalizeConnectorType(title: string | undefined): string {
  if (!title) return 'Unknown'
  const t = title.toLowerCase()
  if (t.includes('ccs') || t.includes('combo')) return 'CCS'
  if (t.includes('chademo')) return 'CHAdeMO'
  if (t.includes('type 2') || t.includes('type2') || t.includes('mennekes')) return 'Type 2'
  if (t.includes('type 1') || t.includes('type1') || t.includes('j1772')) return 'Type 1'
  if (t.includes('tesla') && t.includes('super')) return 'Tesla Supercharger'
  if (t.includes('tesla')) return 'Tesla'
  if (t.includes('schuko')) return 'Schuko'
  return title
}

function normalizeConnectors(raw: RawOCMStation): Connector[] {
  if (!raw.Connections?.length) return []

  return raw.Connections.map((conn) => {
    const isAvail = conn.StatusType?.IsOperational !== false  // null/undefined → assume available
    const powerKw = conn.PowerKW
      ?? (conn.Amps && conn.Voltage ? (conn.Amps * conn.Voltage) / 1000 : 0)

    return {
      type: normalizeConnectorType(conn.ConnectionType?.Title ?? conn.ConnectionType?.FormalName),
      powerKw: Math.round(powerKw ?? 0),
      available: isAvail,
      total: conn.Quantity ?? 1,
    }
  }).filter((c) => c.type !== 'Unknown' || c.powerKw > 0)
}

export function normalizeOCMStation(raw: RawOCMStation): EVStation | null {
  const info = raw.AddressInfo
  if (!info?.Latitude || !info?.Longitude) return null
  if (!isFinite(info.Latitude) || !isFinite(info.Longitude)) return null

  const position = { lat: info.Latitude, lng: info.Longitude }
  const id = `ocm-${raw.ID}`
  const operator = raw.OperatorInfo?.Title ?? ''
  const name = info.Title ?? operator ?? 'EV Charging Station'
  const tesla = isTeslaOperator(operator) || isTeslaOperator(name)

  const connectors = normalizeConnectors(raw)
  const totalPorts = raw.NumberOfPoints
    ?? connectors.reduce((sum, c) => sum + c.total, 0)
  const availablePorts = connectors
    .filter((c) => c.available)
    .reduce((sum, c) => sum + c.total, 0)

  return {
    id,
    source: 'ocm',
    sourcePriority: 2,
    name,
    operator,
    position,
    isTesla: tesla,
    connectors,
    totalPorts,
    availablePorts,
    amenities: [],
    address: info.AddressLine1,
    city: info.Town,
    pricePerKwh: undefined,  // OCM has UsageCost as a string, not a number — skip for now
    raw,
  }
}
