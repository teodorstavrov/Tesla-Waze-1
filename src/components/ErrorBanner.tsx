interface Props {
  message:   string | null
  onDismiss?: () => void
  onRetry?:   () => void
}

export function ErrorBanner({ message, onDismiss, onRetry }: Props) {
  if (!message) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9000] max-w-sm w-full px-4">
      <div className="glass-card border border-tesla-accent/30 px-4 py-3 flex items-start gap-3">
        <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#e31937" strokeWidth="1.5" />
          <path d="M8 5v3.5M8 10.5v.5" stroke="#e31937" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <p className="text-sm text-tesla-text flex-1 leading-snug">{message}</p>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-[12px] font-semibold text-tesla-blue border border-tesla-blue/40
                         rounded-lg px-2.5 py-1 active:scale-95 transition-transform"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-tesla-subtle hover:text-tesla-text transition-colors w-8 h-8
                         flex items-center justify-center"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
