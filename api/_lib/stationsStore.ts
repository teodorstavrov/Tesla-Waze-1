/**
 * Redis-backed EV station store.
 *
 * Stations are stored in a single Redis hash:
 *   Key:   tesla-waze:ev-stations
 *   Field: station.id
 *   Value: JSON (raw field stripped)
 *
 * A separate string key tracks when the last full sync was done.
 */
import { redis } from './redis.js'
import type { EVStation } from './types.js'

const STATIONS_KEY  = 'tesla-waze:ev-stations'
const SYNCED_AT_KEY = 'tesla-waze:ev-stations:synced-at'

function strip(s: EVStation): EVStation {
  const { raw: _raw, ...rest } = s
  return rest as EVStation
}

export const stationsStore = {
  async getAll(): Promise<EVStation[]> {
    const hash = await redis.hgetall<Record<string, EVStation>>(STATIONS_KEY)
    if (!hash) return []
    return Object.values(hash)
  },

  /** Replace the entire station dataset atomically. */
  async replaceAll(stations: EVStation[]): Promise<void> {
    if (!stations.length) return
    const fields: Record<string, EVStation> = {}
    for (const s of stations) fields[s.id] = strip(s)
    const pipe = redis.pipeline()
    pipe.del(STATIONS_KEY)
    pipe.hset(STATIONS_KEY, fields)
    await pipe.exec()
  },

  async getLastSync(): Promise<number | null> {
    const ts = await redis.get<number>(SYNCED_AT_KEY)
    return ts ?? null
  },

  async setLastSync(ts: number): Promise<void> {
    await redis.set(SYNCED_AT_KEY, ts)
  },

  async count(): Promise<number> {
    return redis.hlen(STATIONS_KEY)
  },
}
