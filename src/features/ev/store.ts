/**
 * Zustand store for EV charging state.
 *
 * Key design: entitiesById is an accumulative dictionary — stations are NEVER
 * wiped, only merged. New fetches add/update entries. This prevents flicker
 * when panning, slow responses, or empty API returns.
 */
import { create } from 'zustand'
import type { EVStation, FilterMode } from './types'

type CoverageBbox = { north: number; south: number; east: number; west: number }

interface EVState {
  // ── Normalized entity store — NEVER wiped, only merged ────────────────────
  entitiesById: Record<string, EVStation>

  // ── Loading states — separate initial vs background ────────────────────────
  loadingInitial:    boolean   // true only on very first fetch (no data yet)
  loadingBackground: boolean   // true on background refreshes (data already shown)
  error:             string | null

  // ── Filters ───────────────────────────────────────────────────────────────
  filterMode: FilterMode

  // ── Visibility ────────────────────────────────────────────────────────────
  showStationsOnMap: boolean

  // ── Coverage tracking ─────────────────────────────────────────────────────
  coverageBbox: CoverageBbox | null

  // ── Actions ───────────────────────────────────────────────────────────────
  mergeStations:        (stations: EVStation[]) => void
  setLoadingInitial:    (v: boolean) => void
  setLoadingBackground: (v: boolean) => void
  setError:             (msg: string | null) => void
  setFilterMode:        (mode: FilterMode) => void
  setShowStationsOnMap: (v: boolean) => void
  setCoverageBbox:      (bbox: CoverageBbox | null) => void

  // ── Backward-compat shims (used by legacy callers) ─────────────────────────
  /** @deprecated Use mergeStations instead */
  setStations:     (stations: EVStation[]) => void
  /** @deprecated No-op — response metadata no longer stored */
  setLastResponse: (r: unknown) => void
  /** @deprecated Use setLoadingInitial or setLoadingBackground */
  setLoading:      (v: boolean) => void

  reset: () => void
}

const initialState = {
  entitiesById:      {} as Record<string, EVStation>,
  loadingInitial:    false,
  loadingBackground: false,
  error:             null,
  filterMode:        'all' as FilterMode,
  showStationsOnMap: localStorage.getItem('ev_show_on_map') !== 'false',
  coverageBbox:      null as CoverageBbox | null,
}

export const useEVStore = create<EVState>((set) => ({
  ...initialState,

  mergeStations: (stations) =>
    set((state) => {
      const next = { ...state.entitiesById }
      for (const s of stations) {
        next[s.id] = s
      }
      return { entitiesById: next }
    }),

  setLoadingInitial:    (loadingInitial)    => set({ loadingInitial }),
  setLoadingBackground: (loadingBackground) => set({ loadingBackground }),
  setError:             (error)             => set({ error }),
  setFilterMode:        (filterMode)        => set({ filterMode }),
  setCoverageBbox:      (coverageBbox)      => set({ coverageBbox }),

  setShowStationsOnMap: (v) => {
    localStorage.setItem('ev_show_on_map', String(v))
    set({ showStationsOnMap: v })
  },

  // Backward-compat shims
  setStations: (stations) =>
    set((state) => {
      const next = { ...state.entitiesById }
      for (const s of stations) {
        next[s.id] = s
      }
      return { entitiesById: next }
    }),
  setLastResponse: () => { /* no-op */ },
  setLoading:      (v) => set({ loadingInitial: v }),

  reset: () => set({ ...initialState, entitiesById: {} }),
}))

/** Selector: returns all stations as an array (derived from entitiesById). */
export function selectStations(state: EVState): EVStation[] {
  return Object.values(state.entitiesById)
}
