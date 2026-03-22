/**
 * SatelliteButton — bottom-left tile-style toggle.
 * Switches between standard OSM and Esri World Imagery (satellite).
 * Esri World Imagery is free for development/non-commercial use with attribution.
 *
 * The satellite layer is added ON TOP of the existing base tile layer —
 * this means the existing dark/light tile-swap logic in MapShell still works.
 */
import { useState } from 'react'
import type { Map as LMap, TileLayer } from 'leaflet'
import { L } from '@/lib/leaflet'

// Esri World Imagery — free tier, proper attribution required
const SATELLITE_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'

interface Props {
  map:    LMap | null
  isDark: boolean
}

// Track the injected satellite layer outside React (stable ref)
let _satLayer: TileLayer | null = null

export function SatelliteButton({ map, isDark }: Props) {
  const [satellite, setSatellite] = useState(false)

  const toggle = () => {
    if (!map) return
    const next = !satellite

    if (next) {
      // Add satellite layer on top of the current tile layer
      _satLayer = L.tileLayer(SATELLITE_URL, {
        attribution: SATELLITE_ATTR,
        maxZoom:     19,
        opacity:     1,
      }).addTo(map)
      console.log('[map] satellite enabled')
    } else {
      _satLayer?.remove()
      _satLayer = null
      console.log('[map] satellite disabled')
    }

    setSatellite(next)
  }

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggle()
  }

  return (
    <button
      onClick={toggle}
      onTouchEnd={handleTouch}
      aria-label={satellite ? 'Стандартна карта' : 'Сателитна карта'}
      style={{
        position:     'fixed',
        bottom:       296,
        left:         16,
        zIndex:       1000,
        width:        52,
        height:       52,
        borderRadius: 14,
        border:       satellite
          ? '2px solid rgba(61,157,243,0.8)'
          : '1.5px solid rgba(255,255,255,0.14)',
        background:   satellite
          ? 'rgba(61,157,243,0.20)'
          : isDark ? 'rgba(20,24,34,0.88)' : 'rgba(255,255,255,0.88)',
        backdropFilter:         'blur(16px)',
        WebkitBackdropFilter:   'blur(16px)',
        boxShadow:    '0 2px 12px rgba(0,0,0,0.45)',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        transition:   'border 0.15s, background 0.15s',
      }}
    >
      {/* Satellite icon — globe suggesting imagery */}
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        {/* Globe circle */}
        <circle cx="13" cy="13" r="10" stroke={satellite ? '#3d9df3' : 'rgba(255,255,255,0.75)'} strokeWidth="1.8" fill="none"/>
        {/* Latitude lines */}
        <ellipse cx="13" cy="13" rx="5" ry="10" stroke={satellite ? '#3d9df3' : 'rgba(255,255,255,0.75)'} strokeWidth="1.4" fill="none"/>
        {/* Horizontal line */}
        <line x1="3" y1="13" x2="23" y2="13" stroke={satellite ? '#3d9df3' : 'rgba(255,255,255,0.75)'} strokeWidth="1.4"/>
        {/* Small orbit dot */}
        <circle cx="20" cy="6" r="2.2" fill={satellite ? '#3d9df3' : 'rgba(255,255,255,0.75)'}/>
        <line x1="18.5" y1="7.5" x2="16" y2="10" stroke={satellite ? '#3d9df3' : 'rgba(255,255,255,0.55)'} strokeWidth="1.2"/>
      </svg>
    </button>
  )
}
