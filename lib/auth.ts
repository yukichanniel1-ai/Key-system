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
  const expected = getAdminSecret()
  return secret === expected
}
