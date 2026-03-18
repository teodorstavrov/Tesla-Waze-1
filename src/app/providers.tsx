/**
 * Root provider tree.
 * Phase 1: passthrough — add React Query / context providers here in later phases.
 */
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function Providers({ children }: Props) {
  return <>{children}</>
}
