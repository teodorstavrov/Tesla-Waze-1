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
      bottom:    130,
      left:      '50%',
      transform: 'translateX(-50%)',
      zIndex:    2500,
      width:     'min(460px, calc(100vw - 32px))',
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

        {/* Route options */}
        <div style={{ display: 'flex', gap: 0 }}>
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => onSelect(alt)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(alt) }}
              style={{
                flex:           1,
                padding:        '18px 12px 20px',
                background:     'transparent',
                border:         'none',
                borderRight:    i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                cursor:         'pointer',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            6,
                transition:     'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Color indicator line */}
              <div style={{
                width:        i === 0 ? 48 : 48,
                height:       4,
                borderRadius: 2,
                background:   ACCENT[i],
                opacity:      i === 0 ? 1 : 0.55,
                marginBottom: 6,
                ...(i === 1 ? { backgroundImage: 'repeating-linear-gradient(90deg,#a0a0b0 0,#a0a0b0 10px,transparent 10px,transparent 18px)', background: 'none' } : {}),
              }} />

              <div style={{ color: ACCENT[i], fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', opacity: i === 0 ? 1 : 0.75 }}>
                {i === 0 ? 'МАРШРУТ 1' : 'МАРШРУТ 2'}
              </div>

              {/* Time — big */}
              <div style={{ color: 'white', fontWeight: 800, fontSize: 28, lineHeight: 1, marginTop: 4 }}>
                {dur(alt.durationS)}
              </div>

              {/* Distance — small */}
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 }}>
                {fmt(alt.distanceM)}
              </div>

              {i === 0 && (
                <div style={{
                  marginTop:    6,
                  background:   'rgba(61,157,243,0.18)',
                  border:       '1px solid rgba(61,157,243,0.35)',
                  borderRadius: 10,
                  padding:      '3px 10px',
                  fontSize:     11,
                  color:        '#3d9df3',
                  fontWeight:   600,
                }}>
                  По-бърз
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
