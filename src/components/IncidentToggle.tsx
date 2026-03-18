/**
 * Toggle button for the Waze traffic incidents overlay.
 * Positioned left side, above the GPS location button.
 */
interface Props {
  visible:  boolean
  count:    number
  onToggle: () => void
}

export function IncidentToggle({ visible, count, onToggle }: Props) {
  return (
    <div className="absolute left-4 bottom-40 z-[1000]">
      <button
        onClick={onToggle}
        aria-label={visible ? 'Hide traffic incidents' : 'Show traffic incidents'}
        title={visible ? 'Hide incidents' : 'Show incidents'}
        className={`
          w-14 h-14 glass-card flex flex-col items-center justify-center gap-0.5
          active:scale-95 transition-transform duration-100 select-none
          ${visible ? '' : 'opacity-50'}
        `}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Warning triangle icon */}
        <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
          <path
            d="M10 2L18.5 17H1.5L10 2Z"
            fill={visible ? '#f5a623' : '#8a8a8a'}
            stroke={visible ? '#f5a623' : '#8a8a8a'}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M10 8v3.5M10 13.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {/* Live count badge */}
        {count > 0 && (
          <span
            className="text-[9px] font-bold leading-none"
            style={{ color: visible ? '#f5a623' : '#8a8a8a' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </div>
  )
}
