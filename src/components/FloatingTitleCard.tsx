interface Props {
  loading?: boolean
}

export function FloatingTitleCard({ loading = false }: Props) {
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="glass-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-tesla-accent flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M9.5 1.5 L4.5 9 H8 L6.5 14.5 L11.5 7 H8 Z" fill="white" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <div className="text-sm font-semibold text-tesla-text leading-none">Tesla EV Nav</div>
            <div className="text-[10px] text-tesla-subtle mt-0.5">Bulgaria · Live Charging</div>
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-2.5 flex items-center gap-1.5">
          {loading ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-tesla-amber animate-pulse" />
              <span className="text-[10px] text-tesla-subtle">Fetching stations…</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-tesla-green" />
              <span className="text-[10px] text-tesla-subtle">Live</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
