import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_manage_employees') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { invitationId } = req.body || {}
  if (!invitationId) return res.status(400).json({ error: 'Нет invitationId' })
  const { error } = await a.from('invitations').update({ status: 'cancelled' }).eq('id', invitationId).eq('company_id', ctx.profile.company_id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
