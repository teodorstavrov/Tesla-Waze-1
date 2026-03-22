/**
 * Renders user-reported events (police, danger, accident, camera) on the map.
 * Tap a marker → popup with event type + time + remove button.
 */
import { useEffect, useRef, useMemo } from 'react'
import type { Map as LMap, LayerGroup } from 'leaflet'
import { L }                from '@/lib/leaflet'
import type { ReportedEvent, EventType } from '@/features/events/types'
import { useEventStore }    from '@/features/events/store'
import type { Route }       from '@/features/route/types'
import { buildRouteMeta, isNearRouteMeta } from '@/features/route/utils/distanceToRoute'

interface Props {
  map:    LMap | null
  events: ReportedEvent[]
  route:  Route | null
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
  // Officer head + police cap with badge
  police: `
    <circle cx="8" cy="11" r="3.5" stroke="white" stroke-width="1.3"/>
    <line x1="3.5" y1="7.8" x2="12.5" y2="7.8" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="5" y="4" width="6" height="4.2" rx="1" stroke="white" stroke-width="1.2"/>
    <circle cx="8" cy="5.8" r="0.9" fill="white"/>`,
  // Triangle with bold exclamation
  danger: `
    <path d="M8 1.5L15 14.5H1L8 1.5Z" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M8 5.5v4.5" stroke="white" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="8" cy="12.2" r="0.9" fill="white"/>`,
  // Shield with exclamation (distinct from danger)
  accident: `
    <path d="M8 1.5l5.5 3v4.5C13.5 12.5 11 14.5 8 15.5 5 14.5 2.5 12.5 2.5 9V4.5z" stroke="white" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M8 5.5v4" stroke="white" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="8" cy="11.5" r="0.9" fill="white"/>`,
  // Camera body + lens + top bump
  camera: `
    <rect x="1" y="5" width="10" height="7.5" rx="1.5" stroke="white" stroke-width="1.3"/>
    <circle cx="6" cy="8.7" r="2.3" stroke="white" stroke-width="1.2"/>
    <circle cx="6" cy="8.7" r="0.8" fill="white"/>
    <rect x="3.5" y="3" width="4" height="2.2" rx="0.8" fill="white"/>
    <path d="M11 7l4-1.5v5L11 9V7z" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>`,
}

function policeIcon() {
  return L.divIcon({
    html: `
      <svg width="42" height="54" viewBox="0 0 42 54" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pf" x="-30%" y="-20%" width="160%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.55"/>
          </filter>
        </defs>
        <!-- Pin teardrop -->
        <path d="M21 1C10.507 1 2 9.507 2 20c0 7.5 4.1 14.05 10.2 17.5L21 53 31.8 37.5C37.9 34.05 40 27.5 40 20 40 9.507 31.493 1 21 1z"
              fill="#3D8FDB" filter="url(#pf)"/>
        <!-- White inner ring -->
        <circle cx="21" cy="20" r="15.5" fill="white" opacity="0.15"/>
        <!-- Face (skin) -->
        <circle cx="21" cy="23" r="10.5" fill="#D4956A"/>
        <!-- Hat brim -->
        <rect x="9" y="15" width="24" height="4" rx="2" fill="#1A5CB0"/>
        <!-- Hat top -->
        <rect x="12.5" y="7" width="17" height="9.5" rx="2.5" fill="#1A5CB0"/>
        <!-- Hat visor shadow -->
        <rect x="9" y="17.5" width="24" height="1.5" rx="0.75" fill="#0F3D8A" opacity="0.5"/>
        <!-- Badge -->
        <circle cx="21" cy="11.5" r="3" fill="white"/>
        <circle cx="21" cy="11.5" r="1.2" fill="#FFD700"/>
        <!-- Eyes -->
        <circle cx="17.5" cy="23.5" r="1.4" fill="#3D2B1A"/>
        <circle cx="24.5" cy="23.5" r="1.4" fill="#3D2B1A"/>
        <!-- Eye shine -->
        <circle cx="18" cy="23" r="0.5" fill="white"/>
        <circle cx="25" cy="23" r="0.5" fill="white"/>
        <!-- Smile -->
        <path d="M17 27.5 Q21 31 25 27.5" stroke="#3D2B1A" stroke-width="1.3" stroke-linecap="round" fill="none"/>
      </svg>`,
    className:  '',
    iconSize:   [42, 54],
    iconAnchor: [21, 54],
    popupAnchor:[0, -50],
  })
}

function eventIcon(type: EventType) {
  if (type === 'police') return policeIcon()

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

export function EventMarkers({ map, events, route }: Props) {
  const layerRef   = useRef<LayerGroup | null>(null)
  const removeEvent = useEventStore((s) => s.removeEvent)

  // When a route is active: show only events within 500 m of the route
  const visibleEvents = useMemo(() => {
    if (!route || route.coordinates.length < 2) return events
    const meta = buildRouteMeta(route.coordinates)
    return events.filter((e) => isNearRouteMeta(e.lat, e.lng, meta))
  }, [events, route])

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

    for (const ev of visibleEvents) {
      const marker = L.marker([ev.lat, ev.lng], {
        icon:         eventIcon(ev.type),
        interactive:  true,
        zIndexOffset: 700,
      })

      const age          = formatAge(ev.timestamp)
      const colour       = COLOURS[ev.type]
      const label        = LABELS[ev.type]
      const confirmCount = ev.confirmations ?? 0

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:140px">
          <div style="font-size:14px;font-weight:600;color:${colour};margin-bottom:4px">${label}</div>
          <div style="font-size:12px;color:#8a8a8a;margin-bottom:6px">${age}</div>
          ${confirmCount > 0 ? `<div style="font-size:12px;color:#3dd68c;margin-bottom:8px">✓ ${confirmCount} потвърждения</div>` : ''}
          <button onclick="document.dispatchEvent(new CustomEvent('removeEvent',{detail:${JSON.stringify(ev.id)}}))"
                  style="width:100%;height:36px;background:rgba(227,25,55,0.12);border:none;
                         border-radius:6px;color:#e31937;font-size:12px;font-weight:600;cursor:pointer">
            Remove
          </button>
        </div>`, { className: 'tesla-popup', maxWidth: 180 })

      layer.addLayer(marker)
    }
  }, [visibleEvents])

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
