import type { EVStation } from '@/features/ev/types'

interface Props {
  stations: EVStation[]
  loading?: boolean
}

export function FloatingStatsCard({ stations, loading = false }: Props) {
  // Top 5 brands by count, sorted descending
  const brandCounts = new Map<string, number>()
  for (const s of stations) {
    const brand = s.operator?.trim() || (s.isTesla ? 'Tesla' : 'Друг')
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
  }
  const top5 = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="absolute top-4 right-4 z-[1000] w-48">
      <div className="glass-card px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="tesla-label">EV Stations</span>
          {loading && (
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#3a3a3a" strokeWidth="1.5" />
              <path d="M6.5 1.5 A5 5 0 0 1 11.5 6.5" stroke="#3d9df3" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Total */}
        <div className="mb-3">
          <div className="text-4xl font-bold text-tesla-text leading-none tabular-nums">
            {loading && stations.length === 0 ? '—' : stations.length}
          </div>
          <div className="text-[11px] text-tesla-subtle mt-1">stations in view</div>
        </div>

        {/* Top 5 brands */}
        <div className="space-y-1.5 border-t border-tesla-border pt-2.5">
          {top5.length === 0 && !loading && (
            <div className="text-[11px] text-tesla-subtle">—</div>
          )}
          {top5.map(([brand, count]) => (
            <div key={brand} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-tesla-subtle truncate">{brand}</span>
              <span className="text-[12px] font-semibold text-tesla-text tabular-nums flex-shrink-0">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
