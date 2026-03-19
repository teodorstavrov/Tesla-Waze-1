export type EventType = 'police' | 'danger' | 'accident' | 'camera'

export interface ReportedEvent {
  id:        string
  type:      EventType
  lat:       number
  lng:       number
  timestamp: number
}
