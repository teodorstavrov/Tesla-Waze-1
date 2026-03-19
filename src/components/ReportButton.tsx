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
        style={{
          position: 'relative',
          width: 76, height: 76,
          borderRadius: 20,
          background: open
            ? 'linear-gradient(145deg, #3a1a00, #5a2800)'
            : 'linear-gradient(145deg, #b85000, #e07010)',
          boxShadow: open
            ? '0 2px 12px rgba(245,166,35,0.2)'
            : '0 4px 20px rgba(245,166,35,0.5)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 5,
          border: '1.5px solid rgba(245,166,35,0.5)',
          transition: 'all 0.15s ease',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {open ? <CloseIcon /> : <SignalIcon />}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
          color: '#ffd080',
        }}>
          Сигнал
        </span>
        {syncError && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
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
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <defs>
        <linearGradient id="sig-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066"/>
          <stop offset="100%" stopColor="#f5a623"/>
        </linearGradient>
      </defs>
      <circle cx="15" cy="15" r="12" stroke="url(#sig-grad)" strokeWidth="2.2"
              fill="rgba(245,166,35,0.12)"/>
      <path d="M15 9v8" stroke="url(#sig-grad)" strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="15" cy="20.5" r="1.4" fill="#f5a623"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5L5 19" stroke="#ffd080" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}
