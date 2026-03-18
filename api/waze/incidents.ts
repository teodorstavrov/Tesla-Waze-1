/**
 * Vercel serverless function — Waze live incidents proxy.
 * GET /api/waze/incidents?north=&south=&east=&west=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBboxQuery }                   from '../_lib/utils/validate.js'
import { fetchWazeAlerts }                     from '../_lib/providers/waze.js'
import { MemoryCache }                         from '../_lib/utils/cache.js'

const cache = new MemoryCache<ReturnType<typeof fetchWazeAlerts>>(30_000) // 30s

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parsed = validateBboxQuery(req.query as Record<string, string>)
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  const { bbox } = parsed
  const key = `${bbox.north}:${bbox.south}:${bbox.east}:${bbox.west}`

  let alerts = cache.get(key)
  if (!alerts) {
    try {
      alerts = fetchWazeAlerts(bbox)
      cache.set(key, alerts)
    } catch {
      return res.status(502).json({ error: 'Waze unavailable' })
    }
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
  return res.status(200).json({ alerts: await alerts })
}
