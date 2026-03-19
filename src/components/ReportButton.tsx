/**
 * ReportButton — opens a 2×2 grid of event types above the button.
 * Popup is absolutely positioned so it never shifts the dock layout.
 */
import { useState, useCallback } from 'react'
import type { Map as LMap }      from 'leaflet'
import { useEventStore }         from '@/features/events/store'
import type { EventType }        from '@/features/events/types'

interface Props { map: LMap | null }

const EVENT_CONFIG: Array<{ type: EventType; label: string; colour: string; icon: JSX.Element }> = [
  {
    type: 'police', label: 'Полиция', colour: '#3d9df3',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* Head */}
        <circle cx="10" cy="13.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        {/* Hat brim */}
        <line x1="4" y1="9.5" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Hat top */}
        <rect x="6.5" y="5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        {/* Badge */}
        <circle cx="10" cy="7.2" r="1.1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    type: 'camera', label: 'Камера', colour: '#8e44ad',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* Body */}
        <rect x="1" y="6" width="13" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        {/* Lens */}
        <circle cx="7.5" cy="10.7" r="2.8" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="7.5" cy="10.7" r="1" fill="currentColor"/>
        {/* Top bump */}
        <rect x="4.5" y="3.5" width="5" height="2.7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        {/* Video arm */}
        <path d="M14 8.5l5-2.5v8l-5-2.5V8.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: 'accident', label: 'Катастрофа', colour: '#e31937',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* Shield */}
        <path d="M10 1.5l7.5 3.5v6C17.5 15 14 18 10 19 6 18 2.5 15 2.5 11V5z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        {/* Exclamation */}
        <path d="M10 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="10" cy="14" r="1.1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    type: 'danger', label: 'Опасност', colour: '#f5a623',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* Bold triangle */}
        <path d="M10 2L19 17.5H1L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        {/* Exclamation */}
        <path d="M10 7.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="10" cy="14.5" r="1.1" fill="currentColor"/>
      </svg>
    ),
  },
]

export function ReportButton({ map }: Props) {
  const [open, setOpen] = useState(false)
  const addEvent  = useEventStore((s) => s.addEvent)
  const syncError = useEventStore((s) => s.syncError)

  const report = useCallback((type: EventType) => {
    setOpen(false)
    if (!map) return
    const place = (lat: number, lng: number) => addEvent(type, lat, lng)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => place(pos.coords.latitude, pos.coords.longitude),
        ()    => { const c = map.getCenter(); place(c.lat, c.lng) },
        { timeout: 3_000, maximumAge: 5_000 },
      )
    } else {
      const c = map.getCenter()
      place(c.lat, c.lng)
    }
  }, [map, addEvent])

  return (
    <div className="relative flex flex-col items-center">
      {/* Backdrop — closes menu when tapping outside */}
      {open && (
        <div
          className="fixed inset-0 z-[999]"
          onClick={() => setOpen(false)}
          onTouchEnd={() => setOpen(false)}
        />
      )}

      {/* 2×2 popup — absolutely positioned above, never shifts the dock */}
      {open && (
        <div
          className="absolute bottom-full mb-3 glass-card overflow-hidden z-[1001]"
          style={{ width: '192px' }}
        >
          <div className="grid grid-cols-2">
            {EVENT_CONFIG.map(({ type, label, colour, icon }) => (
              <button
                key={type}
                onClick={() => report(type)}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex flex-col items-center justify-center gap-1.5
                           border-r border-b border-tesla-border last:border-r-0
                           [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0
                           active:bg-tesla-surface"
                style={{ height: '76px', color: colour }}
              >
                {icon}
                <span className="text-[11px] font-semibold" style={{ color: colour }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setOpen((o) => !o)}
        onTouchEnd={(e) => e.stopPropagation()}
        aria-label="Сигнал"
        title={syncError ? 'Backend недостъпен' : 'Добави сигнал'}
        className={`relative w-16 h-16 glass-card flex flex-col items-center justify-center gap-1
                    active:scale-95 transition-transform duration-100 select-none
                    ${open ? 'bg-tesla-surface' : ''}`}
      >
        {open
          ? <CloseIcon />
          : <SignalIcon />
        }
        <span className="text-[10px] font-semibold text-tesla-subtle">Сигнал</span>
        {syncError && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 9, height: 9, borderRadius: '50%',
            background: '#e31937', border: '2px solid #0a0a0a',
          }} />
        )}
      </button>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#f5a623" strokeWidth="1.8"/>
      <path d="M12 7v6M12 15.5v.5" stroke="#f5a623" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 4l12 12M16 4L4 16" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
