/**
 * Debounced EV station fetching triggered by map movement.
 *
 * Design:
 * - Accepts the Leaflet map instance directly (avoids stale closures)
 * - Debounces rapid map moves so we don't flood the API
 * - Writes results directly to the Zustand store (no prop drilling)
 * - Cleans up pending timer on unmount
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { fetchStations } from '../api'
import { useEVStore } from '../store'
import type { BoundingBox } from '../types'

const DEBOUNCE_MS = 600

export function useEVPolling() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const trigger = useCallback((map: LMap) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
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
    }, DEBOUNCE_MS)
  }, [])

  return { trigger }
}
