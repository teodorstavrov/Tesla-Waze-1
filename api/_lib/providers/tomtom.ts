/**
 * TomTom Traffic Incidents API v5
 * Docs: https://developer.tomtom.com/traffic-api/documentation/traffic-incidents/incident-details
 */

import type { BoundingBox } from '../types.js'

export type IncidentCategory =
  | 'ACCIDENT'
  | 'FOG'
  | 'DANGEROUS_CONDITIONS'
  | 'RAIN'
  | 'ICE'
  | 'JAM'
  | 'LANE_CLOSED'
  | 'ROAD_CLOSED'
  | 'ROAD_WORKS'
  | 'WIND'
  | 'FLOODING'
  | 'DETOUR'
  | 'OTHER'

// iconCategory → our type (TomTom uses 0–14)
const CATEGORY_MAP: Record<number, IncidentCategory> = {
  0:  'OTHER',
  1:  'ACCIDENT',
  2:  'FOG',
  3:  'DANGEROUS_CONDITIONS',
  4:  'RAIN',
  5:  'ICE',
  6:  'JAM',
  7:  'LANE_CLOSED',
  8:  'ROAD_CLOSED',
  9:  'ROAD_WORKS',
  10: 'WIND',
  11: 'FLOODING',
  12: 'DETOUR',
  13: 'OTHER',   // cluster
  14: 'OTHER',   // broken down vehicle
}

export interface TomTomIncident {
  id:           string
  type:         IncidentCategory
  lat:          number
  lng:          number
  description:  string
  from:         string
  to:           string
  delay:        number    // seconds
  length:       number    // metres
  magnitude:    number    // 0=unknown 1=minor 2=moderate 3=major 4=undefined
  roadNumbers:  string[]
  startTime:    string
  endTime:      string
}

interface TomTomRaw {
  incidents?: Array<{
    type: string
    geometry: {
      type:        string
      coordinates: number[] | number[][]
    }
    properties: {
      id:                    string
      iconCategory:          number
      magnitudeOfDelay:      number
      events?:               Array<{ description: string; code: number }>
      from?:                 string
      to?:                   string
      delay?:                number
      length?:               number
      roadNumbers?:          string[]
      startTime?:            string
      endTime?:              string
    }
  }>
}

function firstCoord(geometry: TomTomRaw['incidents'][0]['geometry']): [number, number] {
  if (geometry.type === 'Point') {
    const c = geometry.coordinates as number[]
    return [c[1], c[0]]
  }
  // MultiPoint — take first
  const c = (geometry.coordinates as number[][])[0]
  return [c[1], c[0]]
}

export async function fetchTomTomIncidents(
  bbox: BoundingBox,
  apiKey: string,
): Promise<TomTomIncident[]> {
  // TomTom bbox format: minLon,minLat,maxLon,maxLat
  const bboxParam = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`

  const params = new URLSearchParams({
    key:                apiKey,
    bbox:               bboxParam,
    fields:             '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code},from,to,delay,length,roadNumbers,startTime,endTime}}}',
    language:           'en-GB',
    timeValidityFilter: 'present',
  })

  const res = await fetch(
    `https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`,
    { signal: AbortSignal.timeout(8_000) },
  )

  if (!res.ok) throw new Error(`TomTom ${res.status}`)

  const data: TomTomRaw = await res.json()
  const incidents = data.incidents ?? []

  return incidents.map((inc) => {
    const p   = inc.properties
    const pos = firstCoord(inc.geometry)
    return {
      id:          p.id,
      type:        CATEGORY_MAP[p.iconCategory] ?? 'OTHER',
      lat:         pos[0],
      lng:         pos[1],
      description: p.events?.[0]?.description ?? '',
      from:        p.from ?? '',
      to:          p.to ?? '',
      delay:       p.delay ?? 0,
      length:      p.length ?? 0,
      magnitude:   p.magnitudeOfDelay ?? 0,
      roadNumbers: p.roadNumbers ?? [],
      startTime:   p.startTime ?? '',
      endTime:     p.endTime ?? '',
    }
  })
}
