export type WazeType = 'POLICE' | 'ACCIDENT' | 'HAZARD' | 'ROAD_CLOSED' | 'JAM' | 'OTHER'

export interface WazeAlert {
  uuid:        string
  type:        WazeType
  subtype:     string
  lat:         number
  lng:         number
  street:      string
  reliability: number
  thumbsUp:    number
  pubMillis:   number
}
