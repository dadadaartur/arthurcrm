// РАНЬШЕ: requireAuth(req, res, {}) без permission — список ожидающих
// приглашений (email + назначаемые права) видел любой сотрудник компании,
// а не только тот, кто реально управляет сотрудниками. Приведено к тому же
// правилу, что уже используют cancel-invite.js и invite-employee.js.
import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_manage_employees')) {
    return res.status(403).json({ error: 'Недостаточно прав для просмотра приглашений' })
  }
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await a.from('invitations').select('*')
    .eq('company_id', ctx.profile.company_id).eq('status', 'pending').order('created_at', { ascending: false })
  res.status(200).json(data || [])
}
