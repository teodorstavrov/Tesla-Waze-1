/**
 * Popup HTML for EV station markers.
 *
 * Tesla browser UX rules:
 * - Font size ≥ 13px everywhere (readable from driver's seat)
 * - Touch targets ≥ 44px (the Leaflet close button is overridden via CSS)
 * - High contrast values (bright colours on dark card)
 * - Only the most important info — no noise
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

export function buildPopupHTML(station: EVStation): string {
  const name    = stationDisplayName(station)
  const power   = maxPowerKw(station)
  const avail   = availabilityLabel(station)
  const source  = SOURCE_LABELS[station.source] ?? station.source.toUpperCase()

  const teslaBadge = station.isTesla
    ? `<span style="
        background:#e31937;color:white;
        font-size:10px;font-weight:700;
        padding:3px 8px;border-radius:20px;
        letter-spacing:0.06em;flex-shrink:0;
      ">TESLA</span>`
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
    <div style="
      padding:16px 18px 14px;
      min-width:240px;max-width:300px;
      font-family:Inter,system-ui,sans-serif;
      -webkit-font-smoothing:antialiased;
    ">
      <!-- Name + Tesla badge -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px;">
        <div style="font-size:15px;font-weight:600;color:#f0f0f0;line-height:1.3;flex:1;">
          ${name}
        </div>
        ${teslaBadge}
      </div>

      <!-- Key stats grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.1em;color:#555;margin-bottom:3px;">Source</div>
          <div style="font-size:13px;color:#aaa;">${source}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.1em;color:#555;margin-bottom:3px;">Max Power</div>
          <div style="font-size:15px;font-weight:700;color:#3d9df3;">
            ${power ? power + ' kW' : '—'}
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.1em;color:#555;margin-bottom:3px;">Availability</div>
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
      <div>
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;
                    letter-spacing:0.1em;color:#555;margin-bottom:4px;">Connectors</div>
        ${connectorList}
      </div>` : ''}

      <!-- Address -->
      ${station.address ? `
      <div style="margin-top:10px;font-size:12px;color:#666;line-height:1.4;">
        ${station.address}
      </div>` : ''}
    </div>
  `
}
