import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Bot state persistence endpoint.
 * Stores/retrieves arbitrary JSON blobs keyed by name.
 * Used by the Telegram bot to persist user profiles, active sessions, etc.
 * across Railway redeploys via Vercel KV.
 *
 * GET  /api/bot/state?key=<name>  → returns the stored JSON
 * POST /api/bot/state             → body: { key: string, data: any }
 * DELETE /api/bot/state?key=<name> → removes the stored data
 */

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  const { kv } = await import('@vercel/kv')
  return kv
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth check
  const secret = req.headers['x-admin-secret']
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const kv = await getKV()
  if (!kv) {
    return res.status(503).json({ error: 'KV store not available' })
  }

  if (req.method === 'GET') {
    const key = req.query.key as string
    if (!key) return res.status(400).json({ error: 'key query param required' })

    try {
      const raw = await kv.get<string>(`bot:${key}`)
      if (!raw) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json({ key, data: typeof raw === 'string' ? JSON.parse(raw) : raw })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to read state' })
    }
  }

  if (req.method === 'POST') {
    const { key, data } = req.body
    if (!key) return res.status(400).json({ error: 'key is required' })

    try {
      await kv.set(`bot:${key}`, JSON.stringify(data))
      return res.status(200).json({ ok: true, key })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to save state' })
    }
  }

  if (req.method === 'DELETE') {
    const key = req.query.key as string
    if (!key) return res.status(400).json({ error: 'key query param required' })

    try {
      await kv.del(`bot:${key}`)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to delete state' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
