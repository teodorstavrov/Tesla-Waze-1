/**
 * Geocoding search bar — powered by Nominatim (OSM) + OCM station search.
 *
 * Tesla UX:
 * - Collapsed: shows last search name
 * - Expanded empty: recent searches
 * - Expanded typing: Nominatim places + OCM EV stations (parallel)
 * - Station selection: pans map, adds temporary spotlight marker
 * - Last 5 searches persisted in localStorage
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Map as LMap, Marker } from 'leaflet'
import { L }                       from '@/lib/leaflet'
import { geocode, type GeoResult } from '@/lib/nominatim'
import { searchStations }          from '@/lib/evSearch'
import type { StationSearchResult } from '@/lib/evSearch'
import { haversine }               from '@/lib/haversine'

interface Props {
  map:     LMap | null
  onPlace: (lat: number, lng: number) => void
}

const DEBOUNCE_MS = 500
const MIN_QUERY   = 2
const HISTORY_KEY = 'search_history'
const HISTORY_MAX = 5

interface HistoryEntry {
  placeId:   number
  shortName: string
  country:   string
  type:      string
  lat:       number
  lng:       number
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(e: HistoryEntry) {
  const updated = [e, ...loadHistory().filter((h) => h.placeId !== e.placeId)].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}
function removeFromHistory(id: number) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((h) => h.placeId !== id)))
}

/** Temporary pin placed on the map when an EV station is selected from search. */
function spotlightMarker(map: LMap, lat: number, lng: number, name: string): Marker {
  const icon = L.divIcon({
    html: `
      <div style="
        position:relative;display:flex;flex-direction:column;align-items:center;
      ">
        <div style="
          background:#3d9df3;color:white;font-size:12px;font-weight:700;
          padding:5px 10px;border-radius:8px;white-space:nowrap;
          box-shadow:0 3px 14px rgba(0,0,0,0.5);max-width:200px;
          overflow:hidden;text-overflow:ellipsis;
        ">${name}</div>
        <div style="
          width:0;height:0;
          border-left:7px solid transparent;
          border-right:7px solid transparent;
          border-top:9px solid #3d9df3;
        "></div>
        <div style="
          width:12px;height:12px;border-radius:50%;
          background:#3d9df3;border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
          margin-top:-2px;
        "></div>
      </div>`,
    className:  '',
    iconAnchor: [100, 38],
    iconSize:   [200, 38],
  })
  const marker = L.marker([lat, lng], { icon, zIndexOffset: 2000 }).addTo(map)
  // Auto-remove after 8 s or on next map move
  const remove = () => { try { marker.remove() } catch { /* already gone */ } }
  setTimeout(remove, 8_000)
  map.once('movestart', remove)
  return marker
}

export function SearchBar({ map, onPlace }: Props) {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [places,     setPlaces]     = useState<GeoResult[]>([])
  const [evResults,  setEvResults]  = useState<StationSearchResult[]>([])
  const [history,    setHistory]    = useState<HistoryEntry[]>([])
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced parallel search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setPlaces([]); setEvResults([]); setStatus('idle'); return
    }

    setStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const [geoList, evList] = await Promise.all([
          geocode(q).catch(() => [] as GeoResult[]),
          searchStations(q).catch(() => [] as StationSearchResult[]),
        ])

        // Sort by distance from map center (or GPS if available)
        const ref = map?.getCenter()
        if (ref) {
          const dist = (lat: number, lng: number) => haversine(ref.lat, ref.lng, lat, lng)
          geoList.sort((a, b) => dist(a.lat, a.lng) - dist(b.lat, b.lng))
          evList.sort((a, b)  => dist(a.lat, a.lng) - dist(b.lat, b.lng))
        }

        setPlaces(geoList)
        setEvResults(evList)
        setStatus(geoList.length === 0 && evList.length === 0 ? 'empty' : 'idle')
      } catch {
        setPlaces([]); setEvResults([]); setStatus('error')
      }
    }, DEBOUNCE_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const expand = useCallback(() => {
    setHistory(loadHistory()); setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const collapse = useCallback(() => {
    setOpen(false); setQuery('')
    setPlaces([]); setEvResults([]); setStatus('idle')
  }, [])

  const selectPlace = useCallback((r: GeoResult | HistoryEntry) => {
    if (!map) return
    map.setView([r.lat, r.lng], 13, { animate: true })
    onPlace(r.lat, r.lng)
    const entry: HistoryEntry = {
      placeId: r.placeId, shortName: r.shortName,
      country: r.country, type: r.type, lat: r.lat, lng: r.lng,
    }
    saveHistory(entry)
    setHistory(loadHistory())
    collapse()
  }, [map, onPlace, collapse])

  const selectStation = useCallback((s: StationSearchResult) => {
    if (!map) return
    map.setView([s.lat, s.lng], 15, { animate: true })
    onPlace(s.lat, s.lng)
    spotlightMarker(map, s.lat, s.lng, s.name)
    collapse()
  }, [map, onPlace, collapse])

  const deleteHistory = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    removeFromHistory(id)
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') collapse() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, collapse])

  const lastSearch    = loadHistory()[0]
  const showHistory   = open && query.trim().length < MIN_QUERY && history.length > 0
  const hasResults    = places.length > 0 || evResults.length > 0

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]"
         style={{ width: 'min(340px, calc(100vw - 230px))' }}>
      {!open ? (
        /* ── Collapsed pill ─────────────────────────────────────── */
        <button
          onClick={expand}
          className="glass-card w-full flex items-center gap-2.5 px-4 py-3
                     active:scale-95 transition-transform duration-100"
        >
          <SearchIcon className="text-tesla-subtle flex-shrink-0" />
          <span className="text-[13px] text-tesla-subtle truncate">
            {lastSearch ? lastSearch.shortName : 'Търси град, адрес или зарядна…'}
          </span>
        </button>
      ) : (
        /* ── Expanded panel ─────────────────────────────────────── */
        <div className="glass-card overflow-hidden">
          {/* Input row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-tesla-border">
            {status === 'loading' ? <Spinner /> : <SearchIcon className="text-tesla-subtle flex-shrink-0" />}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Търси град, адрес или зарядна…"
              className="flex-1 bg-transparent text-[14px] text-tesla-text
                         placeholder:text-tesla-subtle outline-none min-w-0"
              autoComplete="off" autoCorrect="off" spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="text-tesla-subtle hover:text-tesla-text w-7 h-7
                           flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button onClick={collapse}
              className="text-[13px] font-medium text-tesla-subtle hover:text-tesla-text px-2 py-1 flex-shrink-0">
              Отказ
            </button>
          </div>

          {/* Recent searches */}
          {showHistory && (
            <>
              <div className="px-4 pt-2.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-tesla-subtle">
                  Последни търсения
                </span>
              </div>
              {history.map((h) => (
                <div key={h.placeId} className="flex items-center border-b border-tesla-border last:border-0">
                  <button onClick={() => selectPlace(h)}
                    className="flex items-center gap-3 px-4 text-left flex-1 active:bg-tesla-surface"
                    style={{ height: '52px' }}>
                    <ClockIcon />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-tesla-text truncate leading-tight">{h.shortName}</div>
                      <div className="text-[11px] text-tesla-subtle truncate mt-0.5 leading-tight">{h.country}</div>
                    </div>
                  </button>
                  <button onClick={(e) => deleteHistory(e, h.placeId)}
                    className="w-10 h-[52px] flex items-center justify-center text-tesla-subtle hover:text-tesla-text flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Status messages */}
          {status === 'empty' && (
            <div className="px-4 py-4 text-[13px] text-tesla-subtle text-center">
              Няма резултати за „{query}"
            </div>
          )}
          {status === 'error' && (
            <div className="px-4 py-4 text-[13px] text-tesla-subtle text-center">
              Търсенето е недостъпно — провери връзката
            </div>
          )}

          {/* Places section */}
          {places.length > 0 && (
            <>
              {evResults.length > 0 && (
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-tesla-subtle">Места</span>
                </div>
              )}
              {places.slice(0, 4).map((r, i) => (
                <button key={r.placeId} onClick={() => selectPlace(r)}
                  className="w-full flex items-center gap-3 px-4 text-left active:bg-tesla-surface
                             border-b border-tesla-border last:border-0"
                  style={{ height: '52px' }}>
                  <PlaceIcon type={r.type} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-tesla-text truncate leading-tight">{r.shortName}</div>
                    <div className="text-[11px] text-tesla-subtle truncate mt-0.5 leading-tight">{r.country}</div>
                  </div>
                  {i === 0 && !evResults.length && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="#3a3a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </>
          )}

          {/* EV stations section */}
          {evResults.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1 border-t border-tesla-border">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-tesla-subtle">
                  Зарядни станции
                </span>
              </div>
              {evResults.map((s) => (
                <button key={s.id} onClick={() => selectStation(s)}
                  className="w-full flex items-center gap-3 px-4 text-left active:bg-tesla-surface
                             border-b border-tesla-border last:border-0"
                  style={{ height: '56px' }}>
                  <EVSearchIcon isTesla={s.isTesla} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-tesla-text truncate leading-tight">{s.name}</div>
                    <div className="text-[11px] text-tesla-subtle truncate mt-0.5 leading-tight">
                      {s.operator ? `${s.operator} · ` : ''}{s.city}
                    </div>
                  </div>
                  {s.totalPorts > 0 && (
                    <span className="text-[11px] text-tesla-subtle flex-shrink-0">{s.totalPorts} порта</span>
                  )}
                </button>
              ))}
            </>
          )}

          {/* No-results padding */}
          {!showHistory && !hasResults && status === 'idle' && query.trim().length >= MIN_QUERY && (
            <div className="px-4 py-3 text-[13px] text-tesla-subtle text-center">Търсене…</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-tesla-subtle">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#3a3a3a" strokeWidth="1.5"/>
      <path d="M8 2 A6 6 0 0 1 14 8" stroke="#3d9df3" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function EVSearchIcon({ isTesla }: { isTesla: boolean }) {
  const color = isTesla ? '#e31937' : '#3d9df3'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="1" y="5" width="11" height="7" rx="2" stroke={color} strokeWidth="1.3"/>
      <path d="M12 7.5v2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 7l-1.5 3h2.5l-1 3.5 4-4.5H9l1-2z" fill={color}/>
    </svg>
  )
}

function PlaceIcon({ type }: { type: string }) {
  const isTown = ['city','town','village','municipality','suburb','district'].includes(type)
  const isRoad = ['highway','road','street','path'].includes(type)
  if (isTown) return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="2" y="8" width="4" height="6" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5"/>
      <rect x="6" y="5" width="4" height="9" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5"/>
      <rect x="10" y="7" width="4" height="7" stroke="#8a8a8a" strokeWidth="1.3" rx="0.5"/>
      <path d="M1 14h14" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  if (isRoad) return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M8 2v12M5 2l3 3 3-3" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <circle cx="8" cy="7" r="4" stroke="#8a8a8a" strokeWidth="1.3"/>
      <path d="M8 11v3" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}
