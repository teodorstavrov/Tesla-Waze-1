/**
 * ConfirmEventPrompt — Waze-style card shown when near a reported event.
 * Positioned bottom-center above the main dock buttons.
 * Auto-dismisses after 10 s.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReportedEvent, EventType } from '@/features/events/types'
import { useEventStore } from '@/features/events/store'

interface Props {
  event:        ReportedEvent
  onStillThere: () => void
  onRemove:     () => void
}

const TIMEOUT_S = 10

const LABELS: Record<EventType, string> = {
  police:   'Полиция',
  danger:   'Опасност',
  accident: 'Катастрофа',
  camera:   'Камера',
}

const ICONS: Record<EventType, string> = {
  police:   '🚔',
  danger:   '⚠️',
  accident: '💥',
  camera:   '📷',
}

export function ConfirmEventPrompt({ event, onStillThere, onRemove }: Props) {
  const confirmEvent = useEventStore((s) => s.confirmEvent)
  const [remaining, setRemaining] = useState(TIMEOUT_S)
  const timerRef   = useRef<ReturnType<typeof setInterval>>()
  const dismissRef = useRef(onStillThere)
  useEffect(() => { dismissRef.current = onStillThere }, [onStillThere])

  useEffect(() => {
    setRemaining(TIMEOUT_S)
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(timerRef.current); dismissRef.current(); return 0 }
        return s - 1
      })
    }, 1_000)
    return () => clearInterval(timerRef.current)
  }, [event.id])

  const label = LABELS[event.type]
  const icon  = ICONS[event.type]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 130,          // above the 96px dock buttons + gap
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2500,
        width: 'min(420px, calc(100vw - 32px))',
      }}
    >
      <div style={{
        background: 'rgba(22,28,38,0.97)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>{icon}</span>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>
                {label} <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: 13 }}>(reported)</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                Все още ли е там?
              </div>
            </div>
          </div>
          {/* Countdown */}
          <div style={{ textAlign: 'center', minWidth: 36 }}>
            <div style={{ color: '#f5c842', fontWeight: 800, fontSize: 26, lineHeight: 1 }}>
              {remaining}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>sec</div>
          </div>
        </div>

        {event.confirmations > 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, paddingBottom: 4 }}>
            {event.confirmations} потвърждения
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, padding: '10px 16px 16px' }}>
          <button
            onClick={() => { confirmEvent(event.id); onStillThere() }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); confirmEvent(event.id); onStillThere() }}
            style={{
              flex: 1, height: 56, borderRadius: 12, border: 'none',
              background: '#2ea84a', color: 'white',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>✓</span> Все още е
          </button>
          <button
            onClick={onRemove}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
            style={{
              flex: 1, height: 56, borderRadius: 12, border: 'none',
              background: '#b83040', color: 'white',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>🗑</span> Премахни
          </button>
        </div>
      </div>
    </div>
  )
}
