/**
 * GET /api/ev/stations?north=&south=&east=&west=
 *
 * Vercel serverless handler — aggregates EV charging data from
 * Tesla, OpenChargeMap, and OpenStreetMap/Overpass.
 */

import { validateBboxQuery } from '../_lib/utils/validate.js'
import { aggregateStations } from '../_lib/merge/mergeStations.js'
import { isDev }             from '../_lib/utils/debug.js'
import type { EVStation }    from '../_lib/types.js'

/** Strip raw provider data — reduces response size ~75% in production. */
function stripRaw(stations: EVStation[]): EVStation[] {
  return stations.map(({ raw: _raw, ...rest }) => rest as EVStation)
}

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'Method not allowed' }); return }

  const validation = validateBboxQuery(req.query ?? {})
  if (!validation.ok) { res.status(400).json({ error: validation.error }); return }

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

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    res.status(200).json(payload)
  } catch (err) {
    console.error('[/api/ev/stations] Unexpected error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
