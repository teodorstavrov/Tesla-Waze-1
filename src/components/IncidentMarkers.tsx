/**
 * Renders Waze live traffic incidents as Leaflet markers.
 * Lifecycle mirrors EVMarkers: one effect owns the layer, another syncs data.
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
        icon:        incidentIcon(inc.type),
        interactive: true,
        zIndexOffset: 500,
      })

      const label    = INCIDENT_LABELS[inc.type]
      const street   = inc.street ? `<div style="font-size:12px;color:#8a8a8a;margin-top:2px">${inc.street}</div>` : ''
      const subtype  = inc.subtype
        ? `<div style="font-size:11px;color:#aaa;margin-top:1px">${formatSubtype(inc.subtype)}</div>`
        : ''
      const age      = formatAge(inc.pubMillis)
      const thumbs   = inc.thumbsUp > 0
        ? `<span style="color:#3d9df3;margin-left:8px">👍 ${inc.thumbsUp}</span>`
        : ''

      marker.bindPopup(`
        <div style="min-width:160px;font-family:system-ui,sans-serif">
          <div style="font-size:14px;font-weight:600;color:#e8e8e8">${label}</div>
          ${subtype}
          ${street}
          <div style="font-size:11px;color:#8a8a8a;margin-top:4px">${age}${thumbs}</div>
        </div>
      `, { maxWidth: 240, className: 'tesla-popup' })

      layer.addLayer(marker)
    }
  }, [incidents])

  return null
}

function formatSubtype(raw: string): string {
  return raw
    .replace(/^[A-Z]+_/, '')        // strip prefix
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatAge(pubMillis: number): string {
  const mins = Math.round((Date.now() - pubMillis) / 60_000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}
