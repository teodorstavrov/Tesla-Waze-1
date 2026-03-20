/**
 * Bottom filter bar.
 * Tesla touch rules: min 44px height per button, high contrast active state.
 */
import type { FilterMode } from '@/features/ev/types'

interface Props {
  filterMode?:    FilterMode
  onFilterChange?: (mode: FilterMode) => void
  stationCounts?: { all: number; tesla: number; nonTesla: number; available: number }
}

const FILTERS: Array<{ mode: FilterMode; label: string }> = [
  { mode: 'all',       label: 'All'       },
  { mode: 'tesla',     label: 'Tesla'     },
  { mode: 'non-tesla', label: 'Non-Tesla' },
  { mode: 'available', label: 'Available' },
]

export function FloatingFiltersCard({
  filterMode = 'all',
  onFilterChange,
  stationCounts,
}: Props) {
  const countFor = (mode: FilterMode): number | undefined => {
    if (!stationCounts) return undefined
    const map: Record<FilterMode, number> = {
      all:         stationCounts.all,
      tesla:       stationCounts.tesla,
      'non-tesla': stationCounts.nonTesla,
      available:   stationCounts.available,
      fast:        0,
      ultrafast:   0,
    }
    return map[mode]
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="glass-card px-3 py-2 flex items-center gap-2">
        {/* Source legend */}
        <div className="flex items-center gap-3 pr-2 border-r border-tesla-border">
          <LegendDot color="#e31937" label="Tesla" />
          <LegendDot color="#3d9df3" label="EV"    />
        </div>

        {/* Filter pills — min h-11 (44px) for Tesla touch */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map(({ mode, label }) => {
            const active = filterMode === mode
            const count  = countFor(mode)
            return (
              <button
                key={mode}
                onClick={() => onFilterChange?.(mode)}
                className={`
                  h-11 px-4 rounded-xl text-[13px] font-semibold
                  transition-all duration-150 active:scale-95 select-none
                  ${active
                    ? 'bg-tesla-accent text-white border border-tesla-accent'
                    : 'bg-tesla-surface text-tesla-text border border-tesla-border hover:bg-tesla-muted'
                  }
                `}
              >
                {label}
                {count !== undefined && (
                  <span className={`ml-1.5 text-[11px] ${active ? 'opacity-80' : 'text-tesla-subtle'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[11px] text-tesla-subtle">{label}</span>
    </div>
  )
}
