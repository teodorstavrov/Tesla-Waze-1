import { create } from 'zustand'
import type { WazeAlert } from './types'

interface BBox { minLat: number; minLng: number; maxLat: number; maxLng: number }

interface WazeState {
  alerts: WazeAlert[]
  load:   (bbox: BBox) => Promise<void>
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
      const res = await fetch(`/api/waze/incidents?${params}`, { signal })
      if (!res.ok) return
      const data = await res.json()
      set({ alerts: (data.alerts ?? []) as WazeAlert[] })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn('[waze] fetch failed', err)
    }
  },
}))
