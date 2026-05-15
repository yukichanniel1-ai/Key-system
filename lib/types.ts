export type KeyTier = 'free' | 'vip'
export type KeyFormat = 'uuid' | 'hex' | 'alphanum' | 'prefix'

export interface ApiKey {
  id: string
  key: string
  label: string
  tier: KeyTier
  rateLimit: string
  threads: number
  createdAt: number
  expiresAt: number | null
  revoked: boolean
  revokedAt?: number
  usageCount: number
}

export interface CreateKeyRequest {
  label?: string
  tier: KeyTier
  format: KeyFormat
  expiryDays: number
  rateLimit: string
  threads: number
}

export interface ValidateKeyResponse {
  valid: boolean
  reason?: string
  key?: Omit<ApiKey, 'key'>
}
