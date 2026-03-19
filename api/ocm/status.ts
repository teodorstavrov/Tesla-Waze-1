/**
 * Vercel serverless — OCM real-time EVSE status.
 * GET /api/ocm/status?id=12345
 * Returns availability info for a single OCM charging point.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MemoryCache }                         from '../_lib/utils/cache.js'

interface EVSEStatus {
  isOperational:    boolean
  statusType:       string   // 'Unknown', 'Available', 'Occupied', 'Faulted', etc.
  lastUpdated:      string
}

interface OCMStatusRaw {
  StatusType?: { Title: string; IsOperational: boolean }
  LastUpdated?: string
}

const cache = new MemoryCache<EVSEStatus[]>(60_000) // 1min cache

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query['id']
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id' })
  }

  const cached = cache.get(id)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(200).json({ status: cached })
  }

  const apiKey = process.env['OPENCHARGEMAP_API_KEY']
  const keyParam = apiKey ? `&key=${apiKey}` : ''

  try {
    const res2 = await fetch(
      `https://api.openchargemap.io/v3/poi/?output=json&chargepointid=${id}&includecomments=false&verbose=false${keyParam}`,
      { signal: AbortSignal.timeout(6_000) },
    )
    if (!res2.ok) throw new Error(`OCM ${res2.status}`)

    const data = await res2.json()
    const poi  = Array.isArray(data) ? data[0] : null
    if (!poi) return res.status(200).json({ status: [] })

    const connections: OCMStatusRaw[] = poi.Connections ?? []
    const statuses: EVSEStatus[] = connections.map((c) => ({
      isOperational: c.StatusType?.IsOperational ?? false,
      statusType:    c.StatusType?.Title ?? 'Unknown',
      lastUpdated:   c.LastUpdated ?? '',
    }))

    cache.set(id, statuses)
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(200).json({ status: statuses })
  } catch (err) {
    console.error('[ocm/status]', err)
    return res.status(502).json({ status: [], error: 'OCM unavailable' })
  }
}
