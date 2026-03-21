/**
 * POST /api/admin/verify
 * Body: { credential: string }  — Google ID token from Sign-In button
 *
 * Verifies the token with Google, checks email matches the allowed admin,
 * and returns the ADMIN_TOKEN env var to use in subsequent requests.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_EMAIL = 'teodorstavrov@gmail.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return }

  const { credential } = req.body ?? {}
  if (!credential) { res.status(400).json({ error: 'Missing credential' }); return }

  try {
    // Verify the Google ID token via Google's public endpoint
    const gRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(8_000) },
    )

    if (!gRes.ok) {
      return res.status(401).json({ error: 'Invalid Google credential' })
    }

    const payload = await gRes.json() as { email?: string; email_verified?: string }

    if (!payload.email || payload.email !== ALLOWED_EMAIL || payload.email_verified !== 'true') {
      return res.status(403).json({ error: 'Not authorised' })
    }

    const adminToken = process.env['ADMIN_TOKEN']
    if (!adminToken) {
      return res.status(500).json({ error: 'ADMIN_TOKEN not configured on server' })
    }

    return res.status(200).json({ ok: true, token: adminToken })
  } catch (err) {
    console.error('[admin/verify]', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
