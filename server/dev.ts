/**
 * Local development API server — mirrors the Vercel handler on Express.
 * Run: npm run dev:api  (port 3001)
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { validateBboxQuery } from '../api/_lib/utils/validate.js'
import { aggregateStations } from '../api/_lib/merge/mergeStations.js'
import { fetchTomTomIncidents } from '../api/_lib/providers/tomtom.js'

const app  = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/ev/stations', async (req, res) => {
  const validation = validateBboxQuery(req.query as Record<string, string | undefined>)
  if (!validation.ok) { res.status(400).json({ error: validation.error }); return }

  try {
    const result = await aggregateStations(validation.bbox, {
      openChargeMapKey: process.env['OPENCHARGEMAP_API_KEY'],
      isDev: true,
    })
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      stations:         result.stations,
      sources:          result.sources,
      countBeforeDedup: result.countBeforeDedup,
      countAfterDedup:  result.stations.length,
      _debug:           result._debugMeta,
    })
  } catch (err) {
    console.error('[dev-api] Unexpected error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/traffic/incidents', async (req, res) => {
  const validation = validateBboxQuery(req.query as Record<string, string | undefined>)
  if (!validation.ok) { res.status(400).json({ error: validation.error }); return }

  const apiKey = process.env['TOMTOM_API_KEY']
  if (!apiKey) { res.json({ incidents: [], error: 'TOMTOM_API_KEY not set' }); return }

  try {
    const incidents = await fetchTomTomIncidents(validation.bbox, apiKey)
    res.setHeader('Cache-Control', 'no-store')
    res.json({ incidents })
  } catch (err) {
    console.error('[dev-api] TomTom error:', String(err))
    res.status(502).json({ incidents: [], error: String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`[dev-api] Running at http://localhost:${PORT}`)
  console.log(`[dev-api] OCM key: ${process.env['OPENCHARGEMAP_API_KEY'] ? 'set ✓' : 'not set (OCM disabled)'}`)
})
