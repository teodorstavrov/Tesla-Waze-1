/**
 * Waze Live Map — public georss endpoint, no key required.
 * Returns alerts (accidents, hazards, closures) for a bounding box.
 */

import type { BoundingBox } from '../types.js'

export type WazeAlertType =
  | 'ACCIDENT'
  | 'HAZARD'
  | 'JAM'
  | 'ROAD_CLOSED'
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

export async function fetchWazeAlerts(bbox: BoundingBox): Promise<WazeAlert[]> {
  const params = new URLSearchParams({
    top:    String(bbox.north),
    bottom: String(bbox.south),
    left:   String(bbox.west),
    right:  String(bbox.east),
    env:    'row',
    types:  'alerts',
  })

  const res = await fetch(
    `https://www.waze.com/live-map/api/georss?${params}`,
    {
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'tesla-ev-nav/1.0',
        'Referer':    'https://www.waze.com/live-map',
      },
      signal: AbortSignal.timeout(8_000),
    },
  )

  if (!res.ok) throw new Error(`Waze ${res.status}`)

  const data: WazeRaw = await res.json()
  const alerts = data.alerts ?? []

  return alerts.map((a) => ({
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
  }))
}

function normalizeType(raw: string): WazeAlertType {
  switch (raw) {
    case 'ACCIDENT':    return 'ACCIDENT'
    case 'HAZARD':      return 'HAZARD'
    case 'JAM':         return 'JAM'
    case 'ROAD_CLOSED': return 'ROAD_CLOSED'
    default:            return 'OTHER'
  }
}
