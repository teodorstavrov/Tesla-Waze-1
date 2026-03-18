/**
 * Vercel serverless function — Waze live incidents proxy.
 * GET /api/waze/incidents?north=&south=&east=&west=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBboxQuery }                   from '../_lib/utils/validate.js'
import { fetchWazeAlerts }                     from '../_lib/providers/waze.js'
import { MemoryCache }                         from '../_lib/utils/cache.js'
import type { WazeAlert }                      from '../_lib/providers/waze.js'

const cache = new MemoryCache<WazeAlert[]>(30_000) // 30s TTL

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parsed = validateBboxQuery(req.query as Record<string, string>)
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  const { bbox } = parsed
  const key = `${bbox.north.toFixed(4)}:${bbox.south.toFixed(4)}:${bbox.east.toFixed(4)}:${bbox.west.toFixed(4)}`

  const cached = cache.get(key)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ alerts: cached })
  }

  const alerts = await fetchWazeAlerts(bbox)
  cache.set(key, alerts)

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
  return res.status(200).json({ alerts })
}
