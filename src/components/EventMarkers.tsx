/**
 * Renders user-reported events (police, danger, accident, camera) on the map.
 * Tap a marker → popup with event type + time + remove button.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, LayerGroup } from 'leaflet'
import { L }                from '@/lib/leaflet'
import type { ReportedEvent, EventType } from '@/features/events/types'
import { useEventStore }    from '@/features/events/store'

interface Props {
  map:    LMap | null
  events: ReportedEvent[]
}

const COLOURS: Record<EventType, string> = {
  police:   '#3d9df3',
  danger:   '#f5a623',
  accident: '#e31937',
  camera:   '#8e44ad',
}

const LABELS: Record<EventType, string> = {
  police:   'Police',
  danger:   'Danger',
  accident: 'Accident',
  camera:   'Camera',
}

const SVG_PATHS: Record<EventType, string> = {
  police:   '<rect x="3" y="5" width="10" height="7" rx="1.5" stroke="white" stroke-width="1.3"/><path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="white" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8.5" r="1.5" stroke="white" stroke-width="1.1"/>',
  danger:   '<path d="M8 2L14.5 13H1.5L8 2Z" stroke="white" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v3M8 10.5v.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/>',
  accident: '<circle cx="8" cy="8" r="6" stroke="white" stroke-width="1.3"/><path d="M8 4.5v4M8 10v.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/>',
  camera:   '<rect x="1" y="4" width="9" height="7" rx="1.5" stroke="white" stroke-width="1.3"/><path d="M10 6.5l4-1.5v5l-4-1.5V6.5Z" stroke="white" stroke-width="1.3" stroke-linejoin="round"/><circle cx="5.5" cy="7.5" r="1.5" stroke="white" stroke-width="1.1"/>',
}

function eventIcon(type: EventType) {
  const c = COLOURS[type]
  return L.divIcon({
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="16" fill="${c}" stroke="white" stroke-width="2"/>
        </svg>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
             style="position:absolute;">
          ${SVG_PATHS[type]}
        </svg>
      </div>`,
    className:  '',
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
  })
}

export function EventMarkers({ map, events }: Props) {
  const layerRef   = useRef<LayerGroup | null>(null)
  const removeEvent = useEventStore((s) => s.removeEvent)

  useEffect(() => {
    if (!map) return
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer
    return () => { layer.remove(); layerRef.current = null }
  }, [map])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()

    for (const ev of events) {
      const marker = L.marker([ev.lat, ev.lng], {
        icon:         eventIcon(ev.type),
        interactive:  true,
        zIndexOffset: 700,
      })

      const age    = formatAge(ev.timestamp)
      const colour = COLOURS[ev.type]
      const label  = LABELS[ev.type]

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:140px">
          <div style="font-size:14px;font-weight:600;color:${colour};margin-bottom:4px">${label}</div>
          <div style="font-size:12px;color:#8a8a8a;margin-bottom:10px">${age}</div>
          <button onclick="document.dispatchEvent(new CustomEvent('removeEvent',{detail:'${ev.id}'}));"
                  style="width:100%;height:36px;background:rgba(227,25,55,0.12);border:none;
                         border-radius:6px;color:#e31937;font-size:12px;font-weight:600;cursor:pointer">
            Remove
          </button>
        </div>`, { className: 'tesla-popup', maxWidth: 180 })

      layer.addLayer(marker)
    }
  }, [events])

  // Listen for remove button clicks from popup
  useEffect(() => {
    const handler = (e: Event) => {
      removeEvent((e as CustomEvent<string>).detail)
    }
    document.addEventListener('removeEvent', handler)
    return () => document.removeEventListener('removeEvent', handler)
  }, [removeEvent])

  return null
}

function formatAge(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}
