/**
 * ReportButton — pill-shaped action button with signal submenu.
 * Optimised for Tesla touchscreen (large touch targets, no hover, onTouchEnd).
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Map as LMap }      from 'leaflet'
import { useEventStore }         from '@/features/events/store'
import type { EventType }        from '@/features/events/types'

interface Props { map: LMap | null }

function playBeep() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.start(); osc.stop(ctx.currentTime + 0.18)
  } catch { /* ignore */ }
}

const MENU_ITEMS: Array<{ type: EventType; label: string; emoji: string }> = [
  { type: 'police',   label: 'Полиция',    emoji: '🚔' },
  { type: 'accident', label: 'Катастрофа', emoji: '💥' },
  { type: 'danger',   label: 'Опасност',   emoji: '⚠️' },
  { type: 'camera',   label: 'Камера',     emoji: '📷' },
]

export function ReportButton({ map }: Props) {
  const [open,      setOpen]      = useState(false)
  const [toast,     setToast]     = useState('')
  const [toastVis,  setToastVis]  = useState(false)
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addEvent    = useEventStore((s) => s.addEvent)
  const syncError   = useEventStore((s) => s.syncError)

  // Auto-close menu after 5s
  useEffect(() => {
    if (open) {
      menuTimer.current = setTimeout(() => setOpen(false), 5_000)
    }
    return () => { if (menuTimer.current) clearTimeout(menuTimer.current) }
  }, [open])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setToastVis(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVis(false), 2_500)
  }, [])

  const report = useCallback((type: EventType, label: string) => {
    setOpen(false)
    if (!map) return
    const place = (lat: number, lng: number) => {
      addEvent(type, lat, lng)
      playBeep()
      showToast(`✅ Добавен сигнал: ${label}`)
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
  }, [map, addEvent, showToast])

  const toggle = useCallback(() => setOpen((o) => !o), [])

  return (
    <>
      <style>{`
        @keyframes teslaPulse {
          0%   { box-shadow: 0 4px 20px rgba(220,38,38,0.55), 0 0 0 0 rgba(220,38,38,0.6); }
          70%  { box-shadow: 0 4px 20px rgba(220,38,38,0.55), 0 0 0 14px rgba(220,38,38,0); }
          100% { box-shadow: 0 4px 20px rgba(220,38,38,0.55), 0 0 0 0 rgba(220,38,38,0); }
        }
      `}</style>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[1000]"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); setOpen(false) }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Signal submenu — appears above the button */}
      <div
        style={{
          position: 'fixed',
          bottom: 114,
          right: 24,
          background: 'rgba(10,10,10,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.15)',
          minWidth: 210,
          zIndex: 1002,
          pointerEvents: open ? 'auto' : 'none',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(8px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          overflow: 'hidden',
          transformOrigin: 'bottom right',
        }}
      >
        <div style={{
          padding: '10px 18px',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          Изберете тип сигнал
        </div>
        {MENU_ITEMS.map(({ type, label, emoji }) => (
          <button
            key={type}
            onClick={(e) => { e.stopPropagation(); report(type, label) }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); report(type, label) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              width: '100%',
              padding: '13px 18px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: 52,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      <div
        style={{
          position: 'fixed',
          bottom: toastVis ? 108 : 100,
          right: 24,
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(12px)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 500,
          zIndex: 1003,
          opacity: toastVis ? 1 : 0,
          transition: 'opacity 0.2s ease, bottom 0.2s ease',
          pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap',
        }}
      >
        {toast}
      </div>

      {/* Pill button */}
      <button
        onClick={toggle}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
        aria-label="Сигнал"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: open ? 'rgba(180,20,20,0.95)' : 'rgba(220,38,38,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,100,100,0.55)',
          borderRadius: 100,
          padding: '0 26px 0 20px',
          height: 60,
          cursor: 'pointer',
          animation: open ? 'none' : 'teslaPulse 2s infinite',
          transition: 'background 0.15s ease',
          zIndex: 1001,
          position: 'relative',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          willChange: 'transform',
        }}
      >
        {/* Icon */}
        <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          {open ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
          )}
        </div>
        <span style={{ fontWeight: 600, fontSize: 16, color: 'white', letterSpacing: '0.3px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          Сигнал
        </span>
        {syncError && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            width: 8, height: 8, borderRadius: '50%',
            background: '#ff6b6b', border: '2px solid rgba(220,38,38,0.9)',
          }} />
        )}
      </button>
    </>
  )
}
