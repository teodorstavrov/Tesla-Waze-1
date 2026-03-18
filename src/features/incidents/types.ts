export type IncidentType = 'ACCIDENT' | 'HAZARD' | 'JAM' | 'ROAD_CLOSED' | 'OTHER'

export interface Incident {
  uuid:        string
  type:        IncidentType
  subtype:     string
  lat:         number
  lng:         number
  street:      string
  city:        string
  reliability: number
  thumbsUp:    number
  pubMillis:   number
}
