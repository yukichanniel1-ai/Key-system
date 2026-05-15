import { v4 as uuidv4 } from 'uuid'
import { KeyFormat, KeyTier } from './types'

export function generateKeyValue(format: KeyFormat, tier: KeyTier): string {
  switch (format) {
    case 'uuid':
      return uuidv4()
    case 'hex':
      return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    case 'alphanum':
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
      const arr = crypto.getRandomValues(new Uint8Array(24))
      return Array.from(arr).map(b => chars[b % chars.length]).join('')
    case 'prefix':
      const pfx = { free: 'free', pro: 'pro', enterprise: 'ent', admin: 'adm' }[tier]
      const seg1 = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
      const seg2 = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
      return `${pfx}_${seg1}_${seg2}`
    default:
      return uuidv4()
  }
}

export function isKeyExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false
  return Date.now() > expiresAt
}
