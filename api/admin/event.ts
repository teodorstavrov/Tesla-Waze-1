/**
 * POST /api/admin/event
 * Header: Authorization: Bearer <ADMIN_TOKEN>
 * Body:   { type, lat, lng }
 *
 * Adds an event directly to the shared Redis store.
 * Only requests with the correct ADMIN_TOKEN are accepted.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eventsStore } from '../_lib/eventsStore.js'

const VALID_TYPES = new Set(['police', 'camera', 'accident', 'danger'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return }

  // Auth check
  const authHeader = String(req.headers['authorization'] ?? '')
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const adminToken = process.env['ADMIN_TOKEN']

  if (!adminToken || !token || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { type, lat, lng } = req.body ?? {}

  if (!type || !VALID_TYPES.has(String(type)) || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing or invalid fields: type, lat, lng required' })
  }

  const ev = {
    id:            `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type:          String(type),
    lat:           Number(lat),
    lng:           Number(lng),
    timestamp:     Date.now(),
    confirmations: 0,
  }

  try {
    await eventsStore.add(ev)
    return res.status(201).json({ ok: true, event: ev })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/event]', err)
    return res.status(500).json({ error: 'Failed to save event', detail: msg })
  }
}
