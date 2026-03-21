/**
 * Waze Live Map — public georss endpoint, no key required.
 * Returns alerts (accidents, hazards, closures) for a bounding box.
 *
 * Waze's API requires browser-like headers and occasionally rotates endpoints.
 * We try two endpoints; if both fail we return an empty array (non-critical overlay).
 */

import type { BoundingBox } from '../types.js'

export type WazeAlertType =
  | 'ACCIDENT'
  | 'HAZARD'
  | 'JAM'
  | 'ROAD_CLOSED'
  | 'POLICE'
  | 'OTHER'

export interface WazeAlert {
  uuid:         string
  type:         WazeAlertType
  subtype:      string
  lat:          number
  lng:          number
  street:       string
  city:         string
  reliability:  number   // 0–10
  thumbsUp:     number
  pubMillis:    number
}

interface WazeRaw {
  alerts?: Array<{
    uuid:        string
    type:        string
    subtype?:    string
    location:    { x: number; y: number }
    street?:     string
    city?:       string
    reliability: number
    nThumbsUp?:  number
    pubMillis:   number
  }>
}

const ENDPOINTS = [
  'https://www.waze.com/live-map/api/georss',
  'https://www.waze.com/row-lm/api/georss',
]

const BROWSER_HEADERS = {
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control':   'no-cache',
  'Pragma':          'no-cache',
  'Referer':         'https://www.waze.com/live-map',
  'User-Agent':      'Mozilla/5.0 (Linux; Android 10; Tesla) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

export interface WazeFetchResult {
  alerts: WazeAlert[]
  _debug?: { endpoint: string; status: number; alertCount: number; rawKeys: string[] } | { endpoint: string; error: string }
}

export async function fetchWazeAlerts(bbox: BoundingBox): Promise<WazeFetchResult> {
  const params = new URLSearchParams({
    top:    String(bbox.north),
    bottom: String(bbox.south),
    left:   String(bbox.west),
    right:  String(bbox.east),
    env:    'row',
    types:  'alerts',
  })

  for (const base of ENDPOINTS) {
    try {
      const res = await fetch(`${base}?${params}`, {
        headers: BROWSER_HEADERS,
        signal:  AbortSignal.timeout(8_000),
      })

      if (!res.ok) {
        console.warn(`[waze] ${base} → HTTP ${res.status}`)
        continue
      }

      const data: WazeRaw = await res.json()
      const alerts = data.alerts ?? []

      console.log(`[waze] ${base} → ${alerts.length} alerts, keys: ${Object.keys(data).join(', ')}`)

      return {
        alerts: alerts.map((a) => ({
          uuid:        a.uuid,
          type:        normalizeType(a.type),
          subtype:     a.subtype ?? '',
          lat:         a.location.y,
          lng:         a.location.x,
          street:      a.street ?? '',
          city:        a.city ?? '',
          reliability: a.reliability,
          thumbsUp:    a.nThumbsUp ?? 0,
          pubMillis:   a.pubMillis,
        })),
        _debug: { endpoint: base, status: res.status, alertCount: alerts.length, rawKeys: Object.keys(data) },
      }
    } catch (err) {
      console.warn(`[waze] ${base} failed:`, err)
    }
  }

  return { alerts: [], _debug: { endpoint: 'all failed', error: 'both endpoints failed or timed out' } }
}

function normalizeType(raw: string): WazeAlertType {
  switch (raw) {
    case 'ACCIDENT':    return 'ACCIDENT'
    case 'HAZARD':      return 'HAZARD'
    case 'JAM':         return 'JAM'
    case 'ROAD_CLOSED': return 'ROAD_CLOSED'
    case 'POLICE':      return 'POLICE'
    default:            return 'OTHER'
  }
}
