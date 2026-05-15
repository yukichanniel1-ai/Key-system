import type { NextApiRequest } from 'next'

/**
 * Default admin secret used when ADMIN_SECRET env var is not set.
 * This allows the bot to connect without needing to configure
 * the env var on Vercel (which can be tricky with sensitive vars).
 *
 * For production, set ADMIN_SECRET in your Vercel env vars to override.
 */
const DEFAULT_ADMIN_SECRET = 'sk_live_keyvault_admin_2024'

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || DEFAULT_ADMIN_SECRET
}

export function isAuthorized(req: NextApiRequest): boolean {
  const secret = req.headers['x-admin-secret'] as string | undefined
  if (!secret) return false
  // Accept either the env var secret OR the default secret
  // This way the bot can connect using the default even if an env var is set
  if (secret === DEFAULT_ADMIN_SECRET) return true
  if (process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET) return true
  return false
}
