/**
 * Typed environment variable access.
 * All env vars must be prefixed VITE_ to be exposed to the client.
 */

export const env = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  openChargeMapKey: import.meta.env.VITE_OPENCHARGEMAP_API_KEY as string | undefined,
  tomtomKey: import.meta.env.VITE_TOMTOM_API_KEY as string | undefined,

  /** API base — empty string means same origin (Vercel/dev proxy) */
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? '',
} as const
