import { create } from 'zustand'
import type { ReportedEvent, EventType } from './types'

const API = '/api/events'

interface EventState {
  events:      ReportedEvent[]
  addEvent:    (type: EventType, lat: number, lng: number) => Promise<void>
  removeEvent: (id: string) => Promise<void>
  loadEvents:  () => Promise<void>
}

export const useEventStore = create<EventState>((set) => ({
  events: [],

  loadEvents: async () => {
    try {
      const res = await fetch(API)
      if (res.ok) {
        const data = await res.json()
        set({ events: data.events as ReportedEvent[] })
      }
    } catch { /* offline / dev without api server */ }
  },

  addEvent: async (type, lat, lng) => {
    const ev: ReportedEvent = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type, lat, lng,
      timestamp: Date.now(),
    }
    // Optimistic local update first
    set((s) => ({ events: [...s.events, ev] }))
    try {
      await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(ev),
      })
    } catch { /* already in local state */ }
  },

  removeEvent: async (id) => {
    // Optimistic local update first
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
    } catch { /* already removed locally */ }
  },
}))

// Load on startup, then poll every 30 s to pick up other users' reports
useEventStore.getState().loadEvents()
setInterval(() => useEventStore.getState().loadEvents(), 30_000)
