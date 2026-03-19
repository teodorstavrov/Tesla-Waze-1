import { useState, useCallback, useRef } from 'react'
import type { Map as LMap } from 'leaflet'

import { MapShell }            from '@/components/MapShell'
import { EVMarkers }           from '@/components/EVMarkers'
import { IncidentMarkers }     from '@/components/IncidentMarkers'
import { RouteLayer }          from '@/components/RouteLayer'
import { RoutePanel }          from '@/components/RoutePanel'
import { ZoomControls }        from '@/components/ZoomControls'
import { LocationButton }      from '@/components/LocationButton'
import { SearchBar }           from '@/components/SearchBar'
import { IncidentToggle }      from '@/components/IncidentToggle'
import { FloatingTitleCard }   from '@/components/FloatingTitleCard'
import { FloatingStatsCard }   from '@/components/FloatingStatsCard'
import { FloatingFiltersCard } from '@/components/FloatingFiltersCard'
import { LoadingOverlay }      from '@/components/LoadingOverlay'
import { ErrorBanner }         from '@/components/ErrorBanner'

import { useEVStore }                              from '@/features/ev/store'
import { useEVPolling }                            from '@/features/ev/hooks/useEVPolling'
import { useAutoRefresh }                          from '@/features/ev/hooks/useAutoRefresh'
import { applyFilter, sourceCounts, filterCounts } from '@/features/ev/selectors'
import { useIncidentStore }                        from '@/features/incidents/store'
import { useIncidentPolling }                      from '@/features/incidents/hooks/useIncidentPolling'
import { useRouteStore }                           from '@/features/route/store'

export function App() {
  const [map, setMap]  = useState<LMap | null>(null)
  const mapRef         = useRef<LMap | null>(null)
  const { trigger }    = useEVPolling()
  const { trigger: triggerIncidents } = useIncidentPolling()

  // ── EV Store ───────────────────────────────────────────────────────────────
  const stations      = useEVStore((s) => s.stations)
  const loading       = useEVStore((s) => s.loading)
  const error         = useEVStore((s) => s.error)
  const filterMode    = useEVStore((s) => s.filterMode)
  const lastResponse  = useEVStore((s) => s.lastResponse)
  const setFilterMode = useEVStore((s) => s.setFilterMode)
  const setError      = useEVStore((s) => s.setError)

  // ── Incident Store ─────────────────────────────────────────────────────────
  const incidents           = useIncidentStore((s) => s.incidents)
  const incidentsVisible    = useIncidentStore((s) => s.visible)
  const setIncidentsVisible = useIncidentStore((s) => s.setVisible)

  // ── Route Store ────────────────────────────────────────────────────────────
  const route = useRouteStore((s) => s.route)

  // ── Derived ────────────────────────────────────────────────────────────────
  const counts           = sourceCounts(stations)
  const fCounts          = filterCounts(stations)
  const filteredStations = applyFilter(stations, filterMode)

  // ── Auto-refresh every 2 min while parked ─────────────────────────────────
  useAutoRefresh(map, trigger)

  // ── Map callbacks ──────────────────────────────────────────────────────────
  const handleMapReady = useCallback((m: LMap) => {
    setMap(m)
    mapRef.current = m
    trigger(m)
    triggerIncidents(m)
  }, [trigger, triggerIncidents])

  const handleBoundsChange = useCallback((m: LMap) => {
    trigger(m)
    triggerIncidents(m)
  }, [trigger, triggerIncidents])

  const handleRetry = useCallback(() => {
    setError(null)
    if (mapRef.current) trigger(mapRef.current)
  }, [trigger, setError])

  const handlePlace = useCallback((_lat: number, _lng: number) => {
    if (mapRef.current) {
      trigger(mapRef.current)
      triggerIncidents(mapRef.current)
    }
  }, [trigger, triggerIncidents])

  return (
    <div className="relative w-full h-full overflow-hidden bg-tesla-bg">
      {/* Map */}
      <MapShell onMapReady={handleMapReady} onBoundsChange={handleBoundsChange} />

      {/* Markers */}
      <EVMarkers map={map} stations={filteredStations} route={route} />
      {incidentsVisible && <IncidentMarkers map={map} incidents={incidents} />}

      {/* Route */}
      <RouteLayer map={map} route={route} />
      <RoutePanel />

      {/* Search bar — top center */}
      <SearchBar map={map} onPlace={handlePlace} />

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

      {/* Controls */}
      <IncidentToggle
        visible={incidentsVisible}
        count={incidents.length}
        onToggle={() => setIncidentsVisible(!incidentsVisible)}
      />
      <LocationButton map={map} />
      <ZoomControls   map={map} />

      {/* Status */}
      <LoadingOverlay visible={loading && stations.length === 0} />
      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        onRetry={handleRetry}
      />
    </div>
  )
}
