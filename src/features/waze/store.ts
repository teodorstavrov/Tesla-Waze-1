/**
 * Traffic alerts store — fetches from TomTom via /api/traffic/incidents.
 * Waze is inaccessible (CORS + cloud IP block). TomTom works server-side.
 * Normalized to WazeAlert shape so WazeMarkers renders without changes.
 */
import { create } from 'zustand'
import type { WazeAlert, WazeType } from './types'

interface BBox { minLat: number; minLng: number; maxLat: number; maxLng: number }

interface WazeState {
  alerts: WazeAlert[]
  load:   (bbox: BBox) => Promise<void>
}

// TomTom iconCategory → our WazeType
type TomTomType =
  | 'ACCIDENT' | 'FOG' | 'DANGEROUS_CONDITIONS' | 'RAIN' | 'ICE'
  | 'JAM' | 'LANE_CLOSED' | 'ROAD_CLOSED' | 'ROAD_WORKS'
  | 'WIND' | 'FLOODING' | 'DETOUR' | 'OTHER'

function toWazeType(t: TomTomType): WazeType | null {
  switch (t) {
    case 'ACCIDENT':             return 'ACCIDENT'
    case 'ROAD_CLOSED':
    case 'LANE_CLOSED':          return 'ROAD_CLOSED'
    case 'DANGEROUS_CONDITIONS':
    case 'FOG':
    case 'RAIN':
    case 'ICE':
    case 'WIND':
    case 'FLOODING':
    case 'ROAD_WORKS':           return 'HAZARD'
    default:                     return null   // JAM, DETOUR, OTHER — skip
  }
}

let _abort: AbortController | null = null

export const useWazeStore = create<WazeState>((set) => ({
  alerts: [],

  load: async (bbox) => {
    _abort?.abort()
    _abort = new AbortController()
    const { signal } = _abort

    try {
      const params = new URLSearchParams({
        north: String(bbox.maxLat),
        south: String(bbox.minLat),
        east:  String(bbox.maxLng),
        west:  String(bbox.minLng),
      })
      const res = await fetch(`/api/traffic/incidents?${params}`, { signal })
      if (!res.ok) return

      const data = await res.json()
      const incidents: Array<{
        id: string; type: TomTomType; lat: number; lng: number
        description: string; from: string; magnitude: number
      }> = data.incidents ?? []

      const alerts: WazeAlert[] = []
      for (const inc of incidents) {
        const wtype = toWazeType(inc.type)
        if (!wtype) continue
        alerts.push({
          uuid:        inc.id,
          type:        wtype,
          subtype:     inc.type,
          lat:         inc.lat,
          lng:         inc.lng,
          street:      inc.from || inc.description || '',
          reliability: inc.magnitude * 2,   // 0–4 → 0–8 (rough scale)
          thumbsUp:    0,
          pubMillis:   Date.now(),
        })
      }

      set({ alerts })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn('[traffic] fetch failed', err)
    }
  },
}))
