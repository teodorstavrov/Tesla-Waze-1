import { create } from 'zustand'
import type { Route } from './types'

interface RouteState {
  route:      Route | null
  loading:    boolean
  error:      string | null
  setRoute:   (route: Route | null) => void
  setLoading: (loading: boolean) => void
  setError:   (error: string | null) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  route:      null,
  loading:    false,
  error:      null,
  setRoute:   (route)   => set({ route, error: null }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error, loading: false }),
}))
