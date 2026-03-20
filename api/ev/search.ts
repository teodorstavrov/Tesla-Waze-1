/**
 * GET /api/ev/search?q=text
 *
 * Searches OpenChargeMap's full global database for EV charging stations
 * matching the query (name, operator, city). Returns top 10 results.
 */

import { cache } from '../_lib/utils/cache.js'
import type { RawOCMStation } from '../_lib/providers/ocm.js'

const OCM_BASE     = 'https://api.openchargemap.io/v3/poi/'
const CACHE_TTL_MS = 60_000   // 1 min per query

export interface StationSearchResult {
  id:        string
  name:      string
  operator:  string
  city:      string
  country:   string
  lat:       number
  lng:       number
  totalPorts: number
  isTesla:   boolean
}

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'GET')    { res.status(405).json({ error: 'Method not allowed' }); return }

  const q = String(req.query?.q ?? '').trim()
  if (q.length < 2) {
    res.status(400).json({ error: 'Query too short' }); return
  }

  const cacheKey = `ev-search:${q.toLowerCase()}`
  const cached   = cache.get<StationSearchResult[]>(cacheKey)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    res.status(200).json({ results: cached }); return
  }

  const apiKey = process.env['OPENCHARGEMAP_API_KEY']
  if (!apiKey) {
    res.status(503).json({ error: 'OCM API key not configured' }); return
  }

  try {
    const params = new URLSearchParams({
      key:         apiKey,
      output:      'json',
      compact:     'true',
      verbose:     'false',
      maxresults:  '10',
      // OCM uses "title" param for name/city text search
      title:       q,
    })

    const ocmRes = await fetch(`${OCM_BASE}?${params}`, {
      headers: {
        'X-API-Key':   apiKey,
        'User-Agent':  'TeslaWaze/1.0 (https://teslaradar.tech)',
        'Accept':      'application/json',
      },
      signal: AbortSignal.timeout(8_000),
    })

    if (!ocmRes.ok) {
      res.status(502).json({ error: `OCM returned ${ocmRes.status}` }); return
    }

    const raw: RawOCMStation[] = await ocmRes.json()

    const results: StationSearchResult[] = raw
      .filter((s) => s.AddressInfo?.Latitude != null && s.AddressInfo?.Longitude != null)
      .map((s) => {
        const addr     = s.AddressInfo!
        const operator = s.OperatorInfo?.Title ?? ''
        const isTesla  = ['tesla', 'tesla motors', 'tesla supercharger']
          .some((t) => operator.toLowerCase().includes(t))

        return {
          id:         `ocm-${s.ID}`,
          name:       addr.Title ?? operator ?? 'EV Station',
          operator,
          city:       [addr.Town, addr.Country?.Title].filter(Boolean).join(', '),
          country:    addr.Country?.Title ?? '',
          lat:        addr.Latitude!,
          lng:        addr.Longitude!,
          totalPorts: s.NumberOfPoints ?? 0,
          isTesla,
        }
      })

    cache.set(cacheKey, results, CACHE_TTL_MS)
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    res.status(200).json({ results })
  } catch (err) {
    console.error('[/api/ev/search]', err)
    res.status(500).json({ error: 'Search failed' })
  }
}
