/**
 * Tesla-optimised zoom controls.
 * Minimum 56px touch targets — operable with one finger while driving.
 */
import type { Map as LMap } from 'leaflet'

interface Props {
  map: LMap | null
}

export function ZoomControls({ map }: Props) {
  const zoomIn  = () => map?.zoomIn()
  const zoomOut = () => map?.zoomOut()

  return (
    <div className="absolute right-4 bottom-6 z-[1000] flex flex-col gap-2">
      <ZoomBtn onClick={zoomIn} label="Zoom in" icon="+" />
      <ZoomBtn onClick={zoomOut} label="Zoom out" icon="−" />
    </div>
  )
}

function ZoomBtn({
  onClick,
  label,
  icon,
}: {
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ width: 96, height: 96, borderRadius: 24, fontSize: 36, fontWeight: 300 }}
      className="
        glass-card flex items-center justify-center text-tesla-text
        active:scale-95 active:bg-tesla-muted
        transition-transform duration-100 select-none
      "
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {icon}
    </button>
  )
}
