/**
 * Popup HTML for EV station markers.
 *
 * Tesla browser UX rules:
 * - Font size ≥ 13px everywhere (readable from driver's seat)
 * - Touch targets ≥ 44px
 * - High contrast on dark card
 * - Navigate button opens Google Maps directions from current location
 */
import type { EVStation } from './types'
import { stationDisplayName, maxPowerKw, availabilityLabel } from './utils'

const SOURCE_LABELS: Record<string, string> = {
  tesla: 'Tesla',
  ocm:   'OpenChargeMap',
  osm:   'OpenStreetMap',
}

const CONNECTOR_COLORS: Record<string, string> = {
  'Tesla Supercharger': '#e31937',
  'Tesla Destination':  '#e31937',
  'Tesla':              '#e31937',
  'CCS':                '#3d9df3',
  'CHAdeMO':            '#f5a623',
  'Type 2':             '#3dd68c',
}

function connectorColor(type: string): string {
  return CONNECTOR_COLORS[type] ?? '#8a8a8a'
}

function navigateUrl(lat: number, lng: number): string {
  // Google Maps directions from current location — works in Tesla Chromium browser
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

export function buildPopupHTML(station: EVStation): string {
  const name   = stationDisplayName(station)
  const power  = maxPowerKw(station)
  const avail  = availabilityLabel(station)
  const source = SOURCE_LABELS[station.source] ?? station.source.toUpperCase()
  const navUrl = navigateUrl(station.position.lat, station.position.lng)

  const teslaBadge = station.isTesla
    ? `<span style="background:#e31937;color:white;font-size:10px;font-weight:700;
                    padding:3px 8px;border-radius:20px;letter-spacing:0.06em;flex-shrink:0;">
        TESLA
       </span>`
    : ''

  const connectorList = station.connectors.slice(0, 5).map((c) => `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:5px 0;border-top:1px solid #222;">
      <div style="display:flex;align-items:center;gap:7px;">
        <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                     background:${connectorColor(c.type)};"></span>
        <span style="color:#c0c0c0;font-size:13px;">${c.type}</span>
      </div>
      <span style="color:#e8e8e8;font-size:13px;font-weight:600;">
        ${c.powerKw ? c.powerKw + ' kW' : '—'}
      </span>
    </div>`).join('')

  const availColor = station.availablePorts > 0 ? '#3dd68c' : '#e31937'

  return `
    <div style="font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;">

      <!-- Header -->
      <div style="padding:16px 18px 12px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;
                    gap:10px;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:600;color:#f0f0f0;line-height:1.3;flex:1;">
            ${name}
          </div>
          ${teslaBadge}
        </div>

        <!-- Stats grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                        letter-spacing:0.1em;color:#555;margin-bottom:3px;">Source</div>
            <div style="font-size:13px;color:#aaa;">${source}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                        letter-spacing:0.1em;color:#555;margin-bottom:3px;">Max Power</div>
            <div style="font-size:16px;font-weight:700;color:#3d9df3;">
              ${power ? power + ' kW' : '—'}
            </div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                        letter-spacing:0.1em;color:#555;margin-bottom:3px;">Ports</div>
            <div style="font-size:14px;font-weight:600;color:${availColor};">${avail}</div>
          </div>
          ${station.city ? `
          <div>
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                        letter-spacing:0.1em;color:#555;margin-bottom:3px;">City</div>
            <div style="font-size:13px;color:#e0e0e0;">${station.city}</div>
          </div>` : ''}
        </div>

        <!-- Connectors -->
        ${connectorList ? `
        <div style="margin-bottom:10px;">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.1em;color:#555;margin-bottom:4px;">Connectors</div>
          ${connectorList}
        </div>` : ''}

        <!-- Address -->
        ${station.address ? `
        <div style="font-size:12px;color:#555;line-height:1.4;margin-bottom:12px;">
          ${station.address}
        </div>` : ''}
      </div>

      <!-- Navigate button — full-width, 48px, easy to tap -->
      <a href="${navUrl}" target="_blank" rel="noopener"
         style="
           display:flex;align-items:center;justify-content:center;gap:8px;
           height:48px;
           background:rgba(61,157,243,0.12);
           border-top:1px solid #222;
           border-radius:0 0 14px 14px;
           color:#3d9df3;
           font-size:14px;font-weight:600;
           text-decoration:none;
           -webkit-tap-highlight-color:transparent;
         "
         ontouchstart="this.style.background='rgba(61,157,243,0.22)'"
         ontouchend="this.style.background='rgba(61,157,243,0.12)'"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L15 8L8 15" stroke="#3d9df3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1 8h14" stroke="#3d9df3" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        Navigate
      </a>
    </div>
  `
}
