/**
 * Vercel serverless — TomTom Traffic Incidents proxy.
 * GET /api/traffic/incidents?north=&south=&east=&west=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBboxQuery }                   from '../_lib/utils/validate.js'
import { fetchTomTomIncidents }                from '../_lib/providers/tomtom.js'
import { cache }                               from '../_lib/utils/cache.js'
import type { TomTomIncident }                 from '../_lib/providers/tomtom.js'

const TTL_MS = 30_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  const apiKey = process.env['TOMTOM_API_KEY']
  if (!apiKey) {
    return res.status(200).json({ incidents: [] })
  }

  const parsed = validateBboxQuery(req.query as Record<string, string>)
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  const { bbox } = parsed
  const key = `tomtom:${bbox.north.toFixed(3)}:${bbox.south.toFixed(3)}:${bbox.east.toFixed(3)}:${bbox.west.toFixed(3)}`

  const cached = cache.get<TomTomIncident[]>(key)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ incidents: cached })
  }

  try {
    const incidents = await fetchTomTomIncidents(bbox, apiKey)
    cache.set(key, incidents, TTL_MS)
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ incidents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[traffic/incidents]', err)
    return res.status(502).json({ incidents: [], error: msg })
  }
}
