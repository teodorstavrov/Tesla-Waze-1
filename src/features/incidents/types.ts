export type IncidentType =
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

export interface Incident {
  id:          string
  type:        IncidentType
  lat:         number
  lng:         number
  description: string
  from:        string
  to:          string
  delay:       number     // seconds
  length:      number     // metres
  magnitude:   number     // 0–4
  roadNumbers: string[]
  startTime:   string
  endTime:     string
}
