/**
 * BottomDock — two buttons centered at the bottom of the screen.
 * Left: Signal report button (opens 4-type event menu)
 * Right: EV stations button (opens nearest stations list)
 */
import { useState } from 'react'
import type { Map as LMap } from 'leaflet'
import type { EVStation }   from '@/features/ev/types'
import { ReportButton }     from './ReportButton'
import { EVStationsPanel }  from './EVStationsPanel'

interface Props {
  map:      LMap | null
  stations: EVStation[]
}

export function BottomDock({ map, stations }: Props) {
  const [evOpen, setEvOpen] = useState(false)

  return (
    <>
      {evOpen && (
        <EVStationsPanel stations={stations} onClose={() => setEvOpen(false)} />
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-end gap-3">
        <ReportButton map={map} />
        <EVButton open={evOpen} onClick={() => setEvOpen((o) => !o)} />
      </div>
    </>
  )
}

function EVButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Зарядни станции"
      title="Зарядни станции"
      className={`w-14 h-14 glass-card flex items-center justify-center
                  active:scale-95 transition-transform duration-100 select-none
                  ${open ? 'bg-tesla-surface' : ''}`}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <EVIcon active={open} />
    </button>
  )
}

function EVIcon({ active }: { active: boolean }) {
  const c = active ? '#3d9df3' : '#8a8a8a'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Battery body */}
      <rect x="2" y="6" width="16" height="10" rx="2" stroke={c} strokeWidth="1.6"/>
      {/* Battery tip */}
      <path d="M18 9.5v3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* Lightning bolt */}
      <path d="M10 10L8.5 13h3L10 16" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
