/**
 * Leaflet singleton initialisation.
 *
 * Leaflet patches its icon URLs at import time, so we handle the Vite asset
 * path fix here once, centrally.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// We use only custom DivIcons (SVG markers), so the default Leaflet icon
// paths don't matter. Suppress the broken-URL warning by pointing to empty strings.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '' })

export { L }

/** Sofia, Bulgaria — default map center */
export const SOFIA_CENTER: [number, number] = [42.6977, 23.3219]
export const DEFAULT_ZOOM = 16
export const MIN_ZOOM = 5
export const MAX_ZOOM = 18

/** Tile layers */
export const TILES = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}
export const OSM_TILE_URL   = TILES.dark   // legacy alias
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
