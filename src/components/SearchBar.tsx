/**
 * Geocoding search bar — powered by Nominatim (OSM), no key required.
 *
 * Tesla UX:
 * - Collapsed state: slim pill (doesn't block map)
 * - Expanded state: full input + result list
 * - Result rows: 52px height — one-thumb tappable
 * - Debounced at 500ms to respect Nominatim rate limit
 * - Closes on result selection or backdrop tap (Escape on desktop)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Map as LMap } from 'leaflet'
import { geocode, type GeoResult } from '@/lib/nominatim'

interface Props {
  map:     LMap | null
  onPlace: (lat: number, lng: number) => void  // triggers station fetch after pan
}

const DEBOUNCE_MS  = 500
const MIN_QUERY    = 2

export function SearchBar({ map, onPlace }: Props) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced geocode
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setResults([])
      setStatus('idle')
      return
    }

    setStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const res = await geocode(q)
        setResults(res)
        setStatus(res.length === 0 ? 'empty' : 'idle')
      } catch {
        setResults([])
        setStatus('error')
      }
    }, DEBOUNCE_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const expand = useCallback(() => {
    setOpen(true)
    // Small delay so the input is mounted before focus
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const collapse = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setStatus('idle')
  }, [])

  const select = useCallback((result: GeoResult) => {
    if (!map) return
    map.setView([result.lat, result.lng], 13, { animate: true })
    onPlace(result.lat, result.lng)
    collapse()
  }, [map, onPlace, collapse])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') collapse() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, collapse])

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]" style={{ width: 'min(340px, calc(100vw - 230px))' }}>
      {!open ? (
        /* ── Collapsed pill ─────────────────────────────────────── */
        <button
          onClick={expand}
          className="glass-card w-full flex items-center gap-2.5 px-4 py-3
                     active:scale-95 transition-transform duration-100"
        >
          <SearchIcon className="text-tesla-subtle flex-shrink-0" />
          <span className="text-[13px] text-tesla-subtle">Search city or address…</span>
        </button>
      ) : (
        /* ── Expanded panel ─────────────────────────────────────── */
        <div className="glass-card overflow-hidden">
          {/* Input row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-tesla-border">
            {status === 'loading'
              ? <Spinner />
              : <SearchIcon className="text-tesla-subtle flex-shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or address…"
              className="
                flex-1 bg-transparent text-[14px] text-tesla-text
                placeholder:text-tesla-subtle outline-none min-w-0
              "
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-tesla-subtle hover:text-tesla-text w-7 h-7
                           flex items-center justify-center flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              onClick={collapse}
              className="text-[13px] font-medium text-tesla-subtle hover:text-tesla-text
                         px-2 py-1 flex-shrink-0"
            >
              Cancel
            </button>
          </div>

          {/* Results */}
          {status === 'empty' && (
            <div className="px-4 py-4 text-[13px] text-tesla-subtle text-center">
              No results for "{query}"
            </div>
          )}
          {status === 'error' && (
            <div className="px-4 py-4 text-[13px] text-tesla-subtle text-center">
              Search unavailable — check connection
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.placeId}
              onClick={() => select(r)}
              className="
                w-full flex items-center gap-3 px-4 text-left
                active:bg-tesla-surface transition-colors
                border-b border-tesla-border last:border-0
              "
              style={{ height: '52px' }}
            >
              <PlaceIcon type={r.type} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-tesla-text truncate leading-tight">
                  {r.shortName}
                </div>
                <div className="text-[11px] text-tesla-subtle truncate mt-0.5 leading-tight">
                  {r.country}
                </div>
              </div>
              {i === 0 && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="#3a3a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#3a3a3a" strokeWidth="1.5" />
      <path d="M8 2 A6 6 0 0 1 14 8" stroke="#3d9df3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlaceIcon({ type }: { type: string }) {
  const isTown  = ['city','town','village','municipality','suburb','district'].includes(type)
  const isRoad  = ['highway','road','street','path'].includes(type)

  if (isTown) return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="2" y="8" width="4" height="6" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5" />
      <rect x="6" y="5" width="4" height="9" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5" />
      <rect x="10" y="7" width="4" height="7" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5" />
      <path d="M1 14h14" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )

  if (isRoad) return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M8 2v12M5 2l3 3 3-3" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <circle cx="8" cy="7" r="4" stroke="#8a8a8a" strokeWidth="1.3" />
      <path d="M8 11v3" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
