import { create } from 'zustand'
import type { Incident } from './types'

interface IncidentState {
  incidents:  Incident[]
  visible:    boolean
  loading:    boolean
  setIncidents: (incidents: Incident[]) => void
  setVisible:   (visible: boolean) => void
  setLoading:   (loading: boolean) => void
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents:    [],
  visible:      true,
  loading:      false,
  setIncidents: (incidents) => set({ incidents }),
  setVisible:   (visible)   => set({ visible }),
  setLoading:   (loading)   => set({ loading }),
}))
