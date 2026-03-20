/**
 * BottomDock — two buttons centered at the bottom.
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
  const h = Math.floor(s / 3600)
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
            onClick={() => setEvOpen((o) => !o)}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="Зарядни станции"
            style={{
              width: 76, height: 76,
              borderRadius: 20,
              background: evOpen
                ? 'linear-gradient(145deg, #1a3a5c, #0f2a45)'
                : 'linear-gradient(145deg, #0f3460, #1a6bb5)',
              boxShadow: evOpen
                ? '0 2px 12px rgba(61,157,243,0.25)'
                : '0 4px 20px rgba(61,157,243,0.45)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              border: '1.5px solid rgba(61,157,243,0.4)',
              transition: 'all 0.15s ease',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <EVIcon />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
              color: '#7ec8f7',
            }}>
              Зарядни
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

function EVIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <defs>
        <linearGradient id="ev-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8f7"/>
          <stop offset="100%" stopColor="#3d9df3"/>
        </linearGradient>
        <linearGradient id="ev-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5bb8f5"/>
          <stop offset="100%" stopColor="#2980d4"/>
        </linearGradient>
      </defs>
      {/* Battery body */}
      <rect x="2" y="9" width="21" height="13" rx="3.5" stroke="url(#ev-body)" strokeWidth="2" fill="rgba(61,157,243,0.12)"/>
      {/* Battery tip */}
      <path d="M23 13v5" stroke="#5bb8f5" strokeWidth="3" strokeLinecap="round"/>
      {/* Lightning bolt */}
      <path d="M14 13.5l-2 4h3.5l-1.5 4.5 5.5-6.5H16l1.5-2z"
            fill="url(#ev-bolt)"/>
    </svg>
  )
}
