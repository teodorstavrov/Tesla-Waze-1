import { create } from 'zustand'
import type { Route } from './types'

interface RouteState {
  route:           Route | null
  alternatives:    Route[] | null   // candidate routes shown before user picks
  loading:         boolean
  error:           string | null
  setRoute:        (route: Route | null) => void
  setAlternatives: (alts: Route[] | null) => void
  setLoading:      (loading: boolean) => void
  setError:        (error: string | null) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  route:           null,
  alternatives:    null,
  loading:         false,
  error:           null,
  // Selecting a route always clears alternatives
  setRoute:        (route) => set({ route, alternatives: null, error: null }),
  setAlternatives: (alternatives) => set({ alternatives }),
  setLoading:      (loading) => set({ loading }),
  setError:        (error)   => set({ error, loading: false }),
}))
