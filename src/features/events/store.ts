import { create } from 'zustand'
import type { ReportedEvent, EventType } from './types'

const API = '/api/events'

export interface EventBBox {
  minLat: number; minLng: number; maxLat: number; maxLng: number
}

interface EventState {
  events:      ReportedEvent[]
  syncError:   boolean          // true when backend is unreachable
  addEvent:     (type: EventType, lat: number, lng: number) => Promise<void>
  removeEvent:  (id: string) => Promise<void>
  confirmEvent: (id: string) => Promise<void>
  loadEvents:   (bbox?: EventBBox) => Promise<void>
}

// Abort any in-flight request before starting a new one
let _eventsAbort: AbortController | null = null

export const useEventStore = create<EventState>((set) => ({
  events:    [],
  syncError: false,

  loadEvents: async (bbox) => {
    // Cancel previous in-flight request
    _eventsAbort?.abort()
    _eventsAbort = new AbortController()
    const { signal } = _eventsAbort

    try {
      const url = bbox
        ? `${API}?minLat=${bbox.minLat}&minLng=${bbox.minLng}&maxLat=${bbox.maxLat}&maxLng=${bbox.maxLng}`
        : API
      const res = await fetch(url, { signal })
      if (res.ok) {
        const data = await res.json()
        set({ events: data.events as ReportedEvent[], syncError: false })
      } else {
        console.warn('[events] API returned', res.status, await res.text())
        set({ syncError: true })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return   // stale request — ignore
      console.warn('[events] fetch failed', err)
      set({ syncError: true })
    }
  },

  addEvent: async (type, lat, lng) => {
    const ev: ReportedEvent = {
      id:            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type, lat, lng,
      timestamp:     Date.now(),
      confirmations: 0,
    }
    set((s) => ({ events: [...s.events, ev] }))
    try {
      const res = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(ev),
      })
      if (!res.ok) console.warn('[events] POST failed', res.status, await res.text())
    } catch (err) {
      console.warn('[events] POST error', err)
    }
  },

  removeEvent: async (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) console.warn('[events] DELETE failed', res.status)
    } catch (err) {
      console.warn('[events] DELETE error', err)
    }
  },

  confirmEvent: async (id: string) => {
    set((s) => ({
      events: s.events.map((e) =>
        e.id === id ? { ...e, confirmations: (e.confirmations ?? 0) + 1 } : e
      ),
    }))
    try {
      await fetch(`${API}/${id}`, { method: 'PATCH' })
    } catch { /* optimistic — ignore */ }
  },
}))

