/**
 * GET /api/ev/stations
 *
 * Returns all EV charging stations in Bulgaria from Redis cache.
 * If the cache is empty or older than SYNC_INTERVAL_MS, performs a fresh
 * fetch from all providers (Tesla, OCM, Overpass) for the entire country
 * and stores the result in Redis before responding.
 *
 * This means:
 * - First request after deploy (or after 24 h): slow (~3–8 s), fetches live
 * - All subsequent requests: instant (<150 ms) from Redis
 * - No per-viewport API calls — the frontend loads once per session
 */

import { aggregateStations } from '../_lib/merge/mergeStations.js'
import { stationsStore }     from '../_lib/stationsStore.js'
import { isDev }             from '../_lib/utils/debug.js'

/** Bounding box covering all of Bulgaria */
const BULGARIA: import('../_lib/types.js').BoundingBox = {
  north: 44.22, south: 41.24,
  east:  28.61, west:  22.36,
}

/** Re-fetch from providers every 24 hours */
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'Method not allowed' }); return }

  const forceSync = req.query?.['sync'] === 'true'

  try {
    const lastSync  = await stationsStore.getLastSync()
    const count     = await stationsStore.count()
    const stale     = !lastSync || (Date.now() - lastSync > SYNC_INTERVAL_MS)
    const needsSync = forceSync || stale || count === 0

    let synced = false

    if (needsSync) {
      console.log('[ev/stations] syncing from providers…')
      const result = await aggregateStations(BULGARIA, {
        openChargeMapKey: process.env['OPENCHARGEMAP_API_KEY'],
        isDev: isDev(),
      })
      await stationsStore.replaceAll(result.stations)
      await stationsStore.setLastSync(Date.now())
      synced = true
      console.log(`[ev/stations] sync done — ${result.stations.length} stations stored`)
    }

    const stations = await stationsStore.getAll()

    // No client-side caching — frontend treats this as authoritative
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      stations,
      synced,
      total: stations.length,
      syncedAt: await stationsStore.getLastSync(),
    })
  } catch (err) {
    console.error('[/api/ev/stations]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
