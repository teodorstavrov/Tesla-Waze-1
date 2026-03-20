interface Props {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message = 'Loading stations…' }: Props) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="glass-card px-5 py-3 flex items-center gap-3 pointer-events-none">
        {/* Spinner */}
        <svg
          className="animate-spin"
          width="18" height="18" viewBox="0 0 18 18"
          fill="none" xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="9" cy="9" r="7" stroke="#3a3a3a" strokeWidth="2" />
          <path
            d="M9 2 A7 7 0 0 1 16 9"
            stroke="#3d9df3" strokeWidth="2" strokeLinecap="round"
          />
        </svg>
        <span className="text-sm text-tesla-subtle">{message}</span>
      </div>
    </div>
  )
}
