# Tesla EV Navigator

A fast, dark-theme EV charging station map built specifically for the Tesla in-car browser.

![Dark map showing EV charging stations clustered around Sofia, Bulgaria](https://raw.githubusercontent.com/teodorstavrov/Tesla-Waze-1/main/public/favicon.svg)

## Features

- **Three data sources** — Tesla Superchargers, OpenChargeMap, OpenStreetMap/Overpass
- **Smart deduplication** — geographic proximity merge (100 m threshold), no duplicate pins
- **Marker clustering** — dark-themed clusters that expand on tap
- **Navigate button** — tap any station → opens Google Maps directions
- **GPS location** — centers map on your current position
- **Auto-refresh** — stations update every 2 minutes while parked
- **Filter bar** — All / Tesla / Non-Tesla / Available
- **Offline-resilient** — one failing source never blocks the others
- **Tesla browser optimised** — canvas renderer, 44px+ touch targets, no backdrop-blur, stripped payloads

## Quick Start (local dev)

```bash
git clone https://github.com/teodorstavrov/Tesla-Waze-1.git
cd Tesla-Waze-1
npm install

# Copy env template
cp .env.example .env
# Optionally add OPENCHARGEMAP_API_KEY to .env

# Terminal 1 — API server (port 3001)
npm run dev:api

# Terminal 2 — Frontend (port 5173)
npm run dev
```

Open `http://localhost:5173`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENCHARGEMAP_API_KEY` | Optional | Get free key at [openchargemap.org](https://openchargemap.org/site/develop/api). Without it, OCM data is skipped — Tesla + OSM still work. |

## Deploy to Vercel

1. Push to GitHub (already done)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `Tesla-Waze-1`
3. Framework: **Other** (not Next.js)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable: `OPENCHARGEMAP_API_KEY` = your key
7. Deploy

The API route `/api/ev/stations` is a single Vercel serverless function (Hobby plan compatible).

## Architecture

```
/
├── src/                    # React frontend (Vite)
│   ├── app/                # App root + providers
│   ├── components/         # UI components
│   └── features/ev/        # EV domain — store, hooks, icons, popups
├── api/
│   ├── ev/stations.ts      # Single Vercel serverless function
│   └── _lib/               # Shared API logic (ignored by Vercel router)
│       ├── providers/      # Tesla / OCM / Overpass fetch
│       ├── normalize/      # Raw → EVStation normalisation
│       ├── merge/          # Dedup + aggregation
│       └── utils/          # Geo, validation, cache, debug
└── server/dev.ts           # Local Express API (npm run dev:api)
```

## Data Sources

| Source | Data | Key needed |
|---|---|---|
| [supercharge.info](https://supercharge.info) | Tesla Superchargers globally | No |
| [OpenChargeMap](https://openchargemap.org) | Rich EV data, real-time availability | Yes (free) |
| [Overpass API](https://overpass-api.de) | OpenStreetMap EV nodes/ways | No |

## Tesla Browser Notes

The app is optimised for the Tesla in-car Chromium browser:
- `preferCanvas: true` — Canvas renderer avoids SVG overhead on Tegra SoC
- No `backdrop-filter` — prevents GPU layer promotion jank
- 44–56px touch targets throughout
- `bounceAtZoomLimits: false`, `fadeAnimation: false` — saves paint cycles
- Response payload stripped of raw provider data (~75% smaller)
- `viewport-fit=cover` + `user-scalable=no` meta tags
