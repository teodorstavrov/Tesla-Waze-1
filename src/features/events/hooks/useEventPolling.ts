/**
 * Debounced event fetching triggered by map movement.
 * Fetches only events within the current viewport (bbox-filtered).
 * Auto-refreshes every 60 s when the map is stationary.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { useEventStore } from '../store'

const DEBOUNCE_MS    = 900   // slightly staggered from EV (600ms)
const AUTO_REFRESH_MS = 60_000

export function useEventPolling() {
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMapRef   = useRef<LMap | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current)  clearTimeout(debounceRef.current)
      if (refreshRef.current)   clearInterval(refreshRef.current)
    }
  }, [])

  const fetchForMap = useCallback((map: LMap) => {
    const b = map.getBounds()
    useEventStore.getState().loadEvents({
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

    // (Re-)start auto-refresh timer each time bounds change
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(() => {
      if (lastMapRef.current) fetchForMap(lastMapRef.current)
    }, AUTO_REFRESH_MS)
  }, [fetchForMap])

  return { trigger }
}
