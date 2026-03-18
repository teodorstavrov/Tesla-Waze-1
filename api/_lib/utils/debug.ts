/** Helpers for building the _debug payload (dev mode only). */

export function isDev(): boolean {
  return process.env['NODE_ENV'] !== 'production'
}

export function buildDebug(meta: Record<string, unknown>): unknown {
  if (!isDev()) return undefined
  return { ...meta, ts: new Date().toISOString() }
}
