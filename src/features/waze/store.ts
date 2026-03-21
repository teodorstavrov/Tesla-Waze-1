import { create } from 'zustand'
import type { WazeAlert, WazeType } from './types'

interface BBox { minLat: number; minLng: number; maxLat: number; maxLng: number }

interface WazeState {
  alerts: WazeAlert[]
  load:   (bbox: BBox) => Promise<void>
}

// Waze blocks server-side requests from cloud IPs (AWS/Vercel).
// We fetch directly from the browser — real IP, real browser UA.
const WAZE_ENDPOINTS = [
  'https://www.waze.com/row-lm/api/georss',
  'https://www.waze.com/live-map/api/georss',
]

function normalizeType(raw: string): WazeType {
  switch (raw) {
    case 'POLICE':      return 'POLICE'
    case 'ACCIDENT':    return 'ACCIDENT'
    case 'HAZARD':      return 'HAZARD'
    case 'JAM':         return 'JAM'
    case 'ROAD_CLOSED': return 'ROAD_CLOSED'
    default:            return 'OTHER'
  }
}

let _abort: AbortController | null = null

export const useWazeStore = create<WazeState>((set) => ({
  alerts: [],

  load: async (bbox) => {
    _abort?.abort()
    _abort = new AbortController()
    const { signal } = _abort

    const params = new URLSearchParams({
      top:   String(bbox.maxLat),
      bottom: String(bbox.minLat),
      left:  String(bbox.minLng),
      right: String(bbox.maxLng),
      env:   'row',
      types: 'alerts',
    })

    for (const base of WAZE_ENDPOINTS) {
      try {
        const res = await fetch(`${base}?${params}`, { signal })
        if (!res.ok) continue

        const data = await res.json()
        const raw: Array<{
          uuid: string; type: string; subtype?: string
          location: { x: number; y: number }
          street?: string; reliability: number
          nThumbsUp?: number; pubMillis: number
        }> = data.alerts ?? []

        set({
          alerts: raw.map((a) => ({
            uuid:        a.uuid,
            type:        normalizeType(a.type),
            subtype:     a.subtype ?? '',
            lat:         a.location.y,
            lng:         a.location.x,
            street:      a.street ?? '',
            reliability: a.reliability,
            thumbsUp:    a.nThumbsUp ?? 0,
            pubMillis:   a.pubMillis,
          })),
        })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.warn(`[waze] ${base} failed:`, (err as Error).message)
      }
    }

    console.warn('[waze] all endpoints failed — browser may be blocking cross-origin request')
  },
}))
