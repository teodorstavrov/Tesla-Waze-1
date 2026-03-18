import { L }                from '@/lib/leaflet'
import type { IncidentType } from './types'

const COLOURS: Record<IncidentType, string> = {
  ACCIDENT:             '#e31937',
  JAM:                  '#ff6b00',
  ROAD_CLOSED:          '#8b0000',
  LANE_CLOSED:          '#c0392b',
  ROAD_WORKS:           '#f39c12',
  DANGEROUS_CONDITIONS: '#f5a623',
  ICE:                  '#5dade2',
  FOG:                  '#aab7b8',
  RAIN:                 '#2980b9',
  WIND:                 '#1abc9c',
  FLOODING:             '#1a5276',
  DETOUR:               '#8e44ad',
  OTHER:                '#7f8c8d',
}

function svgForType(type: IncidentType, colour: string): string {
  switch (type) {
    case 'ACCIDENT':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <path d="M12 7v5.5M12 15v1" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'JAM':
      return `<svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <rect x="1" y="1" width="26" height="14" rx="3" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <path d="M6 8h4M13 8h2M18 8h4" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'ROAD_CLOSED':
    case 'LANE_CLOSED':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <path d="M7 7l10 10M17 7L7 17" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`

    case 'ROAD_WORKS':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <path d="M8 16l2-4 2 2 2-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`

    case 'ICE':
    case 'FOG':
    case 'RAIN':
    case 'WIND':
    case 'FLOODING':
    case 'DANGEROUS_CONDITIONS':
      // Triangle for weather/hazard types
      return `<svg width="26" height="24" viewBox="0 0 26 24" fill="none">
        <path d="M13 2L24.5 21H1.5L13 2Z" fill="${colour}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M13 9v5M13 16v.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`

    case 'DETOUR':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <path d="M7 12h10M14 9l3 3-3 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`

    default:
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="${colour}" stroke="white" stroke-width="1.5"/>
        <circle cx="10" cy="10" r="3" fill="white"/>
      </svg>`
  }
}

export function incidentIcon(type: IncidentType) {
  const colour = COLOURS[type]
  const svg    = svgForType(type, colour)
  const size: [number, number] = type === 'JAM' ? [28, 16] :
    ['ICE','FOG','RAIN','WIND','FLOODING','DANGEROUS_CONDITIONS'].includes(type) ? [26, 24] :
    [24, 24]
  return L.divIcon({
    html:       svg,
    className:  '',
    iconSize:   size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  })
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  ACCIDENT:             'Accident',
  JAM:                  'Traffic jam',
  ROAD_CLOSED:          'Road closed',
  LANE_CLOSED:          'Lane closed',
  ROAD_WORKS:           'Road works',
  DANGEROUS_CONDITIONS: 'Dangerous conditions',
  ICE:                  'Ice on road',
  FOG:                  'Fog',
  RAIN:                 'Rain',
  WIND:                 'Strong wind',
  FLOODING:             'Flooding',
  DETOUR:               'Detour',
  OTHER:                'Incident',
}
