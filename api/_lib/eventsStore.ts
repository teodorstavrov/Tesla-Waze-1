/**
 * Redis-backed event store.
 * All events are stored in a single Redis hash:
 *   Key:   tesla-waze:events
 *   Field: event.id
 *   Value: JSON string of the event
 *
 * This is shared across all Vercel Lambda instances, so every user
 * always sees the same set of markers.
 */
import { redis, EVENTS_KEY } from './redis.js'

export interface StoredEvent {
  id:            string
  type:          string
  lat:           number
  lng:           number
  timestamp:     number
  confirmations: number
}

export const eventsStore = {
  async getAll(): Promise<StoredEvent[]> {
    const hash = await redis.hgetall<Record<string, StoredEvent>>(EVENTS_KEY)
    if (!hash) return []
    return Object.values(hash)
  },

  async add(ev: StoredEvent): Promise<void> {
    await redis.hset(EVENTS_KEY, { [ev.id]: ev })
  },

  async remove(id: string): Promise<void> {
    await redis.hdel(EVENTS_KEY, id)
  },

  async confirm(id: string): Promise<void> {
    const hash = await redis.hgetall<Record<string, StoredEvent>>(EVENTS_KEY)
    if (!hash) return
    const ev = hash[id]
    if (!ev) return
    ev.confirmations = (ev.confirmations ?? 0) + 1
    await redis.hset(EVENTS_KEY, { [id]: ev })
  },
}
