/**
 * Zustand store for EV charging state.
 * Phase 1: structure only — data fetching added in Phase 4.
 */
import { create } from 'zustand'
import type { EVStation, FilterMode, StationsResponse } from './types'

interface EVState {
  // ── Data ──────────────────────────────────────────────────────
  stations: EVStation[]
  lastResponse: StationsResponse | null

  // ── Loading / error ───────────────────────────────────────────
  loading: boolean
  error: string | null

  // ── Filters ───────────────────────────────────────────────────
  filterMode: FilterMode

  // ── Visibility ────────────────────────────────────────────────
  showStationsOnMap: boolean

  // ── Actions ───────────────────────────────────────────────────
  setStations: (stations: EVStation[]) => void
  setLastResponse: (r: StationsResponse) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  setFilterMode: (mode: FilterMode) => void
  setShowStationsOnMap: (v: boolean) => void
  reset: () => void
}

const initialState = {
  stations: [],
  lastResponse: null,
  loading: false,
  error: null,
  filterMode: 'all' as FilterMode,
  showStationsOnMap: localStorage.getItem('ev_show_on_map') !== 'false',
}

export const useEVStore = create<EVState>((set) => ({
  ...initialState,

  setStations: (stations) => set({ stations }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilterMode: (filterMode) => set({ filterMode }),
  setShowStationsOnMap: (v) => {
    localStorage.setItem('ev_show_on_map', String(v))
    set({ showStationsOnMap: v })
  },
  reset: () => set(initialState),
}))
