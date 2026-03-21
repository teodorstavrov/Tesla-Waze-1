/**
 * POST /api/admin/verify
 * Body: { password: string }
 *
 * Compares the submitted password against the ADMIN_TOKEN env var.
 * If they match, returns the token so the client can use it for admin events.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return }

  const { password } = req.body ?? {}
  if (!password) { res.status(400).json({ error: 'Missing password' }); return }

  const adminToken = process.env['ADMIN_TOKEN']
  if (!adminToken) {
    return res.status(500).json({ error: 'ADMIN_TOKEN not configured on server' })
  }

  if (String(password) !== adminToken) {
    // Constant-time-ish delay to slow brute force
    await new Promise((r) => setTimeout(r, 500))
    return res.status(403).json({ error: 'Грешна парола' })
  }

  return res.status(200).json({ ok: true, token: adminToken })
}
