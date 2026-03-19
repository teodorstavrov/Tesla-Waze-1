import { create } from 'zustand'

interface ThemeState {
  isDark:  boolean
  toggle:  () => void
}

const saved = localStorage.getItem('mapTheme')

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: saved !== 'light',   // default dark
  toggle: () => set((s) => {
    const next = !s.isDark
    localStorage.setItem('mapTheme', next ? 'dark' : 'light')
    return { isDark: next }
  }),
}))
