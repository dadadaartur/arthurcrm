import { requireAuth, ADMIN_ROLE_IDS } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { allowedRoles: ADMIN_ROLE_IDS })
  if (!ctx) return // requireAuth уже отправил 401/403

  return res.status(200).json({ profile: ctx.profile })
}
