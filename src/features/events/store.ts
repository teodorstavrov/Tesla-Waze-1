import { create } from 'zustand'
import type { ReportedEvent, EventType } from './types'

interface EventState {
  events:      ReportedEvent[]
  addEvent:    (type: EventType, lat: number, lng: number) => void
  removeEvent: (id: string) => void
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  addEvent: (type, lat, lng) => set((s) => ({
    events: [...s.events, {
      id:        `${Date.now()}-${Math.random()}`,
      type, lat, lng,
      timestamp: Date.now(),
    }],
  })),
  removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
}))
