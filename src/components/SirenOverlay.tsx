/**
 * Full-screen blue/red flashing overlay shown when approaching police.
 * Auto-dismisses after 4 seconds.
 */
import { useEffect, useRef } from 'react'

interface Props {
  active: boolean
  onDone: () => void
}

export function SirenOverlay({ active, onDone }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (active) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(onDone, 4_000)
    }
    return () => clearTimeout(timerRef.current)
  }, [active, onDone])

  if (!active) return null

  return <div className="siren-overlay" aria-hidden />
}
