/**
 * Route planning panel — Tesla UX:
 * - Collapsed: single route button (bottom-left, above incident toggle)
 * - Expanded: From / To inputs with Nominatim autocomplete, route summary
 * - 52px result rows, Cancel clears and collapses
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { geocode, type GeoResult }   from '@/lib/nominatim'
import { useRoute }                  from '@/features/route/hooks/useRoute'
import { useRouteStore }             from '@/features/route/store'
import type { RoutePoint }           from '@/features/route/types'

const DEBOUNCE_MS = 500
const MIN_QUERY   = 2

type Field = 'origin' | 'destination'

interface SearchState {
  query:   string
  results: GeoResult[]
  status:  'idle' | 'loading' | 'empty' | 'error'
}

const EMPTY: SearchState = { query: '', results: [], status: 'idle' }

export function RoutePanel() {
  const [open,        setOpen]        = useState(false)
  const [origin,      setOrigin]      = useState<RoutePoint | null>(null)
  const [destination, setDestination] = useState<RoutePoint | null>(null)
  const [active,      setActive]      = useState<Field>('origin')
  const [search,      setSearch]      = useState<Record<Field, SearchState>>({
    origin:      EMPTY,
    destination: EMPTY,
  })

  const originRef = useRef<HTMLInputElement>(null)
  const destRef   = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { calculate, clear } = useRoute()
  const route   = useRouteStore((s) => s.route)
  const loading = useRouteStore((s) => s.loading)
  const error   = useRouteStore((s) => s.error)

  // Debounced geocode for active field
  const handleQuery = useCallback((field: Field, query: string) => {
    setSearch((prev) => ({
      ...prev,
      [field]: { ...prev[field], query, results: [], status: query.length >= MIN_QUERY ? 'loading' : 'idle' },
    }))
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < MIN_QUERY) return

    timerRef.current = setTimeout(async () => {
      try {
        const results = await geocode(query)
        setSearch((prev) => ({
          ...prev,
          [field]: { query, results, status: results.length ? 'idle' : 'empty' },
        }))
      } catch {
        setSearch((prev) => ({ ...prev, [field]: { query, results: [], status: 'error' } }))
      }
    }, DEBOUNCE_MS)
  }, [])

  const selectResult = useCallback((field: Field, result: GeoResult) => {
    const point: RoutePoint = { lat: result.lat, lng: result.lng, label: result.shortName }
    if (field === 'origin') {
      setOrigin(point)
      setSearch((prev) => ({ ...prev, origin: { query: result.shortName, results: [], status: 'idle' } }))
      setActive('destination')
      setTimeout(() => destRef.current?.focus(), 60)
    } else {
      setDestination(point)
      setSearch((prev) => ({ ...prev, destination: { query: result.shortName, results: [], status: 'idle' } }))
    }
  }, [])

  // Auto-calculate when both points are set
  useEffect(() => {
    if (origin && destination) {
      calculate(origin, destination)
    }
  }, [origin, destination, calculate])

  const collapse = useCallback(() => {
    setOpen(false)
    setOrigin(null)
    setDestination(null)
    setSearch({ origin: EMPTY, destination: EMPTY })
    clear()
  }, [clear])

  // Escape key
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') collapse() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, collapse])

  const activeSearch = search[active]
  const showDropdown = activeSearch.results.length > 0 || activeSearch.status === 'empty' || activeSearch.status === 'error'

  if (!open) {
    return (
      <div className="absolute left-4 bottom-56 z-[1000]">
        <button
          onClick={() => { setOpen(true); setTimeout(() => originRef.current?.focus(), 80) }}
          aria-label="Plan route"
          title="Plan route"
          className="w-14 h-14 glass-card flex items-center justify-center
                     active:scale-95 transition-transform duration-100 select-none"
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <RouteIcon active={!!route} />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute left-4 z-[1000]" style={{ top: '108px', width: 'min(300px, calc(100vw - 180px))' }}>
      <div className="glass-card overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-tesla-border">
          <span className="text-[13px] font-semibold text-tesla-text">Route</span>
          <button
            onClick={collapse}
            className="text-[12px] text-tesla-subtle hover:text-tesla-text px-2 py-1"
          >
            Cancel
          </button>
        </div>

        {/* Origin input */}
        <FieldRow
          ref={originRef}
          label="A"
          labelColour="#27ae60"
          placeholder="From…"
          value={search.origin.query}
          status={search.origin.status}
          selected={!!origin}
          focused={active === 'origin'}
          onFocus={() => setActive('origin')}
          onChange={(v) => { setOrigin(null); handleQuery('origin', v) }}
        />

        {/* Destination input */}
        <FieldRow
          ref={destRef}
          label="B"
          labelColour="#e31937"
          placeholder="To…"
          value={search.destination.query}
          status={search.destination.status}
          selected={!!destination}
          focused={active === 'destination'}
          onFocus={() => setActive('destination')}
          onChange={(v) => { setDestination(null); handleQuery('destination', v) }}
        />

        {/* Dropdown results */}
        {showDropdown && (
          <div className="border-t border-tesla-border">
            {activeSearch.status === 'empty' && (
              <div className="px-4 py-3 text-[12px] text-tesla-subtle">No results</div>
            )}
            {activeSearch.status === 'error' && (
              <div className="px-4 py-3 text-[12px] text-tesla-subtle">Search unavailable</div>
            )}
            {activeSearch.results.map((r) => (
              <button
                key={r.placeId}
                onClick={() => selectResult(active, r)}
                className="w-full flex items-center gap-3 px-4 text-left
                           active:bg-tesla-surface border-b border-tesla-border last:border-0"
                style={{ height: '48px' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-tesla-text truncate">{r.shortName}</div>
                  <div className="text-[11px] text-tesla-subtle truncate">{r.country}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Route summary */}
        {loading && (
          <div className="px-4 py-3 text-[12px] text-tesla-subtle border-t border-tesla-border">
            Calculating route…
          </div>
        )}
        {error && (
          <div className="px-4 py-3 text-[12px] text-red-400 border-t border-tesla-border">{error}</div>
        )}
        {route && !loading && (
          <div className="px-4 py-3 border-t border-tesla-border flex items-center gap-4">
            <div>
              <div className="text-[13px] font-semibold text-tesla-text">{formatDistance(route.distanceM)}</div>
              <div className="text-[11px] text-tesla-subtle">{formatDuration(route.durationS)}</div>
            </div>
            <div className="flex-1 text-right">
              <span className="text-[11px] text-tesla-subtle">Chargers along route ↓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Field row ──────────────────────────────────────────────────────────────────
import { forwardRef } from 'react'

const FieldRow = forwardRef<HTMLInputElement, {
  label:        string
  labelColour:  string
  placeholder:  string
  value:        string
  status:       string
  selected:     boolean
  focused:      boolean
  onFocus:      () => void
  onChange:     (v: string) => void
}>(({ label, labelColour, placeholder, value, status, selected, focused, onFocus, onChange }, ref) => (
  <div className={`flex items-center gap-2.5 px-3 py-2 border-b border-tesla-border
                   ${focused ? 'bg-tesla-surface' : ''}`}>
    <span className="text-[12px] font-bold w-4 text-center flex-shrink-0" style={{ color: labelColour }}>
      {label}
    </span>
    {status === 'loading'
      ? <MiniSpinner />
      : <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected ? labelColour : '#3a3a3a' }} />
    }
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      className="flex-1 bg-transparent text-[13px] text-tesla-text
                 placeholder:text-tesla-subtle outline-none min-w-0"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="text-tesla-subtle w-5 h-5 flex items-center justify-center flex-shrink-0"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    )}
  </div>
))
FieldRow.displayName = 'FieldRow'

// ── Helpers ────────────────────────────────────────────────────────────────────
function RouteIcon({ active }: { active: boolean }) {
  const c = active ? '#3d9df3' : '#8a8a8a'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="4"  cy="18" r="3" stroke={c} strokeWidth="1.5" />
      <circle cx="18" cy="4"  r="3" stroke={c} strokeWidth="1.5" />
      <path d="M4 15C4 10 18 12 18 7" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeDasharray={active ? 'none' : '3 2'} />
    </svg>
  )
}

function MiniSpinner() {
  return (
    <svg className="animate-spin flex-shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="#3a3a3a" strokeWidth="1.2" />
      <path d="M6 1.5 A4.5 4.5 0 0 1 10.5 6" stroke="#3d9df3" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}
