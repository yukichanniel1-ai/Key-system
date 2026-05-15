import type { NextApiRequest, NextApiResponse } from 'next'
import { findKeyByValue, updateKey } from '../../../lib/store'
import { isKeyExpired } from '../../../lib/keygen'
import { ValidateKeyResponse } from '../../../lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidateKeyResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ valid: false, reason: 'Method not allowed' })

  const { key } = req.body
  if (!key) return res.status(400).json({ valid: false, reason: 'key is required' })

  try {
    const found = await findKeyByValue(key)

    if (!found) return res.status(200).json({ valid: false, reason: 'Key not found' })
    if (found.revoked) return res.status(200).json({ valid: false, reason: 'Key has been revoked' })
    if (isKeyExpired(found.expiresAt)) return res.status(200).json({ valid: false, reason: 'Key has expired' })

    // Increment usage count
    found.usageCount = (found.usageCount || 0) + 1
    await updateKey(found)

    const { key: _k, ...safeKey } = found
    return res.status(200).json({ valid: true, key: safeKey })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ valid: false, reason: 'Internal server error' })
  }
}
