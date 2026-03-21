/**
 * EV station fetching triggered by map movement.
 *
 * Rules:
 * 1. First call: fires IMMEDIATELY (no debounce) — stations load even while driving.
 * 2. Subsequent calls: debounced 600 ms AND only if the user moved >20 km or
 *    zoomed by more than 1 level since the last fetch. Small movements are ignored.
 * 3. Silent refresh: when stations are already loaded, setLoading is NOT called —
 *    the spinner stays hidden while data refreshes in the background.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { fetchStations } from '../api'
import { useEVStore }    from '../store'
import type { BoundingBox } from '../types'

const DEBOUNCE_MS   = 600
const MIN_MOVE_KM   = 20   // skip refetch if moved less than this
const MIN_ZOOM_DIFF = 1    // skip refetch if zoom changed less than this

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371
  const dL = (lat2 - lat1) * Math.PI / 180
  const dN = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dN / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useEVPolling() {
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedOnce     = useRef(false)
  const lastCenter     = useRef<{ lat: number; lng: number } | null>(null)
  const lastZoom       = useRef<number>(0)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const doFetch = useCallback(async (map: LMap, silent: boolean) => {
    const b = map.getBounds()
    const bbox: BoundingBox = {
      north: b.getNorth(), south: b.getSouth(),
      east:  b.getEast(),  west:  b.getWest(),
    }
    const c = map.getCenter()
    lastCenter.current = { lat: c.lat, lng: c.lng }
    lastZoom.current   = map.getZoom()

    const store = useEVStore.getState()
    // Only show spinner on first load — silent refresh keeps existing markers visible
    if (!silent) store.setLoading(true)
    store.setError(null)

    try {
      const response = await fetchStations(bbox)
      store.setStations(response.stations)
      store.setLastResponse(response)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to load stations')
    } finally {
      store.setLoading(false)
    }
  }, [])

  const trigger = useCallback((map: LMap) => {
    if (!loadedOnce.current) {
      // First call: immediate, show spinner
      loadedOnce.current = true
      void doFetch(map, false)
      return
    }

    // Check if the user moved significantly
    const c    = map.getCenter()
    const zoom = map.getZoom()
    if (lastCenter.current) {
      const moved    = haversineKm(lastCenter.current.lat, lastCenter.current.lng, c.lat, c.lng)
      const zoomed   = Math.abs(zoom - lastZoom.current)
      if (moved < MIN_MOVE_KM && zoomed < MIN_ZOOM_DIFF) return  // not worth refetching
    }

    // Debounce subsequent fetches, silent (no spinner)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void doFetch(map, true), DEBOUNCE_MS)
  }, [doFetch])

  return { trigger }
}
