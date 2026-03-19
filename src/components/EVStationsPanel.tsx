/**
 * EVStationsPanel — shows 10 nearest EV stations sorted by distance.
 * Brand filter at top. Tapping a station starts navigation to it.
 */
import { useState, useEffect, useCallback } from 'react'
import { haversine }        from '@/lib/haversine'
import { useRoute }         from '@/features/route/hooks/useRoute'
import type { EVStation }   from '@/features/ev/types'

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
  const { calculate } = useRoute()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5_000, maximumAge: 10_000 },
    )
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

  // Unique brands from top 50
  const brands = ['all', ...Array.from(new Set(
    sorted.map((s) => s.operator).filter((o): o is string => !!o && o.length > 0)
  ))]

  // Apply brand filter, limit to 10
  const filtered = sorted
    .filter((s) => brandFilter === 'all' || s.operator === brandFilter)
    .slice(0, 10)

  const navigateTo = useCallback((station: StationWithDist) => {
    if (!userPos) return
    onClose()
    calculate(
      { lat: userPos.lat, lng: userPos.lng, label: 'Моята локация' },
      { lat: station.position.lat, lng: station.position.lng, label: station.name },
    )
  }, [userPos, calculate, onClose])

  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]"
      style={{ width: 'min(400px, calc(100vw - 32px))' }}
    >
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-tesla-border">
          <span className="text-[13px] font-semibold text-tesla-text">Зарядни станции</span>
          <button
            onClick={onClose}
            className="text-[12px] text-tesla-subtle hover:text-tesla-text px-2 py-1"
          >
            Затвори
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
        <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
          {!userPos && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Определяне на позиция…
            </div>
          )}
          {userPos && filtered.length === 0 && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Няма станции
            </div>
          )}
          {filtered.map((s, i) => (
            <button
              key={s.id}
              onClick={() => navigateTo(s)}
              className="w-full flex items-center gap-3 px-3 border-b border-tesla-border last:border-0
                         active:bg-tesla-surface text-left"
              style={{ height: '60px' }}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Rank */}
              <span className="text-[11px] font-bold text-tesla-subtle w-4 flex-shrink-0">
                {i + 1}
              </span>

              {/* Brand dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: s.isTesla ? '#e31937' : '#3d9df3' }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-tesla-text truncate">{s.name}</div>
                <div className="text-[11px] text-tesla-subtle truncate">
                  {s.operator || (s.isTesla ? 'Tesla' : 'EV')}
                  {s.availablePorts > 0 && (
                    <span className="text-green-400 ml-1">· {s.availablePorts} свободни</span>
                  )}
                </div>
              </div>

              {/* Distance + navigate icon */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-tesla-text">
                    {formatDist(s.distanceM)}
                  </div>
                  <div className="text-[11px] text-tesla-subtle">{s.totalPorts} порта</div>
                </div>
                <NavIcon />
              </div>
            </button>
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
