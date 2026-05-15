import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllKeys } from '../../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const secret = req.headers['x-admin-secret']
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const keys = await getAllKeys()
    keys.sort((a, b) => b.createdAt - a.createdAt)
    return res.status(200).json(keys)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch keys' })
  }
}
