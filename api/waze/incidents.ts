/**
 * Vercel serverless function — Waze live incidents proxy.
 * GET /api/waze/incidents?north=&south=&east=&west=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBboxQuery }                   from '../_lib/utils/validate.js'
import { fetchWazeAlerts }                     from '../_lib/providers/waze.js'
import { cache }                               from '../_lib/utils/cache.js'
import type { WazeAlert }                      from '../_lib/providers/waze.js'

const TTL_MS = 30_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  try {
    const parsed = validateBboxQuery(req.query as Record<string, string>)
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error })
    }

    const { bbox } = parsed
    const key = `waze:${bbox.north.toFixed(4)}:${bbox.south.toFixed(4)}:${bbox.east.toFixed(4)}:${bbox.west.toFixed(4)}`

    const cached = cache.get<WazeAlert[]>(key)
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
      return res.status(200).json({ alerts: cached })
    }

    const alerts = await fetchWazeAlerts(bbox)
    cache.set(key, alerts, TTL_MS)

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ alerts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[waze/incidents]', err)
    return res.status(500).json({ error: 'Failed to fetch Waze alerts', detail: msg })
  }
}
