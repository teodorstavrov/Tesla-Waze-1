/**
 * Calculates a driving route using OSRM (free, OSM-based, no key needed).
 * Public endpoint: router.project-osrm.org supports CORS.
 */
import { useCallback }   from 'react'
import { useRouteStore } from '../store'
import type { RoutePoint } from '../types'

interface OSRMResponse {
  code:   string
  routes: Array<{
    distance: number
    duration: number
    geometry: {
      type:        'LineString'
      coordinates: [number, number][]   // [lon, lat]
    }
  }>
}

export function useRoute() {
  const store = useRouteStore()

  const calculate = useCallback(async (origin: RoutePoint, destination: RoutePoint) => {
    store.setLoading(true)
    store.setError(null)

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
        `?overview=simplified&geometries=geojson&steps=false`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`OSRM ${res.status}`)

      const data: OSRMResponse = await res.json()
      if (data.code !== 'Ok' || !data.routes.length) {
        throw new Error('No route found')
      }

      const r = data.routes[0]
      // OSRM returns [lon, lat] — convert to [lat, lng] for Leaflet
      const coordinates: [number, number][] = r.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon]
      )

      store.setRoute({
        origin,
        destination,
        coordinates,
        distanceM: r.distance,
        durationS: r.duration,
      })
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Route unavailable')
    }
  }, [store])

  const clear = useCallback(() => {
    store.setRoute(null)
    store.setError(null)
  }, [store])

  return { calculate, clear }
}
