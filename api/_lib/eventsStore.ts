/**
 * Shared in-memory event store for Vercel serverless functions.
 * globalThis survives multiple invocations within the same warm Lambda instance,
 * so all handlers (index.ts + [id].ts) share the same array.
 */

interface StoredEvent {
  id:        string
  type:      string
  lat:       number
  lng:       number
  timestamp: number
}

const g = globalThis as Record<string, unknown>
if (!g.__eventsStore) g.__eventsStore = [] as StoredEvent[]

const store = () => g.__eventsStore as StoredEvent[]

export const eventsStore = {
  getAll: (): StoredEvent[]       => store().slice(),
  add:    (ev: StoredEvent): void => { store().push(ev) },
  remove: (id: string):     void  => {
    g.__eventsStore = store().filter((e) => e.id !== id)
  },
}
