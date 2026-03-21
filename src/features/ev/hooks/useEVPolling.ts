/**
 * EV station fetching triggered by map movement.
 *
 * Rules:
 * 1. First call: fires IMMEDIATELY (no debounce) — stations load even while driving.
 * 2. Subsequent calls: debounced 800ms.
 * 3. Coverage check: if current viewport bbox is fully inside the last fetched
 *    expanded bbox (with 10% inset tolerance), the fetch is skipped entirely.
 * 4. Fetch bbox is expanded 40% in each direction — larger window = fewer refetches.
 * 5. Stale-response guard: each fetch increments a module-level version counter.
 *    If a response arrives for an older version it is silently discarded.
 * 6. On empty response: existing stations are preserved (no clear).
 * 7. On error: existing stations remain visible; only the error string is updated.
 * 8. Silent refresh: loadingBackground=true when data already exists (no spinner).
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Map as LMap } from 'leaflet'
import { fetchStations } from '../api'
import { useEVStore }    from '../store'
import type { BoundingBox } from '../types'

const DEBOUNCE_MS     = 800
const EXPAND_FACTOR   = 0.40   // expand viewport 40% in each direction
const INSET_TOLERANCE = 0.10   // 10% inset — viewport must be this far inside coverage to skip

// ── Module-level request version counter (singleton, never reset) ─────────────
let _requestVersion = 0
function nextVersion(): number { return ++_requestVersion }
function currentVersion(): number { return _requestVersion }

// ── Helpers ───────────────────────────────────────────────────────────────────

function expandBbox(bbox: BoundingBox, factor: number): BoundingBox {
  const latSpan = bbox.north - bbox.south
  const lngSpan = bbox.east  - bbox.west
  return {
    north: bbox.north + latSpan * factor,
    south: bbox.south - latSpan * factor,
    east:  bbox.east  + lngSpan * factor,
    west:  bbox.west  - lngSpan * factor,
  }
}

/**
 * Returns true if `inner` is fully inside `outer` with an inset shrink applied
 * to `outer` (so the inner must be well inside, not just touching the edge).
 */
function isInsideCoverage(
  inner: BoundingBox,
  outer: BoundingBox,
  inset: number,
): boolean {
  const latSpan = outer.north - outer.south
  const lngSpan = outer.east  - outer.west
  const insetLat = latSpan * inset
  const insetLng = lngSpan * inset
  return (
    inner.north <= outer.north - insetLat &&
    inner.south >= outer.south + insetLat &&
    inner.east  <= outer.east  - insetLng &&
    inner.west  >= outer.west  + insetLng
  )
}

function viewportBbox(map: LMap): BoundingBox {
  const b = map.getBounds()
  return {
    north: b.getNorth(),
    south: b.getSouth(),
    east:  b.getEast(),
    west:  b.getWest(),
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEVPolling() {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedOnce = useRef(false)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const doFetch = useCallback(async (map: LMap) => {
    const viewport  = viewportBbox(map)
    const fetchBbox = expandBbox(viewport, EXPAND_FACTOR)

    // ── Stale-response guard ──────────────────────────────────────────────────
    const myVersion = nextVersion()

    const store = useEVStore.getState()
    const hasData = Object.keys(store.entitiesById).length > 0

    if (hasData) {
      store.setLoadingBackground(true)
    } else {
      store.setLoadingInitial(true)
    }
    store.setError(null)

    console.log('[EV] fetch started', { requestId: myVersion, bbox: fetchBbox })

    try {
      const response = await fetchStations(fetchBbox)

      // Check for stale response before applying
      if (myVersion !== currentVersion()) {
        console.log('[EV] fetch ignored', {
          reason: 'stale response',
          myVersion,
          currentVersion: currentVersion(),
        })
        return
      }

      const { stations } = response

      if (stations.length === 0) {
        console.warn('[EV] empty response ignored', { requestId: myVersion })
        // Do NOT clear existing stations — keep whatever we had
        return
      }

      const merged = stations.length
      store.mergeStations(stations)
      store.setCoverageBbox(fetchBbox)

      console.log('[EV] fetch success', { requestId: myVersion, count: stations.length, merged })
    } catch (err) {
      if (myVersion !== currentVersion()) return  // stale — ignore error too
      store.setError(err instanceof Error ? err.message : 'Failed to load stations')
      // Existing stations remain visible
    } finally {
      if (myVersion === currentVersion()) {
        store.setLoadingInitial(false)
        store.setLoadingBackground(false)
      }
    }
  }, [])

  const trigger = useCallback((map: LMap) => {
    if (!loadedOnce.current) {
      // First call: immediate, no debounce
      loadedOnce.current = true
      void doFetch(map)
      return
    }

    // Subsequent calls: check coverage before scheduling
    const viewport = viewportBbox(map)
    const store    = useEVStore.getState()

    if (store.coverageBbox && isInsideCoverage(viewport, store.coverageBbox, INSET_TOLERANCE)) {
      console.log('[EV] fetch skipped', {
        reason: 'inside cached coverage',
        coverage: store.coverageBbox,
      })
      return
    }

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void doFetch(map), DEBOUNCE_MS)
  }, [doFetch])

  return { trigger }
}
