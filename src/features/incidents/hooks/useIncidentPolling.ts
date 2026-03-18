/**
 * Fetches Waze incidents for the current map viewport.
 * Call trigger(map) after any pan/zoom (same pattern as useEVPolling).
 */
import { useCallback, useRef } from 'react'
import type { Map as LMap }    from 'leaflet'
import { useIncidentStore }    from '../store'
import type { Incident }       from '../types'

const DEBOUNCE_MS = 800

export function useIncidentPolling() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((map: LMap) => {
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      const b = map.getBounds()
      const params = new URLSearchParams({
        north: String(b.getNorth()),
        south: String(b.getSouth()),
        east:  String(b.getEast()),
        west:  String(b.getWest()),
      })

      useIncidentStore.getState().setLoading(true)
      try {
        const res = await fetch(`/api/waze/incidents?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: { alerts: Incident[] } = await res.json()
        useIncidentStore.getState().setIncidents(data.alerts ?? [])
      } catch {
        // silently ignore — incident overlay is non-critical
      } finally {
        useIncidentStore.getState().setLoading(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  return { trigger }
}
