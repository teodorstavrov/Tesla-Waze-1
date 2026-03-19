import { useState, useCallback, useRef, useEffect } from 'react'
import type { Map as LMap } from 'leaflet'

import { MapShell }            from '@/components/MapShell'
import { EVMarkers }           from '@/components/EVMarkers'
import { EventMarkers }        from '@/components/EventMarkers'
import { RouteLayer }          from '@/components/RouteLayer'
import { HeadingArrow }        from '@/components/HeadingArrow'
import { RoutePanel }          from '@/components/RoutePanel'
import { ReportButton }        from '@/components/ReportButton'
import { ThemeToggle }         from '@/components/ThemeToggle'
import { ZoomControls }        from '@/components/ZoomControls'
import { LocationButton }      from '@/components/LocationButton'
import { SearchBar }           from '@/components/SearchBar'
import { FloatingTitleCard }   from '@/components/FloatingTitleCard'
import { FloatingStatsCard }   from '@/components/FloatingStatsCard'
import { FloatingFiltersCard } from '@/components/FloatingFiltersCard'
import { LoadingOverlay }      from '@/components/LoadingOverlay'
import { ErrorBanner }         from '@/components/ErrorBanner'
import { SirenOverlay }        from '@/components/SirenOverlay'

import { useEVStore }                              from '@/features/ev/store'
import { useEVPolling }                            from '@/features/ev/hooks/useEVPolling'
import { useAutoRefresh }                          from '@/features/ev/hooks/useAutoRefresh'
import { applyFilter, sourceCounts, filterCounts } from '@/features/ev/selectors'
import { useRouteStore }                           from '@/features/route/store'
import { useEventStore }                           from '@/features/events/store'
import { useThemeStore }                           from '@/features/theme/store'
import { useProximityAlerts }                      from '@/features/alerts/useProximityAlerts'

export function App() {
  const [map, setMap]    = useState<LMap | null>(null)
  const mapRef           = useRef<LMap | null>(null)
  const { trigger }      = useEVPolling()
  const [siren, setSiren] = useState(false)

  // Unlock speech synthesis on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })
  }, [])

  const handlePolice = useCallback(() => setSiren(true), [])
  useProximityAlerts({ onPolice: handlePolice })

  // ── Theme ──────────────────────────────────────────────────────────────────
  const isDark       = useThemeStore((s) => s.isDark)
  const toggleTheme  = useThemeStore((s) => s.toggle)

  // ── EV Store ───────────────────────────────────────────────────────────────
  const stations      = useEVStore((s) => s.stations)
  const loading       = useEVStore((s) => s.loading)
  const error         = useEVStore((s) => s.error)
  const filterMode    = useEVStore((s) => s.filterMode)
  const lastResponse  = useEVStore((s) => s.lastResponse)
  const setFilterMode = useEVStore((s) => s.setFilterMode)
  const setError      = useEVStore((s) => s.setError)

  // ── Route & Events ─────────────────────────────────────────────────────────
  const route  = useRouteStore((s) => s.route)
  const events = useEventStore((s) => s.events)

  // ── Derived ────────────────────────────────────────────────────────────────
  const counts           = sourceCounts(stations)
  const fCounts          = filterCounts(stations)
  const filteredStations = applyFilter(stations, filterMode)

  useAutoRefresh(map, trigger)

  const handleMapReady = useCallback((m: LMap) => {
    setMap(m)
    mapRef.current = m
    trigger(m)
  }, [trigger])

  const handleBoundsChange = useCallback((m: LMap) => { trigger(m) }, [trigger])
  const handleRetry        = useCallback(() => {
    setError(null)
    if (mapRef.current) trigger(mapRef.current)
  }, [trigger, setError])
  const handlePlace = useCallback((_lat: number, _lng: number) => {
    if (mapRef.current) trigger(mapRef.current)
  }, [trigger])

  return (
    // Apply theme class so CSS tile filter can target it
    <div className={`relative w-full h-full overflow-hidden bg-tesla-bg ${isDark ? 'theme-dark' : 'theme-light'}`}>
      {/* Map */}
      <MapShell isDark={isDark} onMapReady={handleMapReady} onBoundsChange={handleBoundsChange} />

      {/* Markers */}
      <EVMarkers   map={map} stations={filteredStations} route={route} />
      <EventMarkers map={map} events={events} />

      {/* Route */}
      <RouteLayer map={map} route={route} />

      {/* Live position + heading arrow */}
      <HeadingArrow map={map} />

      {/* Panels */}
      <RoutePanel />

      {/* Search bar — top center */}
      <SearchBar map={map} onPlace={handlePlace} />

      {/* Floating UI */}
      <FloatingTitleCard loading={loading} />
      <FloatingStatsCard counts={counts} loading={loading} lastResponse={lastResponse} />
      <FloatingFiltersCard filterMode={filterMode} onFilterChange={setFilterMode} stationCounts={fCounts} />

      {/* Controls */}
      <ThemeToggle  isDark={isDark} onToggle={toggleTheme} />
      <ReportButton map={map} />
      <LocationButton map={map} />
      <ZoomControls   map={map} />

      {/* Status */}
      <LoadingOverlay visible={loading && stations.length === 0} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} onRetry={handleRetry} />

      {/* Police siren flash */}
      <SirenOverlay active={siren} onDone={() => setSiren(false)} />
    </div>
  )
}
