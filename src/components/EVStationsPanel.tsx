/**
 * EVStationsPanel — shows 10 nearest EV stations sorted by distance.
 * Brand filter, power filter, and favorites at top. Tapping a station starts navigation to it.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { haversine }        from '@/lib/haversine'
import type { EVStation }   from '@/features/ev/types'
import { loadFavorites, toggleFavorite } from '@/lib/favorites'

interface Props {
  stations: EVStation[]
  onClose:  () => void
}

interface StationWithDist extends EVStation {
  distanceM: number
}

export function EVStationsPanel({ stations, onClose }: Props) {
  const [userPos,     setUserPos]     = useState<{ lat: number; lng: number } | null>(null)
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [powerFilter, setPowerFilter] = useState<'all' | 'fast' | 'ultrafast'>('all')
  const [favorites,   setFavorites]   = useState<Set<string>>(() => loadFavorites())
  const [showFavOnly, setShowFavOnly] = useState(false)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const tryGet = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          userPosRef.current = p
          setUserPos(p)
        },
        () => { if (!cancelled && highAccuracy) tryGet(false) },
        { enableHighAccuracy: highAccuracy, timeout: 4_000, maximumAge: 10_000 },
      )
    }
    tryGet(true)
    return () => { cancelled = true }
  }, [])

  // Sort all stations by distance, take top 50 for brand extraction
  const sorted: StationWithDist[] = stations
    .map((s) => ({
      ...s,
      distanceM: userPos
        ? haversine(userPos.lat, userPos.lng, s.position.lat, s.position.lng)
        : Infinity,
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 50)

  // Apply power filter
  const powerFiltered = sorted.filter((s) => {
    if (powerFilter === 'fast')      return s.connectors.some((c) => c.powerKw >= 50)
    if (powerFilter === 'ultrafast') return s.connectors.some((c) => c.powerKw >= 150)
    return true
  })

  // Unique brands from power-filtered list
  const brands = ['all', ...Array.from(new Set(
    powerFiltered.map((s) => s.operator).filter((o): o is string => !!o && o.length > 0)
  ))]

  // Apply favorites filter then brand filter, limit to 10
  const displayList = (showFavOnly ? powerFiltered.filter((s) => favorites.has(s.id)) : powerFiltered)
    .filter((s) => brandFilter === 'all' || s.operator === brandFilter)
    .slice(0, 10)

  // Dispatch ev:navigate — App.tsx handles it with GPS + map-center fallback
  const navigateTo = useCallback((station: StationWithDist) => {
    onClose()
    window.dispatchEvent(new CustomEvent('ev:navigate', {
      detail: { lat: station.position.lat, lng: station.position.lng, name: station.name },
    }))
  }, [onClose])

  return (
    <div
      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[999]"
      style={{ width: 'min(400px, calc(100vw - 32px))' }}
    >
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-tesla-border">
          <span className="text-[13px] font-semibold text-tesla-text">Близки станции</span>
          <button
            onClick={onClose}
            className="text-[12px] text-tesla-subtle hover:text-tesla-text px-2 py-1"
          >
            Затвори
          </button>
        </div>

        {/* Power filter */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-tesla-border">
          {(['all', 'fast', 'ultrafast'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPowerFilter(p)}
              className={`flex-shrink-0 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all
                ${powerFilter === p
                  ? 'bg-tesla-accent text-white'
                  : 'bg-tesla-surface text-tesla-subtle border border-tesla-border'
                }`}
            >
              {p === 'all' ? 'Всички kW' : p === 'fast' ? '⚡ >50 kW' : '⚡⚡ >150 kW'}
            </button>
          ))}
          <button
            onClick={() => setShowFavOnly((v) => !v)}
            className={`flex-shrink-0 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all ml-auto
              ${showFavOnly
                ? 'bg-yellow-500 text-white'
                : 'bg-tesla-surface text-tesla-subtle border border-tesla-border'
              }`}
          >
            ★ Любими
          </button>
        </div>

        {/* Brand filter */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-tesla-border"
             style={{ scrollbarWidth: 'none' }}>
          {brands.slice(0, 8).map((brand) => (
            <button
              key={brand}
              onClick={() => setBrandFilter(brand)}
              className={`flex-shrink-0 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all
                ${brandFilter === brand
                  ? 'bg-tesla-accent text-white'
                  : 'bg-tesla-surface text-tesla-subtle border border-tesla-border'
                }`}
            >
              {brand === 'all' ? 'Всички' : brand}
            </button>
          ))}
        </div>

        {/* Station list */}
        <div className="overflow-y-auto" style={{ maxHeight: '320px', touchAction: 'pan-y' }}>
          {!userPos && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Определяне на позиция…
            </div>
          )}
          {userPos && displayList.length === 0 && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Няма станции
            </div>
          )}
          {displayList.map((s, i) => (
            <div
              key={s.id}
              className="w-full flex items-center gap-3 px-3 border-b border-tesla-border last:border-0"
              style={{ height: '60px' }}
            >
              <button
                onClick={() => navigateTo(s)}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); navigateTo(s) }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left active:bg-tesla-surface"
              >
                <span className="text-[11px] font-bold text-tesla-subtle w-4 flex-shrink-0">
                  {i + 1}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: s.isTesla ? '#e31937' : '#3d9df3' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-tesla-text truncate">{s.name}</div>
                  <div className="text-[11px] text-tesla-subtle truncate">
                    {s.operator || (s.isTesla ? 'Tesla' : 'EV')}
                    {s.availablePorts > 0 && (
                      <span className="text-green-400 ml-1">· {s.availablePorts} св.</span>
                    )}
                  </div>
                  <div className="text-[12px] font-semibold mt-0.5" style={{ color: '#f5a623' }}>
                    {formatDist(s.distanceM)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-[11px] text-tesla-subtle">{s.totalPorts} порта</div>
                  <NavIcon />
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setFavorites(toggleFavorite(s.id)) }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setFavorites(toggleFavorite(s.id)) }}
                className="text-[18px] flex-shrink-0 w-8 h-8 flex items-center justify-center"
                style={{ color: favorites.has(s.id) ? '#f5a623' : '#3a3a3a' }}
              >
                {favorites.has(s.id) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NavIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-tesla-accent">
      <path d="M2 14L8 2l6 12-6-3-6 3z" stroke="currentColor" strokeWidth="1.4"
            strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function formatDist(m: number): string {
  if (!isFinite(m)) return '—'
  return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`
}
