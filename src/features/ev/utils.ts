/** Misc EV feature utilities */
import type { EVStation } from './types'

export function stationDisplayName(station: EVStation): string {
  if (station.name) return station.name
  if (station.operator) return station.operator
  return 'EV Charging Station'
}

export function maxPowerKw(station: EVStation): number {
  if (!station.connectors.length) return 0
  return Math.max(...station.connectors.map((c) => c.powerKw))
}

export function availabilityLabel(station: EVStation): string {
  const { availablePorts, totalPorts } = station
  if (totalPorts === 0) return 'Unknown'
  return `${availablePorts}/${totalPorts} available`
}
