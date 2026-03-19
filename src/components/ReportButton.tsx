/**
 * ReportButton — floating button that opens a 4-option event menu.
 * Tapping an event type places a marker at the current GPS position
 * (or map centre if GPS is unavailable).
 *
 * Events: Police · Danger · Accident · Camera
 */
import { useState, useCallback } from 'react'
import type { Map as LMap }      from 'leaflet'
import { useEventStore }         from '@/features/events/store'
import type { EventType }        from '@/features/events/types'

interface Props { map: LMap | null }

const EVENT_CONFIG: Record<EventType, { label: string; colour: string; icon: JSX.Element }> = {
  police: {
    label:  'Police',
    colour: '#3d9df3',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  danger: {
    label:  'Danger',
    colour: '#f5a623',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L16.5 15H1.5L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 7v3.5M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  accident: {
    label:  'Accident',
    colour: '#e31937',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 5v4.5M9 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  camera: {
    label:  'Camera',
    colour: '#8e44ad',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M13 8l4-2v6l-4-2V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="7" cy="9.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
}

export function ReportButton({ map }: Props) {
  const [open, setOpen] = useState(false)
  const addEvent        = useEventStore((s) => s.addEvent)
  const syncError       = useEventStore((s) => s.syncError)

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
    <div className="relative">
      {/* Popup menu — appears above the button */}
      {open && (
        <div className="glass-card mb-2 overflow-hidden" style={{ width: '140px' }}>
          {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => report(type)}
              className="w-full flex items-center gap-3 px-3 text-left
                         active:bg-tesla-surface border-b border-tesla-border last:border-0"
              style={{ height: '48px' }}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <span style={{ color: cfg.colour }}>{cfg.icon}</span>
              <span className="text-[13px] font-medium text-tesla-text">{cfg.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Report event"
        title={syncError ? 'Backend unavailable — markers will not persist' : 'Report event'}
        className={`w-14 h-14 glass-card flex items-center justify-center
                    active:scale-95 transition-transform duration-100 select-none
                    ${open ? 'bg-tesla-surface' : ''}`}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {open ? <CloseIcon /> : <PlusIcon />}
        {syncError && (
          <span
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 10, height: 10, borderRadius: '50%',
              background: '#e31937', border: '2px solid #0a0a0a',
            }}
          />
        )}
      </button>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="#f5a623" strokeWidth="1.8"/>
      <path d="M11 7v8M7 11h8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 3l12 12M15 3L3 15" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
