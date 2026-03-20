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

  const q   = String(req.query?.q   ?? '').trim()
  const lat = parseFloat(String(req.query?.lat ?? ''))
  const lng = parseFloat(String(req.query?.lng ?? ''))

  if (q.length < 2) {
    res.status(400).json({ error: 'Query too short' }); return
  }

  // Cache key includes location bucket (rounded to 0.1°) so nearby results are cached per area
  const latBucket = isFinite(lat) ? lat.toFixed(1) : 'x'
  const lngBucket = isFinite(lng) ? lng.toFixed(1) : 'x'
  const cacheKey  = `ev-search:${q.toLowerCase()}:${latBucket}:${lngBucket}`
  const cached    = cache.get<StationSearchResult[]>(cacheKey)
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
      key:        apiKey,
      output:     'json',
      compact:    'true',
      verbose:    'false',
      maxresults: '20',   // fetch more so proximity sort has enough candidates
      title:      q,
    })

    // If map center provided: search within expanding radii (50km → 300km → global)
    // This ensures nearby results come first while still finding distant matches
    if (isFinite(lat) && isFinite(lng)) {
      params.set('latitude',  String(lat))
      params.set('longitude', String(lng))
      params.set('distance',  '300')   // km radius — wide enough to always find something
    }

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

    const mapped: StationSearchResult[] = raw
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

    // Sort by distance from the provided location, then cap at 10
    const results = isFinite(lat) && isFinite(lng)
      ? mapped
          .map((s) => ({ s, d: Math.hypot(s.lat - lat, s.lng - lng) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 10)
          .map(({ s }) => s)
      : mapped.slice(0, 10)

    cache.set(cacheKey, results, CACHE_TTL_MS)
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    res.status(200).json({ results })
  } catch (err) {
    console.error('[/api/ev/search]', err)
    res.status(500).json({ error: 'Search failed' })
  }
}
