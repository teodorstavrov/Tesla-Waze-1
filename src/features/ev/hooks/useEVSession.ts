/**
 * Loads all EV stations for Bulgaria once per browser session.
 * No viewport polling — data comes from Redis cache (instant after first sync).
 * Replaces useEVPolling + useAutoRefresh.
 */
import { useEffect, useRef } from 'react'
import { useEVStore }        from '../store'

export function useEVSession() {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    const { setLoading, setError, setStations, setLastResponse } = useEVStore.getState()
    setLoading(true)

    fetch('/api/ev/stations')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setStations(data.stations ?? [])
        setLastResponse(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load stations')
        setLoading(false)
      })
  }, [])
}
