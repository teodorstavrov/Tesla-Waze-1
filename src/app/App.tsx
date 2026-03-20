import { useState, useCallback, useRef, useEffect } from 'react'
import type { Map as LMap } from 'leaflet'

import { MapShell }            from '@/components/MapShell'
import { EVMarkers }           from '@/components/EVMarkers'
import { EventMarkers }        from '@/components/EventMarkers'
import { RouteLayer }          from '@/components/RouteLayer'
import { HeadingArrow }        from '@/components/HeadingArrow'
import { BottomDock }          from '@/components/BottomDock'
import { ThemeToggle }         from '@/components/ThemeToggle'
import { ZoomControls }        from '@/components/ZoomControls'
import { LocationButton }      from '@/components/LocationButton'
import { SearchBar }           from '@/components/SearchBar'
import { FloatingTitleCard }   from '@/components/FloatingTitleCard'
import { FloatingStatsCard }   from '@/components/FloatingStatsCard'
import { LoadingOverlay }      from '@/components/LoadingOverlay'
import { ErrorBanner }         from '@/components/ErrorBanner'
import { SirenOverlay }        from '@/components/SirenOverlay'
import { ConfirmEventPrompt }  from '@/components/ConfirmEventPrompt'

import { useEVStore }                              from '@/features/ev/store'
import { useEVPolling }                            from '@/features/ev/hooks/useEVPolling'
import { useAutoRefresh }                          from '@/features/ev/hooks/useAutoRefresh'
import { useEventPolling }                         from '@/features/events/hooks/useEventPolling'
import { applyFilter } from '@/features/ev/selectors'
import { useRouteStore }                           from '@/features/route/store'
import { useRoute }                                from '@/features/route/hooks/useRoute'
import { useEventStore }                           from '@/features/events/store'
import type { ReportedEvent }                      from '@/features/events/types'
import { useThemeStore }                           from '@/features/theme/store'
import { useSunTheme }                             from '@/features/theme/useSunTheme'
import { useProximityAlerts, unlockAudio } from '@/features/alerts/useProximityAlerts'

export function App() {
  const [map, setMap]    = useState<LMap | null>(null)
  const mapRef           = useRef<LMap | null>(null)
  const { trigger }             = useEVPolling()
  const { trigger: triggerEv }  = useEventPolling()
  const [siren,        setSiren]        = useState(false)
  const [confirmEvent, setConfirmEvent] = useState<ReportedEvent | null>(null)

  // Unlock speech synthesis + AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      // AudioContext warm-up (resume so it's ready for siren)
      unlockAudio()
      // Speech synthesis unlock — only if API is available and voices are loaded
      if (window.speechSynthesis) {
        const tryUnlock = () => {
          const u = new SpeechSynthesisUtterance('')
          u.volume = 0
          try { window.speechSynthesis.speak(u) } catch { /* ignore */ }
        }
        if (window.speechSynthesis.getVoices().length > 0) {
          tryUnlock()
        } else {
          window.speechSynthesis.addEventListener('voiceschanged', tryUnlock, { once: true })
        }
      }
    }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click',      unlock, { once: true })
  }, [])

  const handlePolice    = useCallback(() => setSiren(true), [])
  const handleNearEvent = useCallback((ev: ReportedEvent) => setConfirmEvent(ev), [])
  useProximityAlerts({ onPolice: handlePolice, onNearEvent: handleNearEvent })

  // ── Popup / panel Navigate button ──────────────────────────────────────────
  const { calculate } = useRoute()
  useEffect(() => {
    const handler = (e: Event) => {
      const { lat, lng, name } = (e as CustomEvent<{ lat: number; lng: number; name: string }>).detail
      const dest = { lat, lng, label: name }
      const fallbackOrigin = () => {
        const c = mapRef.current?.getCenter()
        return { lat: c?.lat ?? lat, lng: c?.lng ?? lng, label: 'Моята локация' }
      }

      if (!navigator.geolocation) { calculate(fallbackOrigin(), dest); return }

      let settled = false
      const timer = setTimeout(() => {
        if (!settled) { settled = true; calculate(fallbackOrigin(), dest) }
      }, 5_000)

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return
          settled = true; clearTimeout(timer)
          calculate({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Моята локация' }, dest)
        },
        () => {
          if (settled) return
          settled = true; clearTimeout(timer)
          calculate(fallbackOrigin(), dest)
        },
        // maximumAge: 60s — while driving there's always a recent cached position
        { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60_000 },
      )
    }
    window.addEventListener('ev:navigate', handler)
    return () => window.removeEventListener('ev:navigate', handler)
  }, [calculate])

  const removeEvent = useEventStore((s) => s.removeEvent)

  // ── Theme ──────────────────────────────────────────────────────────────────
  useSunTheme()
  const isDark       = useThemeStore((s) => s.isDark)
  const toggleTheme  = useThemeStore((s) => s.toggle)

  // ── EV Store ───────────────────────────────────────────────────────────────
  const stations      = useEVStore((s) => s.stations)
  const loading       = useEVStore((s) => s.loading)
  const error         = useEVStore((s) => s.error)
  const filterMode    = useEVStore((s) => s.filterMode)
  const setError      = useEVStore((s) => s.setError)

  // ── Route & Events ─────────────────────────────────────────────────────────
  const route  = useRouteStore((s) => s.route)
  const events = useEventStore((s) => s.events)

  // ── Derived — async so heavy route filtering never blocks the main thread ──
  const [filteredStations, setFilteredStations] = useState(stations)
  useEffect(() => {
    let cancelled = false
    // Yield to the browser first, then compute (prevents Page Unresponsive)
    const id = setTimeout(() => {
      if (!cancelled) setFilteredStations(applyFilter(stations, filterMode, route))
    }, 0)
    return () => { cancelled = true; clearTimeout(id) }
  }, [stations, filterMode, route])

  useAutoRefresh(map, trigger)

  const handleMapReady = useCallback((m: LMap) => {
    setMap(m)
    mapRef.current = m
    trigger(m)
    triggerEv(m)
  }, [trigger, triggerEv])

  const handleBoundsChange = useCallback((m: LMap) => {
    trigger(m)
    triggerEv(m)
  }, [trigger, triggerEv])
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

      {/* Search bar — top center */}
      <SearchBar map={map} onPlace={handlePlace} />

      {/* Floating UI */}
      <FloatingTitleCard loading={loading} />
      <FloatingStatsCard stations={filteredStations} loading={loading} />

      {/* Controls */}
      <ThemeToggle  isDark={isDark} onToggle={toggleTheme} />
      <LocationButton map={map} />
      <ZoomControls   map={map} />

      {/* Bottom dock: Signal button + EV stations button */}
      <BottomDock map={map} stations={filteredStations} />

      {/* Status */}
      <LoadingOverlay visible={loading && stations.length === 0} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} onRetry={handleRetry} />

      {/* Police siren flash */}
      <SirenOverlay active={siren} onDone={() => setSiren(false)} />

      {/* 5 m proximity confirmation prompt */}
      {confirmEvent && (
        <ConfirmEventPrompt
          event={confirmEvent}
          onStillThere={() => setConfirmEvent(null)}
          onRemove={() => {
            removeEvent(confirmEvent.id)
            setConfirmEvent(null)
          }}
        />
      )}
    </div>
  )
}
