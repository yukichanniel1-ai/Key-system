import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteKey, getAllKeys } from '../../../lib/store'
import { isAuthorized } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'id is required' })

  try {
    const all = await getAllKeys()
    const found = all.find(k => k.id === id)
    if (!found) return res.status(404).json({ error: 'Key not found' })

    await deleteKey(id)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to delete key' })
  }
}
