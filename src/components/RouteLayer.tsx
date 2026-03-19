/**
 * Draws the route polyline + origin/destination markers on the map.
 * Also fits the map bounds to show the full route.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, Polyline, Marker } from 'leaflet'
import { L }                from '@/lib/leaflet'
import type { Route }       from '@/features/route/types'

interface Props {
  map:   LMap | null
  route: Route | null
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

export function RouteLayer({ map, route }: Props) {
  const lineRef   = useRef<Polyline | null>(null)
  const markersRef = useRef<Marker[]>([])

  useEffect(() => {
    if (!map) return

    // Clear previous
    lineRef.current?.remove()
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    lineRef.current = null

    if (!route) return

    // Draw route polyline
    lineRef.current = L.polyline(route.coordinates, {
      color:     '#3d9df3',
      weight:    5,
      opacity:   0.85,
      lineJoin:  'round',
      lineCap:   'round',
    }).addTo(map)

    // Origin marker (green A)
    const originMarker = L.marker([route.origin.lat, route.origin.lng], {
      icon:         pinIcon('#27ae60', 'A'),
      interactive:  true,
      zIndexOffset: 1000,
    })
      .bindPopup(`<div style="font-size:13px;color:#e8e8e8">${route.origin.label}</div>`, { className: 'tesla-popup' })
      .addTo(map)

    // Destination marker (red B)
    const destMarker = L.marker([route.destination.lat, route.destination.lng], {
      icon:         pinIcon('#e31937', 'B'),
      interactive:  true,
      zIndexOffset: 1000,
    })
      .bindPopup(`<div style="font-size:13px;color:#e8e8e8">${route.destination.label}</div>`, { className: 'tesla-popup' })
      .addTo(map)

    markersRef.current = [originMarker, destMarker]

    // Fit map to show full route
    map.fitBounds(lineRef.current.getBounds(), { padding: [60, 60], animate: true })

    return () => {
      lineRef.current?.remove()
      markersRef.current.forEach((m) => m.remove())
    }
  }, [map, route])

  return null
}
