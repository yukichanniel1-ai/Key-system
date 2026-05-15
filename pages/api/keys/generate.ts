import type { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'
import { generateKeyValue } from '../../../lib/keygen'
import { saveKey } from '../../../lib/store'
import { ApiKey, CreateKeyRequest } from '../../../lib/types'
import { isAuthorized } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { label, tier, format, expiryDays, rateLimit, threads, maxRedemptions } = req.body as CreateKeyRequest

    if (!tier || !format) return res.status(400).json({ error: 'tier and format are required' })

    const id = uuidv4()
    const keyValue = generateKeyValue(format, tier)
    const now = Date.now()
    const expiresAt = expiryDays > 0 ? now + expiryDays * 86400000 : null

    const apiKey: ApiKey = {
      id,
      key: keyValue,
      label: label || `${tier}-key`,
      tier,
      rateLimit: rateLimit || '1000',
      threads: threads || 1,
      createdAt: now,
      expiresAt,
      revoked: false,
      usageCount: 0,
      maxRedemptions: maxRedemptions ?? null,
      redemptionCount: 0,
    }

    await saveKey(apiKey)
    return res.status(201).json(apiKey)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to generate key' })
  }
}
