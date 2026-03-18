/**
 * Geographic deduplication of EV stations.
 *
 * Algorithm:
 * 1. Sort by source priority (Tesla=1 first, then OCM=2, then OSM=3)
 * 2. Walk each station; if no merged station exists within THRESHOLD_M → add new
 * 3. If a nearby merged station exists → merge (primary keeps identity, gains
 *    any metadata the secondary has that primary lacks)
 *
 * Deduplication is NEVER based on isTesla alone — only real geographic proximity.
 *
 * Complexity: O(n²) — acceptable for typical viewport sizes (< 500 stations).
 */

import { haversineMeters } from '../utils/geo.js'
import type { EVStation, Connector } from '../types.js'

/** Two stations within this distance are considered the same physical location. */
const DEDUP_THRESHOLD_M = 100

export function deduplicateStations(stations: EVStation[]): EVStation[] {
  // Sort so higher-priority sources come first and become the "primary"
  const sorted = [...stations].sort((a, b) => a.sourcePriority - b.sourcePriority)
  const merged: EVStation[] = []

  for (const candidate of sorted) {
    const existingIdx = findNearby(merged, candidate)

    if (existingIdx === -1) {
      merged.push({ ...candidate })
    } else {
      merged[existingIdx] = mergeTwo(merged[existingIdx]!, candidate)
    }
  }

  return merged
}

function findNearby(merged: EVStation[], candidate: EVStation): number {
  for (let i = 0; i < merged.length; i++) {
    const m = merged[i]!
    const dist = haversineMeters(
      m.position.lat, m.position.lng,
      candidate.position.lat, candidate.position.lng,
    )
    if (dist < DEDUP_THRESHOLD_M) return i
  }
  return -1
}

/**
 * Merge secondary into primary.
 * Primary wins on identity fields (id, source, position, name if non-empty).
 * Secondary contributes metadata that primary lacks.
 */
function mergeTwo(primary: EVStation, secondary: EVStation): EVStation {
  return {
    ...primary,

    // Fill empty strings from secondary
    name:     primary.name     || secondary.name,
    operator: primary.operator || secondary.operator,
    address:  primary.address  || secondary.address,
    city:     primary.city     || secondary.city,

    // isTesla: true if either says so
    isTesla: primary.isTesla || secondary.isTesla,

    // Port counts: take max (optimistic — surface the best number available)
    totalPorts:     Math.max(primary.totalPorts,     secondary.totalPorts),
    availablePorts: Math.max(primary.availablePorts, secondary.availablePorts),

    // Price: prefer the one that has data
    pricePerKwh: primary.pricePerKwh ?? secondary.pricePerKwh,

    // Connectors: union — add types from secondary not already represented
    connectors: mergeConnectors(primary.connectors, secondary.connectors),

    // Amenities: union
    amenities: mergeAmenities(primary.amenities, secondary.amenities),
  }
}

function mergeConnectors(primary: Connector[], secondary: Connector[]): Connector[] {
  if (!secondary.length) return primary

  const result = [...primary]
  const existingTypes = new Set(primary.map((c) => c.type.toLowerCase()))

  for (const conn of secondary) {
    if (!existingTypes.has(conn.type.toLowerCase())) {
      result.push(conn)
      existingTypes.add(conn.type.toLowerCase())
    }
  }

  return result
}

function mergeAmenities(a: string[], b: string[]): string[] {
  const set = new Set([...a, ...b].map((s) => s.toLowerCase().trim()).filter(Boolean))
  return Array.from(set)
}
