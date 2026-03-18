/**
 * Auto-refreshes station data while the map is stationary (parked at charger).
 *
 * When driving, map pans trigger refreshes automatically via moveend.
 * When parked, this hook fires every INTERVAL_MS so availability stays fresh.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'

const INTERVAL_MS = 2 * 60 * 1000  // 2 minutes

export function useAutoRefresh(
  map: LMap | null,
  trigger: (map: LMap) => void,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!map) return

    intervalRef.current = setInterval(() => {
      trigger(map)
    }, INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [map, trigger])
}
