/**
 * RouteAlternativePicker — shown when OSRM returns 2 route alternatives.
 * Positioned bottom-center above the dock buttons.
 * User picks one → active route is set, markers load along that corridor.
 */
import type { Route } from '@/features/route/types'

interface Props {
  alternatives: Route[]
  onSelect:     (route: Route) => void
  onCancel:     () => void
}

function fmt(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} км` : `${Math.round(m)} м`
}
function dur(s: number) {
  const h   = Math.floor(s / 3600)
  const min = Math.round((s % 3600) / 60)
  return h > 0 ? `${h} ч ${min} мин` : `${min} мин`
}

const ACCENT = ['#3d9df3', '#a0a0b0']

export function RouteAlternativePicker({ alternatives, onSelect, onCancel }: Props) {
  return (
    <div style={{
      position:  'fixed',
      top:       100,   // below the Tesla EV Nav banner (~top-4 + ~80px card height)
      left:      16,
      zIndex:    2500,
      width:     'min(300px, calc(100vw - 32px))',
    }}>
      <div style={{
        background:   'rgba(14,18,26,0.97)',
        borderRadius: 20,
        overflow:     'hidden',
        boxShadow:    '0 8px 40px rgba(0,0,0,0.65)',
        border:       '1px solid rgba(255,255,255,0.10)',
      }}>
        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '16px 20px 12px',
          borderBottom:   '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
            Избери маршрут
          </span>
          <button
            onClick={onCancel}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onCancel() }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border:     '1px solid rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding:    '5px 14px',
              color:      'rgba(255,255,255,0.7)',
              fontSize:   13,
              cursor:     'pointer',
            }}
          >
            Отказ
          </button>
        </div>

        {/* Route options — vertical list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => onSelect(alt)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(alt) }}
              style={{
                padding:       '14px 16px',
                background:    'transparent',
                border:        'none',
                borderBottom:  i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           12,
                transition:    'background 0.15s',
                textAlign:     'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Color stripe */}
              <div style={{
                width:        4,
                height:       40,
                borderRadius: 2,
                flexShrink:   0,
                background:   i === 0 ? ACCENT[0] : 'none',
                opacity:      i === 0 ? 1 : 0.6,
                ...(i === 1 ? { backgroundImage: 'repeating-linear-gradient(180deg,#a0a0b0 0,#a0a0b0 6px,transparent 6px,transparent 10px)' } : {}),
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ color: ACCENT[i], fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', opacity: i === 0 ? 1 : 0.7 }}>
                    {i === 0 ? 'МАРШРУТ 1' : 'МАРШРУТ 2'}
                  </span>
                  {i === 0 && (
                    <span style={{
                      background: 'rgba(61,157,243,0.18)', border: '1px solid rgba(61,157,243,0.35)',
                      borderRadius: 8, padding: '1px 7px', fontSize: 10, color: '#3d9df3', fontWeight: 600,
                    }}>По-бърз</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
                    {dur(alt.durationS)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                    {fmt(alt.distanceM)}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
