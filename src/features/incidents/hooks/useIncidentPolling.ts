/**
 * Fetches Waze incidents through our own reverse proxy.
 * /waze-proxy/* → https://www.waze.com/* (Vite in dev, Vercel rewrite in prod)
 * This avoids CORS and makes requests look server-originated to Waze.
 */
import { useCallback, useRef } from 'react'
import type { Map as LMap }    from 'leaflet'
import { useIncidentStore }    from '../store'
import type { Incident }       from '../types'

const DEBOUNCE_MS = 800

interface WazeRaw {
  alerts?: Array<{
    uuid:        string
    type:        string
    subtype?:    string
    location:    { x: number; y: number }
    street?:     string
    city?:       string
    reliability: number
    nThumbsUp?:  number
    pubMillis:   number
  }>
}

function normalizeType(raw: string): Incident['type'] {
  switch (raw) {
    case 'ACCIDENT':    return 'ACCIDENT'
    case 'HAZARD':      return 'HAZARD'
    case 'JAM':         return 'JAM'
    case 'ROAD_CLOSED': return 'ROAD_CLOSED'
    default:            return 'OTHER'
  }
}

const WAZE_PATHS = [
  '/waze-proxy/live-map/api/georss',
  '/waze-proxy/row-lm/api/georss',
]

export function useIncidentPolling() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((map: LMap) => {
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      const b = map.getBounds()
      const params = new URLSearchParams({
        top:    String(b.getNorth()),
        bottom: String(b.getSouth()),
        left:   String(b.getWest()),
        right:  String(b.getEast()),
        env:    'row',
        types:  'alerts',
      })

      useIncidentStore.getState().setLoading(true)

      for (const path of WAZE_PATHS) {
        try {
          const res = await fetch(`${path}?${params}`)
          if (!res.ok) continue

          const data: WazeRaw = await res.json()
          const alerts = data.alerts ?? []

          const incidents: Incident[] = alerts.map((a) => ({
            uuid:        a.uuid,
            type:        normalizeType(a.type),
            subtype:     a.subtype ?? '',
            lat:         a.location.y,
            lng:         a.location.x,
            street:      a.street ?? '',
            city:        a.city ?? '',
            reliability: a.reliability,
            thumbsUp:    a.nThumbsUp ?? 0,
            pubMillis:   a.pubMillis,
          }))

          useIncidentStore.getState().setIncidents(incidents)
          useIncidentStore.getState().setLoading(false)
          return
        } catch {
          // try next path
        }
      }

      useIncidentStore.getState().setLoading(false)
    }, DEBOUNCE_MS)
  }, [])

  return { trigger }
}
