import { L }             from '@/lib/leaflet'
import type { IncidentType } from './types'

// Colour palette — intentionally bright for in-car daylight readability
const COLOURS: Record<IncidentType, string> = {
  ACCIDENT:   '#e31937',   // Tesla red
  HAZARD:     '#f5a623',   // amber
  JAM:        '#ff6b00',   // orange
  ROAD_CLOSED:'#8b0000',   // dark red
  OTHER:      '#8a8a8a',   // grey
}

// SVG shapes per type
function svgForType(type: IncidentType): string {
  const c = COLOURS[type]
  switch (type) {
    case 'ACCIDENT':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" fill="${c}" stroke="white" stroke-width="1.5"/>
        <path d="M12 7v5.5M12 15.5v.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'HAZARD':
      return `<svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L24.5 21H1.5L13 2Z" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M13 9v5M13 16v.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'JAM':
      return `<svg width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="26" height="14" rx="3" fill="${c}" stroke="white" stroke-width="1.5"/>
        <path d="M7 8h5M13 8h2M17 8h4" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'ROAD_CLOSED':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="${c}" stroke="white" stroke-width="1.5"/>
        <path d="M7 7l10 10M17 7L7 17" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`

    default:
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" fill="${c}" stroke="white" stroke-width="1.5"/>
        <circle cx="10" cy="10" r="3" fill="white"/>
      </svg>`
  }
}

export function incidentIcon(type: IncidentType) {
  const svg  = svgForType(type)
  const size: [number, number] = type === 'JAM' ? [28, 16] : type === 'HAZARD' ? [26, 24] : [24, 24]
  return L.divIcon({
    html:       svg,
    className:  '',
    iconSize:   size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  })
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  ACCIDENT:    'Accident',
  HAZARD:      'Hazard',
  JAM:         'Traffic jam',
  ROAD_CLOSED: 'Road closed',
  OTHER:       'Incident',
}
