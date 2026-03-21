/**
 * Calculates up to 2 driving route alternatives using OSRM.
 * If 2 alternatives exist → sets store.alternatives (shows picker).
 * If only 1 → selects it immediately.
 */
import { useCallback }   from 'react'
import { useRouteStore } from '../store'
import type { Route, RoutePoint } from '../types'

interface OSRMRoute {
  distance: number
  duration: number
  geometry: {
    type:        'LineString'
    coordinates: [number, number][]   // [lon, lat]
  }
}
interface OSRMResponse {
  code:   string
  routes: OSRMRoute[]
}

function parseRoute(r: OSRMRoute, origin: RoutePoint, destination: RoutePoint): Route {
  return {
    origin,
    destination,
    // OSRM returns [lon, lat] — convert to [lat, lng] for Leaflet
    coordinates: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distanceM:   r.distance,
    durationS:   r.duration,
  }
}

export function useRoute() {
  const store = useRouteStore()

  const calculate = useCallback(async (origin: RoutePoint, destination: RoutePoint) => {
    store.setLoading(true)
    store.setError(null)

    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
        `?overview=full&geometries=geojson&alternatives=true&steps=false`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`OSRM ${res.status}`)

      const data: OSRMResponse = await res.json()
      if (data.code !== 'Ok' || !data.routes.length) {
        throw new Error('No route found')
      }

      const routes = data.routes.slice(0, 2).map((r) => parseRoute(r, origin, destination))

      if (routes.length === 1) {
        // Only one route — select immediately, no picker needed
        store.setRoute(routes[0])
      } else {
        // Two alternatives — show picker, don't activate markers yet
        store.setAlternatives(routes)
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Route unavailable')
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const clear = useCallback(() => {
    store.setRoute(null)
    store.setAlternatives(null)
    store.setError(null)
  }, [store])

  return { calculate, clear }
}
