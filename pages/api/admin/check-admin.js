import { requireAuth, isSuperAdmin, isCompanyAdmin } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res)
  if (!ctx) return

  const isAdmin = isSuperAdmin(ctx.profile) || isCompanyAdmin(ctx.profile)
  if (!isAdmin) {
    return res.status(403).json({ error: 'Не администратор' })
  }

  return res.status(200).json({ profile: ctx.profile })
}
