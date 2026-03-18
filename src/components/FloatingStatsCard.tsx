import type { StationsResponse } from '@/features/ev/types'

interface StationCounts {
  total: number
  tesla: number
  ocm:   number
  osm:   number
}

interface Props {
  counts?:       StationCounts
  loading?:      boolean
  lastResponse?: StationsResponse | null
}

const PLACEHOLDER: StationCounts = { total: 0, tesla: 0, ocm: 0, osm: 0 }

export function FloatingStatsCard({
  counts = PLACEHOLDER,
  loading = false,
  lastResponse,
}: Props) {
  return (
    <div className="absolute top-4 right-4 z-[1000] w-52">
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
            {loading && counts.total === 0 ? '—' : counts.total}
          </div>
          <div className="text-[11px] text-tesla-subtle mt-1">stations in view</div>
        </div>

        {/* Source rows */}
        <div className="space-y-2 border-t border-tesla-border pt-2.5">
          <SourceRow
            color="#e31937"
            label="Tesla"
            count={counts.tesla}
            status={lastResponse?.sources.tesla}
            loading={loading}
          />
          <SourceRow
            color="#3d9df3"
            label="OpenChargeMap"
            count={counts.ocm}
            status={lastResponse?.sources.ocm}
            loading={loading}
          />
          <SourceRow
            color="#3dd68c"
            label="OpenStreetMap"
            count={counts.osm}
            status={lastResponse?.sources.osm}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

type SourceResult = StationsResponse['sources']['tesla']

function statusBadge(status: SourceResult | undefined, loading: boolean) {
  if (loading || !status) return null
  if (status.status === 'ok') return null  // just show count
  if (status.status === 'skipped') {
    return (
      <span className="text-[9px] font-medium text-tesla-muted border border-tesla-muted rounded px-1 py-0.5 leading-none">
        NO KEY
      </span>
    )
  }
  return (
    <span className="text-[9px] font-medium text-tesla-accent border border-tesla-accent/40 rounded px-1 py-0.5 leading-none">
      ERR
    </span>
  )
}

function SourceRow({
  color,
  label,
  count,
  status,
  loading,
}: {
  color: string
  label: string
  count: number
  status?: SourceResult
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[11px] text-tesla-subtle truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {statusBadge(status, loading)}
        <span className="text-[12px] font-semibold text-tesla-text tabular-nums">
          {loading ? '—' : count}
        </span>
      </div>
    </div>
  )
}
