/**
 * EV station fetching triggered by map movement.
 *
 * First call: fires IMMEDIATELY (no debounce) — ensures stations load
 * even while driving when the map is still moving.
 * Subsequent calls: debounced 600 ms to avoid flooding the API on rapid pans.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { fetchStations } from '../api'
import { useEVStore } from '../store'
import type { BoundingBox } from '../types'

const DEBOUNCE_MS = 600

export function useEVPolling() {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedOnce   = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const doFetch = useCallback(async (map: LMap) => {
    const b = map.getBounds()
    const bbox: BoundingBox = {
      north: b.getNorth(),
      south: b.getSouth(),
      east:  b.getEast(),
      west:  b.getWest(),
    }

    const { setLoading, setError, setStations, setLastResponse } = useEVStore.getState()
    setLoading(true)
    setError(null)

    try {
      const response = await fetchStations(bbox)
      setStations(response.stations)
      setLastResponse(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [])

  const trigger = useCallback((map: LMap) => {
    if (!loadedOnce.current) {
      // First call: load immediately so stations appear even while driving
      loadedOnce.current = true
      void doFetch(map)
      return
    }

    // Subsequent calls: debounce to avoid flooding on rapid pan/zoom
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void doFetch(map), DEBOUNCE_MS)
  }, [doFetch])

  return { trigger }
}
