/**
 * Marker icons for EV stations.
 *
 * Tesla browser constraints:
 * - No WebGL — DivIcon with inline SVG is the right choice
 * - HiDPI screen — crisp vector SVG, no bitmap
 * - Touch targets — icons sized 36×46px (larger than Phase 1)
 * - High contrast against dark map tile tint
 */
import { L } from '@/lib/leaflet'

function makeSVGIcon(svg: string, size: [number, number]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   size,
    iconAnchor: [size[0] / 2, size[1]],      // bottom-centre anchor
    popupAnchor:[0, -(size[1] - 4)],
  })
}

// ── Tesla Supercharger marker — red teardrop ──────────────────────────────────
const teslaSVG = `
<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ts" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.65"/>
    </filter>
  </defs>
  <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 28 18 28S36 31.5 36 18C36 8.059 27.941 0 18 0z"
        fill="#e31937" filter="url(#ts)"/>
  <!-- Tesla T letterform -->
  <rect x="10" y="13" width="16" height="2.5" fill="white" rx="1"/>
  <rect x="16" y="13" width="4" height="13" fill="white" rx="1"/>
</svg>`

// ── Generic EV station marker — orange teardrop ───────────────────────────────
const evSVG = `
<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ev" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.6"/>
    </filter>
  </defs>
  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26S32 28 32 16C32 7.163 24.837 0 16 0z"
        fill="#f5a623" filter="url(#ev)"/>
  <!-- Lightning bolt -->
  <path d="M18.5 8 L12 18h5l-1.5 8 7-11h-5z" fill="white"/>
</svg>`

export const teslaIcon = makeSVGIcon(teslaSVG, [36, 46])
export const evIcon    = makeSVGIcon(evSVG,    [32, 42])

export function iconForStation(isTesla: boolean): L.DivIcon {
  return isTesla ? teslaIcon : evIcon
}
