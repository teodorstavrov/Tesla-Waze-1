/**
 * DELETE /api/events/:id  — remove a reported event by id
 */
import { eventsStore } from '../_lib/eventsStore.js'

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = req.query?.id as string
  if (!id) { res.status(400).json({ error: 'Missing id' }); return }

  try {
    await eventsStore.remove(id)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[events DELETE]', err)
    res.status(500).json({ error: 'Failed to remove event' })
  }
}
