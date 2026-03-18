/**
 * Simple in-memory TTL cache.
 *
 * On Vercel, serverless instances are warm for a period — this gives us
 * meaningful cache hits within a single warm instance. The abstraction
 * is designed so it can be swapped for Redis later without changing callers.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  /** Evict expired entries — call periodically if needed. */
  prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

export const cache = new MemoryCache()

// TTLs
export const TTL_TESLA_MS    = 5 * 60 * 1000   // 5 min — dataset rarely changes
export const TTL_OCM_MS      = 2 * 60 * 1000   // 2 min
export const TTL_OVERPASS_MS = 3 * 60 * 1000   // 3 min
