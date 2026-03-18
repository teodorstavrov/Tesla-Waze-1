/**
 * Local development API server — mirrors the Vercel handler logic on Express.
 *
 * Run: npm run dev:api  (port 3001)
 * Vite proxies /api/* → http://localhost:3001
 *
 * Set environment variables in .env (copy from .env.example).
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { validateBboxQuery } from '../api/ev/utils/validate.js'
import { aggregateStations } from '../api/ev/merge/mergeStations.js'

const app  = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/ev/stations', async (req, res) => {
  const validation = validateBboxQuery(req.query as Record<string, string | undefined>)

  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

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

app.listen(PORT, () => {
  console.log(`[dev-api] Running at http://localhost:${PORT}`)
  console.log(`[dev-api] OCM key: ${process.env['OPENCHARGEMAP_API_KEY'] ? 'set ✓' : 'not set (OCM disabled)'}`)
})
