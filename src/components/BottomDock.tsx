/**
 * BottomDock — two buttons centred at the bottom.
 * Left:  Signal report button
 * Right: EV stations button
 * Above: Cancel navigation strip (shown only when route is active)
 */
import { useState } from 'react'
import type { Map as LMap } from 'leaflet'
import type { EVStation }   from '@/features/ev/types'
import { useRouteStore }    from '@/features/route/store'
import { ReportButton }     from './ReportButton'
import { EVStationsPanel }  from './EVStationsPanel'

interface Props {
  map:      LMap | null
  stations: EVStation[]
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} км` : `${Math.round(m)} м`
}

function formatDur(s: number): string {
  const h   = Math.floor(s / 3600)
  const min = Math.round((s % 3600) / 60)
  return h > 0 ? `${h} ч ${min} мин` : `${min} мин`
}

export function BottomDock({ map, stations }: Props) {
  const [evOpen, setEvOpen] = useState(false)
  const route    = useRouteStore((s) => s.route)
  const setRoute = useRouteStore((s) => s.setRoute)

  const cancelNav = () => {
    setRoute(null)
    setEvOpen(false)
  }

  return (
    <>
      {evOpen && (
        <div
          className="fixed inset-0 z-[998]"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); setEvOpen(false) }}
          onClick={() => setEvOpen(false)}
        />
      )}

      {evOpen && (
        <EVStationsPanel stations={stations} onClose={() => setEvOpen(false)} />
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-3">
        {/* Cancel navigation strip */}
        {route && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="glass-card px-4 py-1.5 text-[13px] font-bold text-tesla-text tracking-wide">
              {formatDist(route.distanceM)}
              <span className="opacity-50 font-normal mx-1">·</span>
              {formatDur(route.durationS)}
            </div>
            <button
              onClick={cancelNav}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); cancelNav() }}
              className="glass-card flex items-center gap-2 px-5 h-10
                         active:scale-95 transition-transform duration-100 select-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="#e31937" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] font-semibold text-tesla-text">Спри навигацията</span>
            </button>
          </div>
        )}

        {/* Two main buttons */}
        <div className="flex items-end gap-4">
          <ReportButton map={map} />

          {/* EV stations button */}
          <button
            onClick={(e) => { e.stopPropagation(); setEvOpen((o) => !o) }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setEvOpen((o) => !o) }}
            aria-label="Зарядни станции"
            style={{
              width: 96, height: 96,
              borderRadius: 24,
              background: evOpen
                ? 'rgba(200,200,210,0.18)'
                : 'rgba(230,230,240,0.13)',
              boxShadow: evOpen
                ? 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 16px rgba(0,0,0,0.35)'
                : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              transition: 'all 0.15s ease',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <BatteryIcon />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              ЗАРЯДНИ
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

function BatteryIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      {/* Battery body */}
      <rect x="2" y="10" width="26" height="16" rx="4"
            fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="2"/>
      {/* Battery tip */}
      <path d="M28 15v6" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round"/>
      {/* Green fill */}
      <rect x="4" y="12" width="20" height="12" rx="2.5" fill="#22c55e" opacity="0.85"/>
      {/* Lightning bolt — white */}
      <path d="M17 14l-3 5h3.5l-2 6 6.5-8H18l2-3z"
            fill="white" opacity="0.95"/>
    </svg>
  )
}
