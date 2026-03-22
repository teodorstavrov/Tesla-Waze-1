/**
 * ReportButton — opens a 2×2 grid of event types above the button.
 * Popup is absolutely positioned so it never shifts the dock layout.
 * Plays a 'report' beep via audioManager after successfully submitting.
 */
import { useState, useCallback } from 'react'
import type { Map as LMap }      from 'leaflet'
import { useEventStore }         from '@/features/events/store'
import type { EventType }        from '@/features/events/types'
import { audioManager }          from '@/features/audio/audioManager'

interface Props { map: LMap | null }

const EVENT_CONFIG: Array<{ type: EventType; label: string; colour: string; icon: JSX.Element }> = [
  {
    type: 'police', label: 'Полиция', colour: '#3d9df3',
    icon: (
      <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="13.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <line x1="4" y1="9.5" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="6.5" y="5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="10" cy="7.2" r="1.1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    type: 'camera', label: 'Камера', colour: '#8e44ad',
    icon: (
      <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
        <rect x="1" y="6" width="13" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="7.5" cy="10.7" r="2.8" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="7.5" cy="10.7" r="1" fill="currentColor"/>
        <rect x="4.5" y="3.5" width="5" height="2.7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M14 8.5l5-2.5v8l-5-2.5V8.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: 'accident', label: 'Катастрофа', colour: '#e31937',
    icon: (
      <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
        <path d="M10 1.5l7.5 3.5v6C17.5 15 14 18 10 19 6 18 2.5 15 2.5 11V5z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M10 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="10" cy="14" r="1.1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    type: 'danger', label: 'Опасност', colour: '#f5a623',
    icon: (
      <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L19 17.5H1L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
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
    const place = (lat: number, lng: number) => {
      addEvent(type, lat, lng)
      audioManager.playUI('report')
    }
    const fallback = () => { const c = map.getCenter(); place(c.lat, c.lng) }
    if (!navigator.geolocation) { fallback(); return }
    let settled = false
    const timer = setTimeout(() => { if (!settled) { settled = true; fallback() } }, 4_000)
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!settled) { settled = true; clearTimeout(timer); place(pos.coords.latitude, pos.coords.longitude) } },
      ()    => { if (!settled) { settled = true; clearTimeout(timer); fallback() } },
      { timeout: 3_000, maximumAge: 5_000 },
    )
  }, [map, addEvent])

  return (
    <div className="relative flex flex-col items-center">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[999]"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); setOpen(false) }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* 2×2 popup */}
      {open && (
        <div
          className="absolute bottom-full mb-3 glass-card overflow-hidden z-[1001]"
          style={{ width: '420px' }}
        >
          <div className="grid grid-cols-2">
            {EVENT_CONFIG.map(({ type, label, colour, icon }) => (
              <button
                key={type}
                onClick={(e) => { e.stopPropagation(); report(type) }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); report(type) }}
                className="flex flex-col items-center justify-center gap-3
                           border-r border-b border-tesla-border
                           [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0
                           active:bg-tesla-surface"
                style={{ height: '140px', color: colour }}
              >
                <span style={{ transform: 'scale(1.7)', display: 'block' }}>{icon}</span>
                <span className="text-[15px] font-semibold" style={{ color: colour }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setOpen((o) => !o)}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o) }}
        aria-label="Сигнал"
        title={syncError ? 'Backend недостъпен' : 'Добави сигнал'}
        style={{
          position: 'relative',
          zIndex: 1001,
          width: 96, height: 96,
          borderRadius: 24,
          background: open
            ? 'rgba(200,200,210,0.10)'
            : 'rgba(230,230,240,0.07)',
          boxShadow: open
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
        {open ? <CloseIcon /> : <FlagIcon />}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          СИГНАЛ
        </span>
        {syncError && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            width: 8, height: 8, borderRadius: '50%',
            background: '#e31937', border: '1.5px solid rgba(255,255,255,0.5)',
          }} />
        )}
      </button>
    </div>
  )
}

function FlagIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      {/* Pole */}
      <line x1="8" y1="4" x2="8" y2="31" stroke="rgba(20,20,20,0.95)" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Flag body — red */}
      <path d="M8 5 L27 10 L8 19 Z" fill="#e31937"/>
      {/* Flag shine */}
      <path d="M8 5 L27 10 L17 13 Z" fill="rgba(255,255,255,0.22)"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M5 5l16 16M21 5L5 21" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}
