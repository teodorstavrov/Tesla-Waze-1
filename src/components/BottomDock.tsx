/**
 * BottomDock — action buttons fixed at bottom-right.
 * Сигнал (red pill, pulsing) + Зарядни (green pill).
 * Cancel navigation strip stays centred at bottom when route is active.
 * Optimised for Tesla touchscreen.
 */
import { useState, useCallback } from 'react'
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

  const cancelNav = useCallback(() => {
    setRoute(null)
    setEvOpen(false)
  }, [setRoute])

  const toggleEv = useCallback(() => setEvOpen((o) => !o), [])

  return (
    <>
      {/* EV panel backdrop */}
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

      {/* Cancel navigation — centred at bottom */}
      {route && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center gap-1.5"
        >
          <div className="glass-card px-4 py-1.5 text-[13px] font-bold text-tesla-text tracking-wide">
            {formatDist(route.distanceM)}
            <span className="opacity-50 font-normal mx-1">·</span>
            {formatDur(route.durationS)}
          </div>
          <button
            onClick={cancelNav}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); cancelNav() }}
            className="glass-card flex items-center gap-2 px-5 h-10 active:scale-95 transition-transform duration-100 select-none"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#e31937" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-[12px] font-semibold text-tesla-text">Спри навигацията</span>
          </button>
        </div>
      )}

      {/* Action buttons — fixed column at bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom: 30,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          zIndex: 1000,
          alignItems: 'flex-end',
        }}
      >
        {/* Зарядни button */}
        <button
          onClick={toggleEv}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); toggleEv() }}
          aria-label="Зарядни станции"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: evOpen ? 'rgba(5,140,90,0.95)' : 'rgba(16,185,129,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(80,255,180,0.45)',
            borderRadius: 100,
            padding: '0 26px 0 20px',
            height: 60,
            cursor: 'pointer',
            boxShadow: evOpen
              ? '0 2px 12px rgba(16,185,129,0.3)'
              : '0 4px 20px rgba(16,185,129,0.45)',
            transition: 'all 0.15s ease',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            willChange: 'transform',
          }}
        >
          <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="16" height="11" rx="2"/>
              <path d="M18 11h2a1 1 0 011 1v2a1 1 0 01-1 1h-2"/>
              <path d="M7 11l2 2-2 2M11 11v4"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'white', letterSpacing: '0.3px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            Зарядни
          </span>
        </button>

        {/* Сигнал button (with its own submenu + toast) */}
        <ReportButton map={map} />
      </div>
    </>
  )
}
