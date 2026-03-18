import { useState, useCallback } from 'react'
import type { Map as LMap } from 'leaflet'

import { MapShell }            from '@/components/MapShell'
import { EVMarkers }           from '@/components/EVMarkers'
import { ZoomControls }        from '@/components/ZoomControls'
import { FloatingTitleCard }   from '@/components/FloatingTitleCard'
import { FloatingStatsCard }   from '@/components/FloatingStatsCard'
import { FloatingFiltersCard } from '@/components/FloatingFiltersCard'
import { LoadingOverlay }      from '@/components/LoadingOverlay'
import { ErrorBanner }         from '@/components/ErrorBanner'

import { useEVStore }                           from '@/features/ev/store'
import { useEVPolling }                         from '@/features/ev/hooks/useEVPolling'
import { applyFilter, sourceCounts, filterCounts } from '@/features/ev/selectors'

export function App() {
  const [map, setMap] = useState<LMap | null>(null)
  const { trigger }   = useEVPolling()

  // ── Store ──────────────────────────────────────────────────────────────────
  const stations      = useEVStore((s) => s.stations)
  const loading       = useEVStore((s) => s.loading)
  const error         = useEVStore((s) => s.error)
  const filterMode    = useEVStore((s) => s.filterMode)
  const lastResponse  = useEVStore((s) => s.lastResponse)
  const setFilterMode = useEVStore((s) => s.setFilterMode)
  const setError      = useEVStore((s) => s.setError)

  // ── Derived ────────────────────────────────────────────────────────────────
  const counts           = sourceCounts(stations)
  const fCounts          = filterCounts(stations)
  const filteredStations = applyFilter(stations, filterMode)

  // ── Map callbacks ──────────────────────────────────────────────────────────
  const handleMapReady = useCallback((m: LMap) => {
    setMap(m)
    trigger(m)
  }, [trigger])

  const handleBoundsChange = useCallback((m: LMap) => {
    trigger(m)
  }, [trigger])

  return (
    <div className="relative w-full h-full overflow-hidden bg-tesla-bg">
      {/* Map */}
      <MapShell onMapReady={handleMapReady} onBoundsChange={handleBoundsChange} />

      {/* Markers */}
      <EVMarkers map={map} stations={filteredStations} />

      {/* Floating UI */}
      <FloatingTitleCard loading={loading} />
      <FloatingStatsCard
        counts={counts}
        loading={loading}
        lastResponse={lastResponse}
      />
      <FloatingFiltersCard
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        stationCounts={fCounts}
      />
      <ZoomControls map={map} />

      {/* Status */}
      <LoadingOverlay visible={loading} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </div>
  )
}
