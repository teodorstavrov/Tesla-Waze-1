import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { useWazeStore } from './store'

const DEBOUNCE_MS     = 1_200
const AUTO_REFRESH_MS = 30_000   // Waze data is fresh for ~30s

export function useWazePolling() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMapRef  = useRef<LMap | null>(null)

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (refreshRef.current)  clearInterval(refreshRef.current)
  }, [])

  const fetchForMap = useCallback((map: LMap) => {
    const b = map.getBounds()
    useWazeStore.getState().load({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    })
  }, [])

  const trigger = useCallback((map: LMap) => {
    lastMapRef.current = map
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchForMap(map), DEBOUNCE_MS)

    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(() => {
      if (lastMapRef.current) fetchForMap(lastMapRef.current)
    }, AUTO_REFRESH_MS)
  }, [fetchForMap])

  return { trigger }
}
