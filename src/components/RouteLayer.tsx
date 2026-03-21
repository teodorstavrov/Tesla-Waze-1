/**
 * Draws route polyline(s) + origin/destination markers on the map.
 * - When alternatives[] is set (no active route): draws both as ghost lines, fits to both.
 * - When route is set: draws the selected route + pins, fits to it.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, Polyline, Marker } from 'leaflet'
import { L }                from '@/lib/leaflet'
import type { Route }       from '@/features/route/types'

interface Props {
  map:          LMap | null
  route:        Route | null
  alternatives: Route[] | null
}

function pinIcon(colour: string, label: string) {
  return L.divIcon({
    html: `
      <div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:${colour};border:2.5px solid white;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700">${label}</span>
      </div>`,
    className:  '',
    iconSize:   [32, 32],
    iconAnchor: [16, 32],
  })
}

const COLOURS = ['#3d9df3', '#a0a0b0']

export function RouteLayer({ map, route, alternatives }: Props) {
  const linesRef   = useRef<Polyline[]>([])
  const markersRef = useRef<Marker[]>([])

  useEffect(() => {
    if (!map) return

    // Clear everything
    linesRef.current.forEach((l) => l.remove())
    markersRef.current.forEach((m) => m.remove())
    linesRef.current  = []
    markersRef.current = []

    if (route) {
      // ── Active route: bright polyline + A/B pins ───────────────────────────
      const line = L.polyline(route.coordinates, {
        color:    '#3d9df3',
        weight:   5,
        opacity:  0.88,
        lineJoin: 'round',
        lineCap:  'round',
      }).addTo(map)
      linesRef.current = [line]

      const originMarker = L.marker([route.origin.lat, route.origin.lng], {
        icon: pinIcon('#27ae60', 'A'), interactive: true, zIndexOffset: 1000,
      })
        .bindPopup(`<div style="font-size:13px;color:#e8e8e8">${route.origin.label}</div>`, { className: 'tesla-popup' })
        .addTo(map)

      const destMarker = L.marker([route.destination.lat, route.destination.lng], {
        icon: pinIcon('#e31937', 'B'), interactive: true, zIndexOffset: 1000,
      })
        .bindPopup(`<div style="font-size:13px;color:#e8e8e8">${route.destination.label}</div>`, { className: 'tesla-popup' })
        .addTo(map)

      markersRef.current = [originMarker, destMarker]
      map.fitBounds(line.getBounds(), { padding: [60, 80], animate: true })

    } else if (alternatives?.length) {
      // ── Alternatives: ghost polylines, no pins ─────────────────────────────
      const lines = alternatives.map((alt, i) =>
        L.polyline(alt.coordinates, {
          color:   COLOURS[i],
          weight:  i === 0 ? 5 : 4,
          opacity: i === 0 ? 0.70 : 0.45,
          lineJoin: 'round',
          lineCap:  'round',
          dashArray: i === 1 ? '10, 8' : undefined,
        }).addTo(map)
      )
      linesRef.current = lines

      // Fit to combined bounds of all alternatives
      const all: [number, number][] = ([] as [number, number][]).concat(...alternatives.map((a) => a.coordinates))
      const bounds = L.latLngBounds(all)
      map.fitBounds(bounds, { padding: [60, 80], animate: true })
    }

    return () => {
      linesRef.current.forEach((l) => l.remove())
      markersRef.current.forEach((m) => m.remove())
    }
  }, [map, route, alternatives])

  return null
}
