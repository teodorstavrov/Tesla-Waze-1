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
                ? 'rgba(200,200,210,0.10)'
                : 'rgba(230,230,240,0.07)',
              boxShadow: evOpen
                ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 16px rgba(0,0,0,0.28)'
                : 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 24px rgba(0,0,0,0.32)',
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
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      {/* Battery body */}
      <rect x="2" y="11" width="30" height="20" rx="4.5"
            fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.82)" strokeWidth="2.2"/>
      {/* Battery tip */}
      <path d="M32 17.5v7" stroke="rgba(255,255,255,0.82)" strokeWidth="3.2" strokeLinecap="round"/>
      {/* Green fill */}
      <rect x="4.5" y="13.5" width="23" height="15" rx="3" fill="#22c55e" opacity="0.88"/>
      {/* Lightning bolt — white */}
      <path d="M19.5 16l-4 6.5h4.5l-2.5 7.5 8-9.5h-5l2.5-4.5z"
            fill="white" opacity="0.97"/>
    </svg>
  )
}
