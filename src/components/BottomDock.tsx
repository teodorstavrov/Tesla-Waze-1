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
      {/* Backdrop — closes EV panel when tapping outside */}
      {evOpen && (
        <div
          className="fixed inset-0 z-[998]"
          onClick={() => setEvOpen(false)}
          onTouchEnd={() => setEvOpen(false)}
        />
      )}

      {/* EV panel — sibling to dock so its absolute position is relative to the app root */}
      {evOpen && (
        <EVStationsPanel stations={stations} onClose={() => setEvOpen(false)} />
      )}

    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
      {/* Cancel navigation strip — only when navigating */}
      {route && (
        <button
          onClick={cancelNav}
          onTouchEnd={(e) => e.stopPropagation()}
          className="glass-card flex items-center gap-2 px-4 h-10
                     active:scale-95 transition-transform duration-100 select-none"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="#e31937" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span className="text-[12px] font-semibold text-tesla-text">Спри навигацията</span>
        </button>
      )}

      {/* Two main buttons */}
      <div className="flex items-end gap-3">
        <ReportButton map={map} />

        {/* EV stations button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setEvOpen((o) => !o)}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="Зарядни станции"
            title="Зарядни станции"
            className={`w-16 h-16 glass-card flex flex-col items-center justify-center gap-1
                        active:scale-95 transition-transform duration-100 select-none
                        ${evOpen ? 'bg-tesla-surface' : ''}`}
          >
            <EVIcon active={evOpen} />
            <span className="text-[10px] font-semibold text-tesla-subtle">Зарядни</span>
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

function EVIcon({ active }: { active: boolean }) {
  const c = active ? '#3d9df3' : '#3d9df3'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="17" height="11" rx="2.5" stroke={c} strokeWidth="1.8"/>
      <path d="M19 10.5v3" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M11 11l-1.5 3.5h3L11 18" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
