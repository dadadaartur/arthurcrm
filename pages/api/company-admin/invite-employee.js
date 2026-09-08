import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_manage_employees') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { email, firstName, lastName, positionId, roleId, permissions } = req.body || {}
  const clean = String(email || '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(clean)) return res.status(400).json({ error: 'Некорректный email' })

  const { data: existing } = await a.from('profiles').select('user_id').eq('company_id', ctx.profile.company_id).eq('email', clean).is('deleted_at', null).maybeSingle()
  if (existing) return res.status(400).json({ error: 'Сотрудник уже в компании' })
  const { data: pend } = await a.from('invitations').select('id').eq('company_id', ctx.profile.company_id).eq('email', clean).eq('status', 'pending').maybeSingle()
  if (pend) return res.status(400).json({ error: 'Приглашение уже отправлено' })

  const { error } = await a.from('invitations').insert({
    company_id: ctx.profile.company_id, email: clean,
    payload: { firstName, lastName, positionId, roleId, permissions },
    status: 'pending', invited_by: ctx.user.id
  })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
