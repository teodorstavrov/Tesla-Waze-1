/**
 * GET  /api/events   — return all reported events
 * POST /api/events   — add a new event { id, type, lat, lng, timestamp }
 */
import { eventsStore } from '../_lib/eventsStore.js'

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  if (req.method === 'GET') {
    try {
      const events = await eventsStore.getAll()
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).json({ events })
    } catch (err) {
      console.error('[events GET]', err)
      res.status(500).json({ error: 'Failed to load events' })
    }
    return
  }

  if (req.method === 'POST') {
    const { id, type, lat, lng, timestamp } = req.body ?? {}
    if (!id || !type || lat == null || lng == null || !timestamp) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }
    try {
      await eventsStore.add({
        id:        String(id),
        type:      String(type),
        lat:       Number(lat),
        lng:       Number(lng),
        timestamp: Number(timestamp),
      })
      res.status(201).json({ ok: true })
    } catch (err) {
      console.error('[events POST]', err)
      res.status(500).json({ error: 'Failed to save event' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
