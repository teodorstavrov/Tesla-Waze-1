/**
 * Renders TomTom traffic incidents as Leaflet markers.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, LayerGroup } from 'leaflet'
import { L }                from '@/lib/leaflet'
import type { Incident }    from '@/features/incidents/types'
import { incidentIcon, INCIDENT_LABELS } from '@/features/incidents/icons'

interface Props {
  map:       LMap | null
  incidents: Incident[]
}

export function IncidentMarkers({ map, incidents }: Props) {
  const layerRef = useRef<LayerGroup | null>(null)

  // Effect 1: create layer once when map mounts
  useEffect(() => {
    if (!map) return
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer
    return () => { layer.remove(); layerRef.current = null }
  }, [map])

  // Effect 2: sync incidents into layer
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    layer.clearLayers()

    for (const inc of incidents) {
      const marker = L.marker([inc.lat, inc.lng], {
        icon:         incidentIcon(inc.type),
        interactive:  true,
        zIndexOffset: 500,
      })

      const label   = INCIDENT_LABELS[inc.type]
      const road    = inc.roadNumbers.length ? `<span style="color:#3d9df3">${inc.roadNumbers.join(', ')}</span> · ` : ''
      const route   = inc.from && inc.to
        ? `<div style="font-size:11px;color:#8a8a8a;margin-top:2px">${inc.from} → ${inc.to}</div>`
        : inc.from
          ? `<div style="font-size:11px;color:#8a8a8a;margin-top:2px">${inc.from}</div>`
          : ''
      const delay   = inc.delay > 0
        ? `<span style="color:#f5a623"> +${formatDelay(inc.delay)}</span>`
        : ''
      const length  = inc.length > 0
        ? `<span style="color:#8a8a8a"> · ${formatLength(inc.length)}</span>`
        : ''

      marker.bindPopup(`
        <div style="min-width:160px;font-family:system-ui,sans-serif">
          <div style="font-size:14px;font-weight:600;color:#e8e8e8">${label}</div>
          ${inc.description ? `<div style="font-size:12px;color:#aaa;margin-top:2px">${inc.description}</div>` : ''}
          ${route}
          <div style="font-size:11px;color:#8a8a8a;margin-top:4px">${road}${delay}${length}</div>
        </div>
      `, { maxWidth: 260, className: 'tesla-popup' })

      layer.addLayer(marker)
    }
  }, [incidents])

  return null
}

function formatDelay(seconds: number): string {
  if (seconds < 60)   return `${seconds}s delay`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min delay`
  return `${(seconds / 3600).toFixed(1)}h delay`
}

function formatLength(metres: number): string {
  if (metres < 1000) return `${metres}m`
  return `${(metres / 1000).toFixed(1)}km`
}
