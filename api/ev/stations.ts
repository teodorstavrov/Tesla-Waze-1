/**
 * GET /api/ev/stations?north=&south=&east=&west=
 *
 * Vercel serverless handler — aggregates EV charging data from
 * Tesla, OpenChargeMap, and OpenStreetMap/Overpass.
 */

import { validateBboxQuery } from './utils/validate.js'
import { aggregateStations } from './merge/mergeStations.js'
import { isDev } from './utils/debug.js'
import type { EVStation } from './types.js'

/** Strip raw provider data — halves response size in production. */
function stripRaw(stations: EVStation[]): EVStation[] {
  return stations.map(({ raw: _raw, ...rest }) => rest as EVStation)
}

// Vercel passes (req, res) compatible with Node http.IncomingMessage / ServerResponse
export default async function handler(req: any, res: any): Promise<void> {
  // CORS — allow all origins (EV data is public)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // ── Validate bbox ────────────────────────────────────────────────────────
  const validation = validateBboxQuery(req.query ?? {})
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  // ── Aggregate ────────────────────────────────────────────────────────────
  try {
    const result = await aggregateStations(validation.bbox, {
      openChargeMapKey: process.env['OPENCHARGEMAP_API_KEY'],
      isDev: isDev(),
    })

    const wantDebug = req.query?.['debug'] === 'true' && isDev()
    const payload = {
      stations:         wantDebug ? result.stations : stripRaw(result.stations),
      sources:          result.sources,
      countBeforeDedup: result.countBeforeDedup,
      countAfterDedup:  result.stations.length,
      ...(isDev() && result._debugMeta ? { _debug: result._debugMeta } : {}),
    }

    // Cache-friendly: 30s fresh, up to 60s stale-while-revalidate
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    res.status(200).json(payload)
  } catch (err) {
    console.error('[/api/ev/stations] Unexpected error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
