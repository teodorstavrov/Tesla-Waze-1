/**
 * Orchestrates fetching from all providers, normalization, and deduplication.
 * Each provider runs in parallel; failures are isolated — a broken provider
 * never prevents other providers from returning results.
 */

import { fetchTeslaStations }    from '../providers/tesla.js'
import { fetchOCMStations }      from '../providers/ocm.js'
import { fetchOverpassStations } from '../providers/overpass.js'

import { normalizeTeslaStation }    from '../normalize/tesla.js'
import { normalizeOCMStation }      from '../normalize/ocm.js'
import { normalizeOverpassElement } from '../normalize/overpass.js'

import { deduplicateStations } from './dedup.js'
import { bboxCenter, bboxRadiusKm } from '../utils/geo.js'

import type { BoundingBox, AggregateResult, SourceResult, EVStation } from '../types.js'

interface Env {
  openChargeMapKey?: string
  isDev?: boolean
}

export async function aggregateStations(
  bbox: BoundingBox,
  env: Env = {},
): Promise<AggregateResult> {
  const center    = bboxCenter(bbox)
  const radiusKm  = bboxRadiusKm(bbox)

  // ── Fetch all three in parallel ────────────────────────────────────────────
  const [teslaResult, ocmResult, overpassResult] = await Promise.allSettled([
    fetchTeslaStations(bbox),
    fetchOCMStations(center.lat, center.lng, radiusKm, env.openChargeMapKey),
    fetchOverpassStations(bbox),
  ])

  // ── Normalize each source, collect status ──────────────────────────────────
  let teslaStations:    EVStation[] = []
  let ocmStations:      EVStation[] = []
  let overpassStations: EVStation[] = []

  let teslaSource:    SourceResult
  let ocmSource:      SourceResult
  let osmSource:      SourceResult

  const debugMeta: Record<string, unknown> = {}

  // Tesla
  if (teslaResult.status === 'fulfilled') {
    const { stations: raw, fetchedTotal } = teslaResult.value
    teslaStations = raw
      .map(normalizeTeslaStation)
      .filter((s): s is EVStation => s !== null)
    teslaSource = { status: 'ok', count: teslaStations.length }
    debugMeta['tesla'] = { fetchedTotal, inViewport: teslaStations.length }
  } else {
    const msg = String(teslaResult.reason)
    teslaSource = { status: 'error', message: msg }
    debugMeta['tesla'] = { error: msg }
  }

  // OCM
  if (!env.openChargeMapKey) {
    ocmSource = { status: 'skipped', reason: 'OPENCHARGEMAP_API_KEY not set' }
    debugMeta['ocm'] = { skipped: true }
  } else if (ocmResult.status === 'fulfilled') {
    ocmStations = ocmResult.value
      .map(normalizeOCMStation)
      .filter((s): s is EVStation => s !== null)
    ocmSource = { status: 'ok', count: ocmStations.length }
    debugMeta['ocm'] = { raw: ocmResult.value.length, normalized: ocmStations.length }
  } else {
    const msg = String(ocmResult.reason)
    ocmSource = { status: 'error', message: msg }
    debugMeta['ocm'] = { error: msg }
  }

  // Overpass / OSM
  if (overpassResult.status === 'fulfilled') {
    const { elements, mirrorUsed, attempts } = overpassResult.value
    overpassStations = elements
      .map(normalizeOverpassElement)
      .filter((s): s is EVStation => s !== null)
    osmSource = { status: 'ok', count: overpassStations.length }
    debugMeta['osm'] = { elements: elements.length, normalized: overpassStations.length, mirrorUsed, attempts }
  } else {
    const msg = String(overpassResult.reason)
    osmSource = { status: 'error', message: msg }
    debugMeta['osm'] = { error: msg }
  }

  // ── Merge + dedup ──────────────────────────────────────────────────────────
  const all = [...teslaStations, ...ocmStations, ...overpassStations]
  const countBeforeDedup = all.length
  const deduped = deduplicateStations(all)

  debugMeta['dedup'] = {
    before: countBeforeDedup,
    after: deduped.length,
    removed: countBeforeDedup - deduped.length,
  }

  return {
    stations: deduped,
    sources: { tesla: teslaSource!, ocm: ocmSource!, osm: osmSource! },
    countBeforeDedup,
    _debugMeta: env.isDev ? debugMeta : undefined,
  }
}
