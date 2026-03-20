/**
 * Full-screen confirmation card shown when the user is within 5 m of a
 * reported event. Auto-dismisses after 10 s. Only "Remove" deletes the marker.
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

const COLOURS: Record<EventType, string> = {
  police:   '#3d9df3',
  danger:   '#f5a623',
  accident: '#e31937',
  camera:   '#8e44ad',
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
        if (s <= 1) {
          clearInterval(timerRef.current)
          dismissRef.current()
          return 0
        }
        return s - 1
      })
    }, 1_000)
    return () => clearInterval(timerRef.current)
  }, [event.id]) // reset when a different event triggers

  const colour = COLOURS[event.type]
  const label  = LABELS[event.type]

  return (
    <div
      className="absolute inset-0 z-[2500] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
    >
      <div className="glass-card mx-4 w-full max-w-xs overflow-hidden">
        {/* Progress bar — shrinks over 10 s */}
        <div
          className="h-1 transition-none"
          style={{
            width:      `${(remaining / TIMEOUT_S) * 100}%`,
            background: colour,
            transition: 'width 1s linear',
          }}
        />

        <div className="px-5 py-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: colour, boxShadow: `0 0 8px ${colour}` }}
            />
            <span className="text-[13px] font-semibold uppercase tracking-widest text-tesla-subtle">
              Сигнал наоколо
            </span>
          </div>

          <p className="text-[22px] font-bold mb-1" style={{ color: colour }}>
            {label}
          </p>
          <p className="text-[13px] text-tesla-subtle mb-5">
            Все още ли е там? ({remaining}с)
          </p>

          {/* Confirmation count */}
          {event.confirmations > 0 && (
            <div className="text-center text-[11px] text-tesla-subtle mt-3">
              {event.confirmations} потвърждени
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { confirmEvent(event.id); onStillThere() }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); confirmEvent(event.id); onStillThere() }}
              className="flex-1 h-12 rounded-xl text-[14px] font-semibold
                         bg-tesla-surface border border-tesla-border text-tesla-text
                         active:scale-95 transition-transform"
            >
              Все още е
            </button>
            <button
              onClick={onRemove}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
              className="flex-1 h-12 rounded-xl text-[14px] font-semibold
                         active:scale-95 transition-transform"
              style={{
                background: 'rgba(227,25,55,0.15)',
                border:     '1px solid rgba(227,25,55,0.4)',
                color:      '#e31937',
              }}
            >
              Премахни
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
