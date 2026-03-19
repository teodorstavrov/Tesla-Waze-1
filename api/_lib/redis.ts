/**
 * Upstash Redis client — shared Redis instance, Tesla-namespaced keys.
 * All event data lives under the hash key EVENTS_KEY so it never
 * collides with other sites using the same Redis database.
 */
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env['UPSTASH_REDIS_REST_URL']!,
  token: process.env['UPSTASH_REDIS_REST_TOKEN']!,
})

/** Redis hash key that stores all reported events for this app */
export const EVENTS_KEY = 'tesla-waze:events'
