/**
 * Vercel serverless — TomTom Traffic Incidents proxy.
 * GET /api/traffic/incidents?north=&south=&east=&west=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBboxQuery }                   from '../_lib/utils/validate.js'
import { fetchTomTomIncidents }                from '../_lib/providers/tomtom.js'
import { MemoryCache }                         from '../_lib/utils/cache.js'
import type { TomTomIncident }                 from '../_lib/providers/tomtom.js'

const cache = new MemoryCache<TomTomIncident[]>(30_000)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env['TOMTOM_API_KEY']
  if (!apiKey) {
    return res.status(200).json({ incidents: [], error: 'TOMTOM_API_KEY not set' })
  }

  const parsed = validateBboxQuery(req.query as Record<string, string>)
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  const { bbox } = parsed
  const key = `${bbox.north.toFixed(3)}:${bbox.south.toFixed(3)}:${bbox.east.toFixed(3)}:${bbox.west.toFixed(3)}`

  const cached = cache.get(key)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ incidents: cached })
  }

  try {
    const incidents = await fetchTomTomIncidents(bbox, apiKey)
    cache.set(key, incidents)
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ incidents })
  } catch (err) {
    console.error('[traffic/incidents]', err)
    return res.status(502).json({ incidents: [], error: 'TomTom unavailable' })
  }
}
