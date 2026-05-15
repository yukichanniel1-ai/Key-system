export type KeyTier = 'free' | 'pro' | 'enterprise' | 'admin'
export type KeyFormat = 'uuid' | 'hex' | 'alphanum' | 'prefix'

export interface ApiKey {
  id: string
  key: string
  label: string
  tier: KeyTier
  rateLimit: string
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
}

export interface ValidateKeyResponse {
  valid: boolean
  reason?: string
  key?: Omit<ApiKey, 'key'>
}
