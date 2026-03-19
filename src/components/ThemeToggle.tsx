/**
 * Day / Night map toggle — top-right corner.
 */
interface Props {
  isDark:   boolean
  onToggle: () => void
}

export function ThemeToggle({ isDark, onToggle }: Props) {
  return (
    <div className="absolute left-4 bottom-56 z-[1000]">
      <button
        onClick={onToggle}
        aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
        title={isDark ? 'Day mode' : 'Night mode'}
        className="w-14 h-14 glass-card flex items-center justify-center
                   active:scale-95 transition-transform duration-100 select-none"
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="4.5" stroke="#f5a623" strokeWidth="1.8"/>
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.6 4.6l1.4 1.4M16 16l1.4 1.4M4.6 17.4l1.4-1.4M16 6l1.4-1.4"
            stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M19 12.9A8 8 0 0 1 9.1 3a7 7 0 1 0 9.9 9.9Z"
            stroke="#3d9df3" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  )
}
