/**
 * Renders live Waze alerts (police, accidents, hazards) on the map.
 * Data comes from /api/waze/incidents, refreshed every 30s.
 * These are read-only — users cannot remove them.
 */
import { useEffect, useRef } from 'react'
import type { Map as LMap, LayerGroup } from 'leaflet'
import { L } from '@/lib/leaflet'
import type { WazeAlert, WazeType } from '@/features/waze/types'

interface Props {
  map:    LMap | null
  alerts: WazeAlert[]
}

// Only show types that are relevant to drivers
const VISIBLE: Set<WazeType> = new Set(['POLICE', 'ACCIDENT', 'HAZARD', 'ROAD_CLOSED'])

function wazeIcon(type: WazeType, subtype: string): ReturnType<typeof L.divIcon> {
  if (type === 'POLICE') {
    return L.divIcon({
      html: `
        <svg width="38" height="48" viewBox="0 0 38 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="wps" x="-30%" y="-20%" width="160%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M19 1C9.611 1 2 8.611 2 18c0 6.8 3.7 12.7 9.2 15.9L19 47 28.8 33.9C34.3 30.7 36 24.8 36 18 36 8.611 28.389 1 19 1z"
                fill="#2277CC" filter="url(#wps)"/>
          <circle cx="19" cy="18" r="13" fill="white" opacity="0.18"/>
          <circle cx="19" cy="21" r="9" fill="#D4956A"/>
          <rect x="9" y="14" width="20" height="3.5" rx="1.75" fill="#1A5CB0"/>
          <rect x="12" y="7" width="14" height="8" rx="2" fill="#1A5CB0"/>
          <rect x="9" y="16" width="20" height="1.2" rx="0.6" fill="#0F3D8A" opacity="0.45"/>
          <circle cx="19" cy="10.5" r="2.4" fill="white"/>
          <circle cx="19" cy="10.5" r="1" fill="#FFD700"/>
          <circle cx="16" cy="21.5" r="1.2" fill="#3D2B1A"/>
          <circle cx="22" cy="21.5" r="1.2" fill="#3D2B1A"/>
          <circle cx="16.4" cy="21.1" r="0.4" fill="white"/>
          <circle cx="22.4" cy="21.1" r="0.4" fill="white"/>
          <path d="M15.5 25 Q19 28 22.5 25" stroke="#3D2B1A" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        </svg>`,
      className:  '',
      iconSize:   [38, 48],
      iconAnchor: [19, 48],
      popupAnchor:[0, -46],
    })
  }

  if (type === 'ACCIDENT') {
    return L.divIcon({
      html: `
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;position:relative;">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#e31937" stroke="white" stroke-width="2"
                    style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="position:absolute;">
            <path d="M8 1.5l5.5 3v4.5C13.5 12.5 11 14.5 8 15.5 5 14.5 2.5 12.5 2.5 9V4.5z"
                  stroke="white" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M8 5.5v4" stroke="white" stroke-width="1.7" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r="0.9" fill="white"/>
          </svg>
        </div>`,
      className:  '',
      iconSize:   [32, 32],
      iconAnchor: [16, 16],
    })
  }

  if (type === 'ROAD_CLOSED') {
    return L.divIcon({
      html: `
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;position:relative;">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#8e44ad" stroke="white" stroke-width="2"
                    style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="position:absolute;">
            <rect x="2" y="6" width="12" height="5" rx="1" stroke="white" stroke-width="1.3"/>
            <path d="M5 6V4a3 3 0 016 0v2" stroke="white" stroke-width="1.3"/>
            <circle cx="8" cy="8.5" r="1" fill="white"/>
          </svg>
        </div>`,
      className:  '',
      iconSize:   [32, 32],
      iconAnchor: [16, 16],
    })
  }

  // HAZARD — yellow triangle
  const isWeather = subtype?.toLowerCase().includes('weather') || subtype?.toLowerCase().includes('fog')
  const fill = isWeather ? '#5ba3f5' : '#f5a623'
  return L.divIcon({
    html: `
      <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;position:relative;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="${fill}" stroke="white" stroke-width="2"
                  style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))"/>
        </svg>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="position:absolute;">
          <path d="M8 1.5L15 14.5H1L8 1.5Z" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M8 5.5v4.5" stroke="white" stroke-width="1.7" stroke-linecap="round"/>
          <circle cx="8" cy="12.2" r="0.9" fill="white"/>
        </svg>
      </div>`,
    className:  '',
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
  })
}

const TYPE_LABEL: Partial<Record<WazeType, string>> = {
  POLICE:     'Полиция (Waze)',
  ACCIDENT:   'Катастрофа (Waze)',
  HAZARD:     'Опасност (Waze)',
  ROAD_CLOSED:'Затворен път (Waze)',
}

function subtypeLabel(sub: string): string {
  return sub
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^hazard on road /, '')
    .replace(/^hazard /, '')
    .replace(/^accident /, '')
}

export function WazeMarkers({ map, alerts }: Props) {
  const layerRef = useRef<LayerGroup | null>(null)

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

    for (const alert of alerts) {
      if (!VISIBLE.has(alert.type)) continue

      const marker = L.marker([alert.lat, alert.lng], {
        icon:         wazeIcon(alert.type, alert.subtype),
        interactive:  true,
        zIndexOffset: 600,
      })

      const label = TYPE_LABEL[alert.type] ?? alert.type
      const sub   = alert.subtype ? subtypeLabel(alert.subtype) : ''
      const age   = formatAge(alert.pubMillis)
      const colour = alert.type === 'POLICE' ? '#2277CC'
        : alert.type === 'ACCIDENT' ? '#e31937'
        : alert.type === 'ROAD_CLOSED' ? '#8e44ad'
        : '#f5a623'

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:140px">
          <div style="font-size:13px;font-weight:600;color:${colour};margin-bottom:3px">${label}</div>
          ${sub ? `<div style="font-size:11px;color:#aaa;margin-bottom:3px;text-transform:capitalize">${sub}</div>` : ''}
          ${alert.street ? `<div style="font-size:11px;color:#888;margin-bottom:3px">${alert.street}</div>` : ''}
          <div style="font-size:11px;color:#888">${age}</div>
          ${alert.thumbsUp > 0 ? `<div style="font-size:11px;color:#3dd68c;margin-top:4px">👍 ${alert.thumbsUp}</div>` : ''}
        </div>`, { className: 'tesla-popup', maxWidth: 180 })

      layer.addLayer(marker)
    }
  }, [alerts])

  return null
}

function formatAge(pubMillis: number): string {
  const mins = Math.round((Date.now() - pubMillis) / 60_000)
  if (mins < 1)  return 'Току що'
  if (mins < 60) return `преди ${mins} мин`
  return `преди ${Math.floor(mins / 60)} ч`
}
