/**
 * EVStationsPanel — shows 10 nearest EV stations sorted by distance.
 * Top-right header: top 5 brands by count in the area.
 * Tapping a station starts navigation to it.
 */
import { useEffect, useCallback } from 'react'
import { useState }               from 'react'
import { haversine }              from '@/lib/haversine'
import { useRoute }               from '@/features/route/hooks/useRoute'
import type { EVStation }         from '@/features/ev/types'

interface Props {
  stations: EVStation[]
  onClose:  () => void
}

interface StationWithDist extends EVStation {
  distanceM: number
}

export function EVStationsPanel({ stations, onClose }: Props) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const { calculate } = useRoute()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5_000, maximumAge: 10_000 },
    )
  }, [])

  // Sort all stations by distance
  const sorted: StationWithDist[] = stations
    .map((s) => ({
      ...s,
      distanceM: userPos
        ? haversine(userPos.lat, userPos.lng, s.position.lat, s.position.lng)
        : Infinity,
    }))
    .sort((a, b) => a.distanceM - b.distanceM)

  // Top 5 brands by count (from all sorted stations)
  const brandCounts = new Map<string, number>()
  for (const s of sorted) {
    const brand = s.operator || (s.isTesla ? 'Tesla' : 'Друг')
    if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
  }
  const top5Brands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top 10 nearest stations (no filter)
  const top10 = sorted.slice(0, 10)

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
      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[999]"
      style={{ width: 'min(400px, calc(100vw - 32px))' }}
    >
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-3 py-2.5 border-b border-tesla-border gap-3">
          {/* Title */}
          <div className="flex flex-col justify-center pt-0.5">
            <span className="text-[13px] font-semibold text-tesla-text">Зарядни станции</span>
            <button
              onClick={onClose}
              className="text-[11px] text-tesla-subtle mt-1 text-left"
            >
              Затвори
            </button>
          </div>

          {/* Top 5 brands by count */}
          <div className="flex flex-col gap-0.5 items-end flex-shrink-0">
            {top5Brands.map(([brand, count]) => (
              <div key={brand} className="flex items-center gap-1.5">
                <span className="text-[11px] text-tesla-subtle truncate max-w-[120px]">{brand}</span>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: brand === 'Tesla' ? '#e31937' : '#f5a623' }}
                >
                  ×{count}
                </span>
              </div>
            ))}
            {top5Brands.length === 0 && (
              <span className="text-[11px] text-tesla-subtle">—</span>
            )}
          </div>
        </div>

        {/* Station list */}
        <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
          {!userPos && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Определяне на позиция…
            </div>
          )}
          {userPos && top10.length === 0 && (
            <div className="px-4 py-4 text-[12px] text-tesla-subtle text-center">
              Няма станции
            </div>
          )}
          {top10.map((s, i) => (
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
                    <span className="text-green-400 ml-1">· {s.availablePorts} св.</span>
                  )}
                </div>
                <div className="text-[12px] font-semibold mt-0.5" style={{ color: '#f5a623' }}>
                  {formatDist(s.distanceM)}
                </div>
              </div>

              {/* Ports + navigate icon */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-[11px] text-tesla-subtle">{s.totalPorts} порта</div>
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
