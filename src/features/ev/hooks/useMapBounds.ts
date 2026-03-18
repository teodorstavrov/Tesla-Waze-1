/**
 * Tracks the current Leaflet map bounding box.
 * Phase 1: stub — wired to map events in Phase 4.
 */
import { useRef, useCallback } from 'react'
import type { Map as LMap } from 'leaflet'
import type { BoundingBox } from '../types'

export function useMapBounds() {
  const mapRef = useRef<LMap | null>(null)

  const getBounds = useCallback((): BoundingBox | null => {
    if (!mapRef.current) return null
    const b = mapRef.current.getBounds()
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east:  b.getEast(),
      west:  b.getWest(),
    }
  }, [])

  return { mapRef, getBounds }
}
